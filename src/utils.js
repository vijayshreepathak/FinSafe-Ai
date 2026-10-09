export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || `${API_BASE_URL}/client`;

export const randomElementFromArray = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};
export const randomInteger = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const replaceVariable = (str, logData) => {
  let str2 = str;
  if (!str2) return "";
  str2 = str2.replace("{username}", logData.user);
  str2 = str2.replace("{source_ip}", logData.source);
  str2 = str2.replace("{device}", logData.device);
  str2 = str2.replace("{port}", randomInteger(1, 65535));
  str2 = str2.replace("{domain}", `example${randomInteger(1, 1000)}.com`);
  str2 = str2.replace("{filename}", `file${randomInteger(1, 1000)}.txt`);
  str2 = str2.replace("{reason}", `Reason${randomInteger(1, 10)}`);
  str2 = str2.replace(
    "{error_message}",
    `Error message: ${randomInteger(1, 100)}`
  );
  str2 = str2.replace("{app_name}", `App${randomInteger(1, 10)}`);
  str2 = str2.replace("{api_name}", `API${randomInteger(1, 5)}`);
  str2 = str2.replace(
    "{access_type}",
    randomElementFromArray(["Read", "Write", "Delete"])
  );
  str2 = str2.replace(
    "{file_path}",
    `/path/to/file${randomInteger(1, 1000)}.txt`
  );
  str2 = str2.replace("{software_name}", `Software${randomInteger(1, 10)}`);
  str2 = str2.replace("{version}", `v${randomInteger(1, 5)}`);

  return str2;
};

export const randomIP = () => {
  return `${randomInteger(1, 255)}.${randomInteger(1, 255)}.${randomInteger(
    1,
    255
  )}.${randomInteger(1, 255)}`;
};
export const addLogEntrytoDatabase = async (logData) => {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/addLog`, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ logData }),
    });
    const res = await response.json();
    if (res.message == "Success") alert("Log Added");
    else throw "Error";
  } catch (e) {
    alert("Something Went Wrong Here");
    console.log(e);
  }
};
export const addNumberofLogstoDatabase = async (number, campLocation) => {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/addLogs`, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({
        numberoflogs: number,
        campLocation: campLocation,
      }),
    });
    const res = await response.json();
    if (res.message == "Success") alert("Logs Added");
    else throw "Error";
  } catch (e) {
    alert("Something Went Wrong Here");
    console.log(e);
  }
};
export const addLogsToIPFSandBlockchain = async () => {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/triggerIPFSBlockChain`, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
    });
    const res = await response.json();
    if (res.message != "Success") throw "Error";
    if (!res.block) alert("No new logs to anchor - add some logs first.");
    else
      alert(
        `Anchored ${res.block.log_count} logs in block #${res.block.block_index}\n` +
          `Merkle root: ${res.block.merkle_root}\nBlock hash: ${res.block.hash}`
      );
  } catch (e) {
    alert("Could not reach the backend - is it running on " + API_BASE_URL + "?");
    console.log(e);
  }
};

export function generateRandomLog(campLocation) {
  const TransactionType = randomElementFromArray(["Deposit", "Withdrawal", "Transfer"]);
  const OldBalanceOrig = randomInteger(500, 10000);
  const TransactionAmount = randomInteger(1, Math.min(5000, OldBalanceOrig));
  let NewBalanceOrig =
    TransactionType === "Deposit"
      ? OldBalanceOrig + TransactionAmount
      : OldBalanceOrig - TransactionAmount;
  // ~25% of logs have a balance that doesn't reconcile (a typical fraud signal)
  if (Math.random() < 0.25) NewBalanceOrig = randomInteger(0, 10000);
  return {
    TransactionAmount,
    OldBalanceOrig,
    NewBalanceOrig,
    CurrencyType: randomElementFromArray(["USD", "EUR", "INR"]),
    TransactionType,
    TransactionStatus: randomElementFromArray(["Success", "Failed"]),
    PaymentMethod: randomElementFromArray(["Credit Card", "Debit Card", "PayPal"]),
    TransactionID: `TXN${Math.floor(Math.random() * 1000000)}`,
    UserID: `U${Math.floor(Math.random() * 1000)}`,
    Geolocation: randomElementFromArray(["New York", "London", "Delhi"]),
    IPAddress: randomIP(),
    LoginTimestamp: new Date().toISOString(),
    FailedLoginAttempts: randomElementFromArray([0, 0, 0, 1, 2, 5]),
    DeviceType: randomElementFromArray(["PC", "Mobile", "Tablet"]),
    MFAStatus: randomElementFromArray(["Enabled", "Disabled"]),
    APIAccess: randomElementFromArray(["Yes", "No"]),
    OS_BrowserInfo: randomElementFromArray(["Windows", "MacOS", "Linux"]),
    PrivilegedAccess: randomElementFromArray(["Admin", "User", "Guest"]),
    CampLocation: campLocation
  };
}

