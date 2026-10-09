// import React from "react";
// import { Button, Input, Tooltip, Select, SelectItem } from "@nextui-org/react";
// import { DicesIcon } from "lucide-react";
// import { useState } from "react";
// import {
//   randomElementFromArray,
//   randomIP,
//   replaceVariable,
//   addLogEntrytoDatabase,
// } from "../utils";
// import * as data from "../data";

// export default function Inputs() {
//   const [logData, setlogData] = useState({
//     timestamp: "",
//     source: "",
//     destination: "",
//     user: "",
//     device: "",
//     eventType: "",
//     eventDescription: "",
//     eventSeverity: "",
//     campLocation: "",
//   });

//   return (
//     <div className="max-w-[800px] mx-auto">
//       <div className="flex justify-center text-2xl mb-8 underline uppercase">
//         Demo Application to Add Fake Logs
//       </div>
//       <div className="flex flex-col gap-8 max-w-[800px] mx-auto">
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">TimeStamp : </span>
//           <div className="max-w-[400px] w-full">
//             <Input
//               className=""
//               type="datetime-local"
//               value={logData.timestamp}
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return { ...prev, timestamp: e.target.value };
//                 })
//               }
//             />
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Source IP : </span>
//           <div className="flex items-center gap-2 max-w-[400px] w-full">
//             <Input
//               className=""
//               type="text"
//               readOnly
//               value={logData.source}
//               label="Source IP Address"
//             />
//             <Tooltip
//               className="min-w-fit w-fit"
//               content={<div>Random Safe IP</div>}
//             >
//               <Button
//                 className="max-w-fit"
//                 color="success"
//                 onClick={() => {
//                   setlogData((prev) => {
//                     return {
//                       ...prev,
//                       source: randomElementFromArray(data.safe_ips),
//                     };
//                   });
//                 }}
//               >
//                 <DicesIcon />
//               </Button>
//             </Tooltip>
//             <Tooltip
//               className="min-w-fit w-fit"
//               content={<div>Random Unsafe IP</div>}
//             >
//               <Button
//                 className="max-w-fit"
//                 color="danger"
//                 onClick={() => {
//                   setlogData((prev) => {
//                     return {
//                       ...prev,
//                       source: randomIP(),
//                     };
//                   });
//                 }}
//               >
//                 <DicesIcon />
//               </Button>
//             </Tooltip>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Destination IP : </span>
//           <div className="flex items-center gap-2 max-w-[400px] w-full">
//             <Input
//               className=""
//               type="text"
//               readOnly
//               value={logData.destination}
//               label="Destination IP Address"
//             />
//             <Tooltip
//               className="min-w-fit w-fit"
//               content={<div>Random Safe IP</div>}
//             >
//               <Button
//                 className="max-w-fit"
//                 color="success"
//                 onClick={() => {
//                   setlogData((prev) => {
//                     return {
//                       ...prev,
//                       destination: randomElementFromArray(
//                         data.safe_destination_ips
//                       ),
//                     };
//                   });
//                 }}
//               >
//                 <DicesIcon />
//               </Button>
//             </Tooltip>
//             <Tooltip
//               className="min-w-fit w-fit"
//               content={<div>Random Unsafe IP</div>}
//             >
//               <Button
//                 className="max-w-fit"
//                 color="danger"
//                 onClick={() => {
//                   setlogData((prev) => {
//                     return {
//                       ...prev,
//                       destination: randomIP(),
//                     };
//                   });
//                 }}
//               >
//                 <DicesIcon />
//               </Button>
//             </Tooltip>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">User : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Select
//               label="Select a User"
//               className="w-full"
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return { ...prev, user: e.target.value };
//                 })
//               }
//             >
//               {data.users.map((user) => (
//                 <SelectItem key={user} value={user}>
//                   {user}
//                 </SelectItem>
//               ))}
//             </Select>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Device : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Select
//               label="Select a Device"
//               className="w-full"
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return { ...prev, device: e.target.value };
//                 })
//               }
//             >
//               {data.device.map((device) => (
//                 <SelectItem key={device} value={device}>
//                   {device}
//                 </SelectItem>
//               ))}
//             </Select>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Event Type : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Select
//               label="Select an Event Type"
//               className="w-full"
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return {
//                     ...prev,
//                     eventType: e.target.value,
//                     eventDescription: replaceVariable(
//                       data.event_description_templates[e.target.value],
//                       logData
//                     ),
//                   };
//                 })
//               }
//             >
//               {data.event_types.map((event_type) => (
//                 <SelectItem key={event_type} value={event_type}>
//                   {event_type}
//                 </SelectItem>
//               ))}
//             </Select>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Event Description : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Input
//               className=""
//               type="text"
//               readOnly
//               label="Event Description"
//               value={logData.eventDescription}
//             />
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Event Severity : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Select
//               label="Select event severity"
//               className="w-full"
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return { ...prev, eventSeverity: e.target.value };
//                 })
//               }
//             >
//               {data.event_severity.map((severity) => (
//                 <SelectItem key={severity} value={severity}>
//                   {severity}
//                 </SelectItem>
//               ))}
//             </Select>
//           </div>
//         </div>
//         <div className="flex gap-8 items-center justify-between">
//           <span className="min-w-fit">Camp Location : </span>
//           <div className="flex max-w-[400px] w-full">
//             <Select
//               label="Select Camp Location"
//               className="w-full"
//               onChange={(e) =>
//                 setlogData((prev) => {
//                   return { ...prev, campLocation: e.target.value };
//                 })
//               }
//             >
//               {data.campLocation.map((location) => (
//                 <SelectItem key={location} value={location}>
//                   {location}
//                 </SelectItem>
//               ))}
//             </Select>
//           </div>
//         </div>
//       </div>
//       <div className="flex justify-center pt-8">
//         <Button color="primary" onClick={() => addLogEntrytoDatabase(logData)}>
//           Add Log Entry
//         </Button>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@nextui-org/react";
import { API_BASE_URL } from "../utils";

const riskColor = (pct) =>
  pct >= 60 ? "text-red-600" : pct >= 30 ? "text-amber-600" : "text-green-700";

export default function Inputs() {
  const [formData, setFormData] = useState({
    TransactionAmount: "",
    OldBalanceOrig: "",
    NewBalanceOrig: "",
    CurrencyType: "",
    TransactionType: "",
    TransactionStatus: "",
    PaymentMethod: "",
    TransactionID: "",
    UserID: "",
    Geolocation: "",
    IPAddress: "",
    LoginTimestamp: "",
    FailedLoginAttempts: "",
    DeviceType: "",
    MFAStatus: "",
    APIAccess: "",
    OS_BrowserInfo: "",
    PrivilegedAccess: ""
  });

  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Bind each field by name explicitly (NextUI Select's synthetic event doesn't always carry `name`)
  const bind = (name) => ({
    name,
    onChange: (e) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  });

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults(null);
      setError(`Prediction failed: ${err.message}. Is the backend running on ${API_BASE_URL}?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundImage: "linear-gradient(135deg, #1D112C, #B397D8)",
    }} className="max-w-[900px] mx-auto p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-center mb-6">Enter Transaction & Auth Data</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Transaction Inputs */}
        <h3 className="text-lg font-semibold">Transaction Details</h3>
        <Input {...bind("TransactionAmount")} type="number" min="0" label="Transaction Amount" isRequired />
        <Input {...bind("OldBalanceOrig")} type="number" min="0" label="Old Balance (Origin)" isRequired />
        <Input {...bind("NewBalanceOrig")} type="number" min="0" label="New Balance (Origin)" isRequired />

        <Select {...bind("CurrencyType")} label="Currency Type">
          <SelectItem key="USD">USD</SelectItem>
          <SelectItem key="EUR">EUR</SelectItem>
          <SelectItem key="INR">INR</SelectItem>
          <SelectItem key="GBP">GBP</SelectItem>
          <SelectItem key="JPY">JPY</SelectItem>
        </Select>

        <Select {...bind("TransactionType")} label="Transaction Type">
          <SelectItem key="Deposit">Deposit</SelectItem>
          <SelectItem key="Withdrawal">Withdrawal</SelectItem>
          <SelectItem key="Transfer">Transfer</SelectItem>
          <SelectItem key="Purchase">Purchase</SelectItem>
        </Select>

        <Select {...bind("TransactionStatus")} label="Transaction Status">
          <SelectItem key="Success">Success</SelectItem>
          <SelectItem key="Failed">Failed</SelectItem>
          <SelectItem key="Pending">Pending</SelectItem>
          <SelectItem key="Reversed">Reversed</SelectItem>
        </Select>

        <Select {...bind("PaymentMethod")} label="Payment Method">
          <SelectItem key="Credit Card">Credit Card</SelectItem>
          <SelectItem key="Debit Card">Debit Card</SelectItem>
          <SelectItem key="Wallet">Wallet</SelectItem>
          <SelectItem key="UPI">UPI</SelectItem>
          <SelectItem key="Net Banking">Net Banking</SelectItem>
          <SelectItem key="Crypto">Crypto</SelectItem>
        </Select>

        <Input {...bind("TransactionID")} label="Transaction ID" />
        <Input {...bind("UserID")} label="User ID" />

        {/* Authentication Inputs */}
        <h3 className="text-lg font-semibold">Authentication Details</h3>
        <Input {...bind("Geolocation")} label="Geolocation" />
        <Input {...bind("IPAddress")} label="IP Address" placeholder="e.g. 192.168.1.10" />
        <Input {...bind("LoginTimestamp")} type="datetime-local" label="Login Timestamp" placeholder=" " />
        <Input {...bind("FailedLoginAttempts")} type="number" min="0" label="Failed Login Attempts" />

        <Select {...bind("DeviceType")} label="Device Type">
          <SelectItem key="PC">PC</SelectItem>
          <SelectItem key="Mobile">Mobile</SelectItem>
          <SelectItem key="Tablet">Tablet</SelectItem>
          <SelectItem key="ATM">ATM</SelectItem>
          <SelectItem key="POS">POS</SelectItem>
        </Select>

        <Select {...bind("MFAStatus")} label="MFA Status">
          <SelectItem key="Enabled">Enabled</SelectItem>
          <SelectItem key="Disabled">Disabled</SelectItem>
        </Select>

        <Select {...bind("APIAccess")} label="API Access (Y/N)">
          <SelectItem key="Yes">Yes</SelectItem>
          <SelectItem key="No">No</SelectItem>
        </Select>

        <Select {...bind("OS_BrowserInfo")} label="OS Browser Info">
          <SelectItem key="Windows">Windows-Chrome</SelectItem>
          <SelectItem key="MacOS">MacOS-Safari</SelectItem>
          <SelectItem key="Linux">Linux-Firefox</SelectItem>
          <SelectItem key="iOS">iOS-App</SelectItem>
          <SelectItem key="Android">Android-App</SelectItem>
        </Select>

        <Select {...bind("PrivilegedAccess")} label="Privileged Access">
          <SelectItem key="Admin">Admin</SelectItem>
          <SelectItem key="User">User</SelectItem>
          <SelectItem key="Guest">Guest</SelectItem>
        </Select>

        <div className="flex justify-center">
          <Button type="submit" color="secondary" isLoading={loading}>Submit</Button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-lg shadow">{error}</div>
      )}

      {results && (
        <div className="mt-6 p-4 bg-white text-black rounded-lg shadow space-y-1">
          <h3 className="text-lg font-bold">Predictions:</h3>
          <p>🔹 <strong>Transaction Fraud Risk:</strong>{" "}
            <span className={riskColor(results.transaction_fraud_risk)}>{results.transaction_fraud_risk}%</span></p>
          <p>🔹 <strong>Auth Fraud Risk:</strong>{" "}
            <span className={riskColor(results.auth_fraud_risk)}>{results.auth_fraud_risk}%</span></p>
          <p>🔹 <strong>Overall:</strong>{" "}
            <span className={`font-semibold ${riskColor(results.overall_risk)}`}>{results.risk_level} risk</span></p>
        </div>
      )}
    </div>
  );
}
