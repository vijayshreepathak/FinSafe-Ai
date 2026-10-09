"""Fraud-risk models for FinSafe AI.

Two regressors predict a RiskLevel in [0, 1]:
  * transaction model - same features as "ML for transactions.ipynb"
  * auth model        - same features as "ml-for-fintech-auth.ipynb"

The original Kaggle datasets are not shipped with the repo, so `train()` builds a
synthetic dataset with the same columns, labelled with well-known fraud signals
(balance mismatch, amount draining the account, MFA off, odd login hours, ...).
Categoricals go through a OneHotEncoder inside the pipeline, so unseen values at
inference time are handled safely (the notebooks refit a LabelEncoder on each
single input row, which silently encodes every category as 0).
"""
import ipaddress
import os
from datetime import datetime

# Silences joblib's noisy physical-core probe on Windows.
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
TXN_MODEL_PATH = os.path.join(MODEL_DIR, "transaction_model.joblib")
AUTH_MODEL_PATH = os.path.join(MODEL_DIR, "auth_model.joblib")

CURRENCIES = ["USD", "EUR", "INR", "GBP", "JPY"]
TXN_TYPES = ["Deposit", "Withdrawal", "Transfer", "Purchase"]
TXN_STATUSES = ["Success", "Failed", "Pending", "Reversed"]
PAYMENT_METHODS = ["Credit Card", "Debit Card", "Wallet", "UPI", "Net Banking", "Crypto", "PayPal"]
DEVICES = ["PC", "Mobile", "Tablet", "ATM", "POS"]
OS_BROWSERS = ["Windows", "MacOS", "Linux", "iOS", "Android"]
MFA = ["Enabled", "Disabled"]
YES_NO = ["Yes", "No"]
PRIVILEGES = ["Admin", "User", "Guest"]

TXN_NUM = ["TransactionAmount", "OldBalanceOrig", "NewBalanceOrig", "BalanceError", "AmountToBalance"]
TXN_CAT = ["CurrencyType", "TransactionType", "TransactionStatus", "PaymentMethod"]
AUTH_NUM = ["FailedLoginAttempts", "LoginHour", "LoginWeekday", "IsPublicIP"]
AUTH_CAT = ["DeviceType", "OS_BrowserInfo", "MFAStatus", "APIAccess", "PrivilegedAccess"]


