import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@nextui-org/react";
import { API_BASE_URL, generateRandomLog } from "../utils";
import * as data from "../data";

export default function CreateNlogs() {
  const [number, setNumber] = useState(1);
  const [campLocation, setCampLocation] = useState("");
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sending, setSending] = useState(false);
  const count = Math.min(Math.max(parseInt(number, 10) || 0, 0), 1000);

  // Function to generate N logs
  const generateLogs = () => {
    let newLogs = [];
    for (let i = 0; i < count; i++) {
      newLogs.push(generateRandomLog(campLocation));
    }
    setLogs(newLogs);
    setSummary(null);
  };

  // Function to send logs to backend
  const sendLogsToBackend = async () => {
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/add-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setSummary(data);
      alert(`✅ Successfully added ${data.count} logs (${data.high_risk_count} high risk)!`);
    } catch (error) {
      console.error("Error adding logs:", error);
      alert(`❌ Error adding logs: ${error.message}. Is the backend running on ${API_BASE_URL}?`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div  style={{
      backgroundImage: "linear-gradient(135deg, #1D112C, #B397D8)",
    }} className="max-w-[900px] mx-auto flex flex-col gap-8  p-6 rounded-lg shadow-lg">
      <div className="text-2xl uppercase underline text-center w-full">Add Random Logs</div>

      {/* Number of Logs */}
      <div className="flex gap-8 items-center justify-between">
        <span className="min-w-fit">Number of Logs: </span>
        <div className="max-w-[400px] w-full">
          <Input
            type="number"
            label="Enter number of logs (max 1000)"
            min="1"
            max="1000"
            value={String(number)}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Camp Location */}
      <div className="flex gap-8 items-center justify-between">
        <span className="min-w-fit">Geo Location: </span>
        <div className="max-w-[400px] w-full">
          <Select label="Select Camp Location" onChange={(e) => setCampLocation(e.target.value)}>
            {data.campLocation.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Generate & Add Logs */}
      <div className="flex justify-center pt-8 gap-4">
        <Button color="secondary" onClick={generateLogs}>
          Generate {count} Logs
        </Button>
        <Button color="secondary" onClick={sendLogsToBackend} isDisabled={logs.length === 0} isLoading={sending}>
          Add {logs.length} Logs to Database
        </Button>
      </div>

      {/* Risk scores returned by the backend */}
      {summary && (
        <div className="p-4 bg-white text-black rounded-lg shadow">
          <h3 className="text-lg font-bold mb-2">
            Risk Scores ({summary.high_risk_count} of {summary.count} high risk)
          </h3>
          <div className="max-h-64 overflow-auto text-sm">
            {summary.results.map((r, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                <span>{r.TransactionID}</span>
                <span>Txn {r.transaction_fraud_risk}% · Auth {r.auth_fraud_risk}%</span>
                <span className={r.risk_level === "High" ? "text-red-600 font-semibold" : r.risk_level === "Medium" ? "text-amber-600" : "text-green-700"}>
                  {r.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show Generated Logs */}
      {logs.length > 0 && (
        <div className="mt-6 p-4 bg-black rounded-lg shadow">
          <h3 className="text-lg font-bold">Generated Logs:</h3>
          <pre className="text-sm p-2 rounded max-h-96 overflow-auto">{JSON.stringify(logs, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
