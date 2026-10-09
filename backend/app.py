"""FinSafe AI backend.

Endpoints used by the React client:
  POST /api/predict                     -> fraud risk for one transaction + login
  POST /api/add-logs                    -> score and store a batch of generated logs
  GET  /api/logs                        -> most recent stored logs
  GET  /api/ledger                      -> anchored blocks + chain verification
  POST /client/triggerIPFSBlockChain    -> anchor un-anchored logs into the ledger
  GET  /api/health

The "IPFS + blockchain" step is a local, tamper-evident ledger: every batch of
logs gets a SHA-256 Merkle root, and each block stores the previous block's hash.
It also runs automatically every ANCHOR_INTERVAL_SECONDS (default 1 hour).
"""
import hashlib
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request
from flask_cors import CORS

from model import RiskModels

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("FINSAFE_DB", os.path.join(BASE_DIR, "finsafe.db"))
ANCHOR_INTERVAL_SECONDS = int(os.environ.get("ANCHOR_INTERVAL_SECONDS", "3600"))
MAX_BATCH = 5000

app = Flask(__name__)
CORS(app)
models = RiskModels()
anchor_lock = threading.Lock()


# ------------------------------------------------------------------ database
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                source TEXT NOT NULL,
                payload TEXT NOT NULL,
                transaction_risk REAL NOT NULL,
                auth_risk REAL NOT NULL,
                block_index INTEGER
            );
            CREATE TABLE IF NOT EXISTS blocks (
                block_index INTEGER PRIMARY KEY,
                created_at TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                merkle_root TEXT NOT NULL,
                log_count INTEGER NOT NULL,
                hash TEXT NOT NULL
            );
            """
        )


def get_db():
    if "db" not in g:
        g.db = connect()
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def risk_label(pct):
    return "High" if pct >= 60 else "Medium" if pct >= 30 else "Low"


def store_logs(db, rows, source):
    scores = models.score(rows)
    ts = now_iso()
    db.executemany(
        "INSERT INTO logs (created_at, source, payload, transaction_risk, auth_risk) VALUES (?, ?, ?, ?, ?)",
        [(ts, source, json.dumps(r, sort_keys=True), t, a) for r, (t, a) in zip(rows, scores)],
    )
    db.commit()
    return scores


# -------------------------------------------------------------------- ledger
def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def merkle_root(leaves):
    level = leaves or [sha256("")]
    while len(level) > 1:
        if len(level) % 2:
            level = level + [level[-1]]
        level = [sha256(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
    return level[0]


def block_hash(index, created_at, prev_hash, root, count):
    return sha256(f"{index}|{created_at}|{prev_hash}|{root}|{count}")


def log_leaf(row):
    return sha256(f"{row['id']}|{row['created_at']}|{row['payload']}|{row['transaction_risk']}|{row['auth_risk']}")


def anchor_pending_logs():
    """Seal all un-anchored logs into a new block. Returns the block dict or None."""
    with anchor_lock, connect() as conn:
        pending = conn.execute("SELECT * FROM logs WHERE block_index IS NULL ORDER BY id").fetchall()
        if not pending:
            return None
        last = conn.execute("SELECT block_index, hash FROM blocks ORDER BY block_index DESC LIMIT 1").fetchone()
        index = last["block_index"] + 1 if last else 0
        prev = last["hash"] if last else "0" * 64
        created = now_iso()
        root = merkle_root([log_leaf(r) for r in pending])
        h = block_hash(index, created, prev, root, len(pending))
        conn.execute(
            "INSERT INTO blocks (block_index, created_at, prev_hash, merkle_root, log_count, hash) VALUES (?, ?, ?, ?, ?, ?)",
            (index, created, prev, root, len(pending), h),
        )
        conn.executemany("UPDATE logs SET block_index = ? WHERE id = ?", [(index, r["id"]) for r in pending])
        return {"block_index": index, "created_at": created, "prev_hash": prev,
                "merkle_root": root, "log_count": len(pending), "hash": h}


def verify_chain(conn):
    prev = "0" * 64
    for b in conn.execute("SELECT * FROM blocks ORDER BY block_index").fetchall():
        logs = conn.execute("SELECT * FROM logs WHERE block_index = ? ORDER BY id", (b["block_index"],)).fetchall()
        root = merkle_root([log_leaf(r) for r in logs])
        ok = (b["prev_hash"] == prev and root == b["merkle_root"] and len(logs) == b["log_count"]
              and block_hash(b["block_index"], b["created_at"], prev, root, b["log_count"]) == b["hash"])
        if not ok:
            return False, b["block_index"]
        prev = b["hash"]
    return True, None


def schedule_auto_anchor():
    def run():
        try:
            block = anchor_pending_logs()
            if block:
                print(f"[auto-anchor] block #{block['block_index']} sealed {block['log_count']} logs")
        finally:
            schedule_auto_anchor()

    t = threading.Timer(ANCHOR_INTERVAL_SECONDS, run)
    t.daemon = True
    t.start()


# -------------------------------------------------------------------- routes
def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return data


@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.post("/api/predict")
def predict():
    data = json_body()
    if data is None:
        return jsonify(error="Request body must be a JSON object"), 400
    t, a = store_logs(get_db(), [data], source="manual")[0]
    overall = round(max(t, a), 2)
    return jsonify(
        message="Success",
        transaction_fraud_risk=t,
        auth_fraud_risk=a,
        overall_risk=overall,
        risk_level=risk_label(overall),
    )


@app.post("/api/add-logs")
def add_logs():
    data = json_body()
    logs = data.get("logs") if data else None
    if not isinstance(logs, list) or not logs or not all(isinstance(r, dict) for r in logs):
        return jsonify(error="Body must be {\"logs\": [ {...}, ... ]} with at least one log"), 400
    if len(logs) > MAX_BATCH:
        return jsonify(error=f"At most {MAX_BATCH} logs per request"), 400
    scores = store_logs(get_db(), logs, source="generated")
    results = [
        {"TransactionID": r.get("TransactionID"), "transaction_fraud_risk": t, "auth_fraud_risk": a,
         "risk_level": risk_label(max(t, a))}
        for r, (t, a) in zip(logs, scores)
    ]
    return jsonify(
        message="Success",
        count=len(results),
        high_risk_count=sum(1 for r in results if r["risk_level"] == "High"),
        results=results,
    )


@app.get("/api/logs")
def list_logs():
    limit = min(request.args.get("limit", 50, type=int), 500)
    rows = get_db().execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return jsonify([{**dict(r), "payload": json.loads(r["payload"])} for r in rows])


@app.get("/api/ledger")
def ledger():
    db = get_db()
    blocks = [dict(b) for b in db.execute("SELECT * FROM blocks ORDER BY block_index DESC").fetchall()]
    pending = db.execute("SELECT COUNT(*) FROM logs WHERE block_index IS NULL").fetchone()[0]
    valid, broken_at = verify_chain(db)
    return jsonify(blocks=blocks, pending_logs=pending, chain_valid=valid, broken_at=broken_at)


@app.post("/client/triggerIPFSBlockChain")
def trigger_anchor():
    block = anchor_pending_logs()
    if block is None:
        return jsonify(message="Success", block=None, detail="No new logs to anchor")
    return jsonify(message="Success", block=block)


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    # Werkzeug's reloader would start the timer twice; keep it off.
    schedule_auto_anchor()
    app.run(host="127.0.0.1", port=port, debug=False)
