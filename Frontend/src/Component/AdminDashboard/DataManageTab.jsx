import React, { useEffect, useMemo, useState } from "react";
import * as api from "../../Services/api";

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const splitCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((value) => value.trim());
};

const parseImportedReadings = (rawContent) => {
  const text = String(rawContent ?? "").trim();
  if (!text) return [];

  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = safeJsonParse(text);
    const candidateList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.readings) ? parsed.readings : Array.isArray(parsed?.data) ? parsed.data : [];
    return candidateList.map((item) => {
      const timestampSource = item?.timestamp ?? item?.time ?? item?.createdAt ?? item?.ts;
      const timestampValue = timestampSource ? new Date(timestampSource).getTime() : NaN;
      const timestamp = Number.isFinite(timestampValue) ? timestampValue : Date.now();
      const values = item?.values && typeof item.values === "object" ? item.values : item;
      return { timestamp, values };
    }).filter((item) => item && typeof item === "object");
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const timestampIndex = headerIndex.has("timestamp") ? headerIndex.get("timestamp") : -1;
    const timestampSource = timestampIndex >= 0 ? cells[timestampIndex] : null;
    const timestampValue = timestampSource ? new Date(timestampSource).getTime() : NaN;
    const timestamp = Number.isFinite(timestampValue) ? timestampValue : Date.now();
    const values = {};
    headers.forEach((header, index) => {
      if (header === "timestamp") return;
      const numericValue = Number(cells[index]);
      values[header] = Number.isFinite(numericValue) ? numericValue : null;
    });
    return { timestamp, values };
  });
};

const clampPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.floor(num);
  return intVal >= 1 ? intVal : fallback;
};