# ---------------------------------------------------------------- features
def _num(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _str(value, default="Unknown"):
    return str(value).strip() if value not in (None, "") else default


def _is_public_ip(value):
    try:
        ip = ipaddress.ip_address(str(value).strip())
        return 0 if (ip.is_private or ip.is_loopback) else 1
    except ValueError:
        return 1  # missing / malformed IP is treated as untrusted


def _parse_ts(value):
    try:
        return pd.to_datetime(value) if value else datetime.now()
    except (ValueError, TypeError):
        return datetime.now()


def transaction_features(rows):
    df = pd.DataFrame(
        {
            "TransactionAmount": [_num(r.get("TransactionAmount")) for r in rows],
            "OldBalanceOrig": [_num(r.get("OldBalanceOrig")) for r in rows],
            "NewBalanceOrig": [_num(r.get("NewBalanceOrig")) for r in rows],
            **{c: [_str(r.get(c)) for r in rows] for c in TXN_CAT},
        }
    )
    sign = np.where(df["TransactionType"] == "Deposit", 1.0, -1.0)
    expected_new = df["OldBalanceOrig"] + sign * df["TransactionAmount"]
    df["BalanceError"] = (expected_new - df["NewBalanceOrig"]).abs()
    df["AmountToBalance"] = df["TransactionAmount"] / (df["OldBalanceOrig"] + 1.0)
    return df[TXN_NUM + TXN_CAT]


def auth_features(rows):
    ts = [_parse_ts(r.get("LoginTimestamp")) for r in rows]
    df = pd.DataFrame(
        {
            "FailedLoginAttempts": [_num(r.get("FailedLoginAttempts")) for r in rows],
            "LoginHour": [t.hour for t in ts],
            "LoginWeekday": [t.weekday() for t in ts],
            "IsPublicIP": [_is_public_ip(r.get("IPAddress")) for r in rows],
            **{c: [_str(r.get(c)) for r in rows] for c in AUTH_CAT},
        }
    )
    return df[AUTH_NUM + AUTH_CAT]


# ------------------------------------------------------- synthetic training data
def _synthetic_transactions(n, rng):
    old = rng.gamma(2.0, 4000.0, n).round(2)
    amount = (rng.gamma(1.5, 1500.0, n) * rng.choice([1, 1, 1, 5], n)).round(2)
    ttype = rng.choice(TXN_TYPES, n, p=[0.25, 0.25, 0.3, 0.2])
    sign = np.where(ttype == "Deposit", 1.0, -1.0)
    new = old + sign * amount
    tampered = rng.random(n) < 0.15  # balance doesn't reconcile -> classic fraud signal
    new = np.where(tampered, new + rng.normal(0, 3000, n), new)
    new = np.clip(new, 0, None).round(2)
    rows = [
        {
            "TransactionAmount": amount[i],
            "OldBalanceOrig": old[i],
            "NewBalanceOrig": new[i],
            "CurrencyType": rng.choice(CURRENCIES),
            "TransactionType": ttype[i],
            "TransactionStatus": rng.choice(TXN_STATUSES, p=[0.7, 0.12, 0.1, 0.08]),
            "PaymentMethod": rng.choice(PAYMENT_METHODS),
        }
        for i in range(n)
    ]
    X = transaction_features(rows)
    risk = (
        0.05
        + 0.35 * np.clip(X["BalanceError"] / 2000.0, 0, 1)
        + 0.25 * np.clip(X["AmountToBalance"] - 0.5, 0, 1)
        + 0.10 * np.clip(X["TransactionAmount"] / 20000.0, 0, 1)
        + 0.10 * X["TransactionStatus"].isin(["Failed", "Reversed"])
        + 0.12 * (X["PaymentMethod"] == "Crypto")
        + 0.05 * (X["TransactionType"] == "Transfer")
        + rng.normal(0, 0.03, n)
    )
    return X, np.clip(risk, 0, 1)


def _synthetic_auth(n, rng):
    rows = [
        {
            "FailedLoginAttempts": int(rng.choice([0, 0, 0, 1, 2, 3, 5, 8])),
            "LoginTimestamp": datetime(2025, 1, 1 + int(rng.integers(0, 28)), int(rng.integers(0, 24)), int(rng.integers(0, 60))),
            "IPAddress": rng.choice(["192.168.1.10", "10.0.0.5", "172.16.0.9"]) if rng.random() < 0.6 else f"{rng.integers(11, 223)}.{rng.integers(0, 255)}.{rng.integers(0, 255)}.{rng.integers(1, 255)}",
            "DeviceType": rng.choice(DEVICES, p=[0.35, 0.35, 0.15, 0.08, 0.07]),
            "OS_BrowserInfo": rng.choice(OS_BROWSERS),
            "MFAStatus": rng.choice(MFA, p=[0.7, 0.3]),
            "APIAccess": rng.choice(YES_NO, p=[0.3, 0.7]),
            "PrivilegedAccess": rng.choice(PRIVILEGES, p=[0.15, 0.7, 0.15]),
        }
        for _ in range(n)
    ]
    X = auth_features(rows)
    night = X["LoginHour"].between(0, 5)
    admin = X["PrivilegedAccess"] == "Admin"
    no_mfa = X["MFAStatus"] == "Disabled"
    risk = (
        0.05
        + 0.30 * np.clip(X["FailedLoginAttempts"] / 6.0, 0, 1)
        + 0.18 * no_mfa
        + 0.12 * night
        + 0.10 * X["IsPublicIP"]
        + 0.08 * (X["APIAccess"] == "Yes")
        + 0.07 * admin
        + 0.10 * (admin & no_mfa)
        + 0.05 * X["DeviceType"].isin(["ATM", "POS"])
        + 0.04 * (X["PrivilegedAccess"] == "Guest")
        + rng.normal(0, 0.03, n)
    )
    return X, np.clip(risk, 0, 1)


# ------------------------------------------------------------------ training
def _stacking_pipeline(num_cols, cat_cols):
    # Mirrors the notebooks' stacking design (linear + RF + boosted trees -> GBR),
    # using sklearn-only estimators so there is no xgboost/lightgbm install risk.
    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols)],
        remainder="passthrough",
    )
    stack = StackingRegressor(
        estimators=[
            ("linear", Ridge(alpha=1.0)),
            ("random_forest", RandomForestRegressor(n_estimators=80, max_depth=10, min_samples_leaf=5, random_state=42)),
            ("hist_gb", HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, random_state=42)),
        ],
        final_estimator=GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42),
    )
    return Pipeline([("pre", pre), ("model", stack)])


def train(n=6000, seed=42, verbose=True):
    os.makedirs(MODEL_DIR, exist_ok=True)
    rng = np.random.default_rng(seed)
    for name, make, num, cat, path in [
        ("transaction", _synthetic_transactions, TXN_NUM, TXN_CAT, TXN_MODEL_PATH),
        ("auth", _synthetic_auth, AUTH_NUM, AUTH_CAT, AUTH_MODEL_PATH),
    ]:
        X, y = make(n, rng)
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed)
        pipe = _stacking_pipeline(num, cat).fit(X_tr, y_tr)
        if verbose:
            print(f"[{name}] R2 on held-out set: {r2_score(y_te, pipe.predict(X_te)):.4f}")
        joblib.dump(pipe, path)


class RiskModels:
    def __init__(self):
        try:
            self.txn = joblib.load(TXN_MODEL_PATH)
            self.auth = joblib.load(AUTH_MODEL_PATH)
        except Exception as exc:  # missing files or pickles from another sklearn version
            print(f"Could not load saved models ({exc.__class__.__name__}) - training them now (~20s)...")
            train()
            self.txn = joblib.load(TXN_MODEL_PATH)
            self.auth = joblib.load(AUTH_MODEL_PATH)

    def score(self, rows):
        """Return [(transaction_risk_pct, auth_risk_pct), ...] for a list of dicts."""
        if not rows:
            return []
        t = np.clip(self.txn.predict(transaction_features(rows)), 0, 1) * 100
        a = np.clip(self.auth.predict(auth_features(rows)), 0, 1) * 100
        return [(round(float(x), 2), round(float(y), 2)) for x, y in zip(t, a)]


if __name__ == "__main__":
    train()