export default function DataManageTab() {
  const [setups, setSetups] = useState([]);
  const [selectedSetupKey, setSelectedSetupKey] = useState("");
  const [readings, setReadings] = useState([]);
  const [dashboardLimit, setDashboardLimit] = useState("10");
  const [importState, setImportState] = useState("idle");
  const [importMessage, setImportMessage] = useState("");
  const [activeFields, setActiveFields] = useState([]);

  useEffect(() => {
    const fetchSetups = async () => {
      try {
        const data = await api.getDataSetups();
        setSetups(data || []);
        if (data && data.length > 0) {
          setSelectedSetupKey(data[0].setupKey);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchSetups();
  }, []);

  useEffect(() => {
    if (!selectedSetupKey) return;
    const loadSetupData = async () => {
      try {
        const setupInfo = setups.find(s => s.setupKey === selectedSetupKey);
        setActiveFields(setupInfo?.fields || []);

        const storedReadings = await api.getDataReadings(selectedSetupKey, { limit: 500 });
        setReadings(Array.isArray(storedReadings) ? storedReadings : []);
      } catch (error) {
        console.error(error);
      }
    };
    loadSetupData();
  }, [selectedSetupKey, setups]);

  const latest = readings.length ? readings[0] : null; // since readings from backend are reverse sorted? Wait, let's reverse them for display.

  // The backend already sends recent readings reversed (newest first). Let's use as is for dashboardReadings.
  const dashboardReadings = useMemo(() => {
    const limit = clampPositiveInt(dashboardLimit, 10);
    return [...readings].slice(0, limit);
  }, [readings, dashboardLimit]);

  const dashboardStats = useMemo(() => {
    const count = readings.length;
    const fieldsCount = activeFields.length;
    const sourceCounts = readings.reduce((acc, reading) => {
      const source = String(reading?.source ?? "unknown");
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    return {
      count,
      fieldsCount,
      sourceCounts,
      lastSource: latest?.source ? String(latest.source) : "unknown",
    };
  }, [readings, activeFields.length, latest]);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedSetupKey) return;

    try {
      const content = await file.text();
      const imported = parseImportedReadings(content);
      if (!imported.length) {
        setImportState("error");
        setImportMessage("No valid readings found in this file.");
        return;
      }

      setImportState("checking");
      setImportMessage(`Importing ${imported.length} reading(s)...`);

      const normalizedFields = activeFields.length ? activeFields : Object.keys(imported[0]?.values || {});
      const nextReadings = [];

      for (const item of imported) {
        const importedValues = {};
        normalizedFields.forEach((fieldName) => {
          const numericValue = Number(item?.values?.[fieldName]);
          importedValues[fieldName] = Number.isFinite(numericValue) ? numericValue : null;
        });

        const reading = {
          timestamp: item.timestamp || Date.now(),
          values: importedValues,
          source: "imported",
          rawPayload: item,
        };

        try {
          const res = await api.createDataReading(selectedSetupKey, reading);
          nextReadings.push(res);
        } catch (error) {
          console.error(error);
        }
      }

      setReadings((current) => [...nextReadings.reverse(), ...current]);
      setImportState("success");
      setImportMessage(`Imported ${nextReadings.length} reading(s) into MongoDB.`);
    } catch (error) {
      console.error(error);
      setImportState("error");
      setImportMessage(`Import failed: ${error?.message || "Unknown error"}`);
    }
  };

  const handleClearReadings = async () => {
    if (!selectedSetupKey) return;
    const ok = window.confirm("Are you sure you want to clear all readings for this setup?");
    if (ok) {
      try {
        await api.deleteDataReadings(selectedSetupKey);
        setReadings([]);
        alert("Readings cleared.");
      } catch (error) {
        console.error(error);
        alert("Failed to clear readings.");
      }
    }
  };

  if (!setups.length) {
    return <div className="data-empty">No datasets configured. Please create a setup first.</div>;
  }

  return (
    <div className="data-grid data-manage">
      <section className="data-card">
        <h2>Manage Dataset Readings</h2>
        
        <div className="data-group" style={{ marginBottom: "20px" }}>
          <label>Select Dataset to Manage</label>
          <select 
            value={selectedSetupKey} 
            onChange={(e) => setSelectedSetupKey(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(10, 20, 40, 0.6)", color: "#fff", border: "1px solid rgba(0, 212, 255, 0.2)" }}
          >
            {setups.map(s => (
              <option key={s.setupKey} value={s.setupKey}>
                {s.name || s.setupKey} (Key: {s.setupKey})
              </option>
            ))}
          </select>
        </div>

        <p className="data-muted">View recent history, import readings, and manage the selected setup.</p>

        <div className="data-manage-actions">
          <button type="button" className="data-secondary-btn" onClick={handleClearReadings} disabled={!readings.length}>
            Clear All Readings
          </button>
        </div>

        <div className="data-group data-group-spaced">
          <label>Import Readings</label>
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={handleImportFile} disabled={!selectedSetupKey} />
          {importMessage ? (
            <p className="data-muted" data-import-state={importState} style={{ color: importState === 'error' ? '#ff6b6b' : '#7cffb2' }}>{importMessage}</p>
          ) : null}
        </div>

        <div className="data-group">
          <label>Recent Items to Show</label>
          <input type="number" min="1" max="500" value={dashboardLimit} onChange={(e) => setDashboardLimit(e.target.value)} placeholder="10" />
        </div>
      </section>

      <aside className="data-card data-preview">
        <h2>History Summary</h2>
        <div className="data-field-cards">
          <div className="data-field-card">
            <div className="data-field-name">Total readings</div>
            <div className="data-field-value">{dashboardStats.count}</div>
            <div className="data-field-meta">recent limit stored</div>
          </div>
          <div className="data-field-card">
            <div className="data-field-name">Configured fields</div>
            <div className="data-field-value">{dashboardStats.fieldsCount}</div>
            <div className="data-field-meta">active setup</div>
          </div>
          <div className="data-field-card">
            <div className="data-field-name">Last source</div>
            <div className="data-field-value">{dashboardStats.lastSource}</div>
            <div className="data-field-meta">device / mock / imported</div>
          </div>
        </div>

        <h3 className="data-history-title">Recent History</h3>
        <div className="data-history-table-wrap">
          <table className="data-history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                {activeFields.map((fieldName) => (
                  <th key={fieldName}>{fieldName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboardReadings.length === 0 ? (
                <tr>
                  <td colSpan={2 + activeFields.length}>No readings yet.</td>
                </tr>
              ) : (
                dashboardReadings.map((reading, index) => (
                  <tr key={`${reading.timestamp}-${index}`}>
                    <td>{new Date(reading.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`data-source-pill data-source-${String(reading.source || "unknown").toLowerCase()}`}>
                        {reading.source || "unknown"}
                      </span>
                    </td>
                    {activeFields.map((fieldName) => (
                      <td key={fieldName}>{reading.values?.[fieldName] ?? "—"}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}
