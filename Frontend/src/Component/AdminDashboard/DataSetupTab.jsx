import React, { useEffect, useMemo, useState } from "react";
import * as api from "../../Services/api";

const createDefaultFields = () => Array.from({ length: 8 }, () => "");

const normalizeFieldNames = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields.map((value) => String(value ?? "").trim()).filter(Boolean);
};

const clampPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.floor(num);
  return intVal >= 1 ? intVal : fallback;
};

export default function DataSetupTab() {
  const [setups, setSetups] = useState([]);
  const [selectedSetupKey, setSelectedSetupKey] = useState("new");
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [deviceApiUrl, setDeviceApiUrl] = useState("");
  const [deviceApiKey, setDeviceApiKey] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [samplePeriodSec, setSamplePeriodSec] = useState("10");
  const [fields, setFields] = useState(createDefaultFields());
  const [syncState, setSyncState] = useState("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [apiCheckState, setApiCheckState] = useState("idle");
  const [apiCheckMessage, setApiCheckMessage] = useState("");

  const fetchSetups = async () => {
    try {
      const data = await api.getDataSetups();
      setSetups(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSetups();
  }, []);

  useEffect(() => {
    if (selectedSetupKey === "new") {
      resetForm();
    } else {
      const selected = setups.find(s => s.setupKey === selectedSetupKey);
      if (selected) {
        applySetupRecord(selected);
      }
    }
    setSyncMessage("");
    setSyncState("idle");
  }, [selectedSetupKey, setups]);

  const applySetupRecord = (record) => {
    setName(record.name || "");
    setDescription(record.description || "");
    setGithubLink(record.githubLink || "");
    setDeviceApiUrl(record.deviceApiUrl || "");
    setDeviceApiKey(record.deviceApiKey || "");
    setLatitude(record.location?.latitude ?? "");
    setLongitude(record.location?.longitude ?? "");
    setSamplePeriodSec(String(record.samplePeriodSec || "10"));
    
    const recordFields = Array.isArray(record.fields) ? [...record.fields] : [];
    while (recordFields.length < 8) recordFields.push("");
    setFields(recordFields.slice(0, 8));
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setGithubLink("");
    setDeviceApiUrl("");
    setDeviceApiKey("");
    setLatitude("");
    setLongitude("");
    setSamplePeriodSec("10");
    setFields(createDefaultFields());
  };

  const updateField = (index, value) => {
    setFields((current) => current.map((v, i) => (i === index ? value : v)));
  };

  const config = useMemo(() => {
    return {
      name: name.trim(),
      description: description.trim(),
      githubLink: githubLink.trim(),
      deviceApiUrl: deviceApiUrl.trim(),
      deviceApiKey: deviceApiKey.trim(),
      location: {
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
      },
      samplePeriodSec: clampPositiveInt(samplePeriodSec, 10),
      fields: normalizeFieldNames(fields),
    };
  }, [name, description, githubLink, deviceApiUrl, deviceApiKey, latitude, longitude, samplePeriodSec, fields]);

  const validateConfig = () => {
    const errors = [];
    if (!name.trim()) errors.push("Name is required.");
    const activeFieldsList = normalizeFieldNames(fields);
    if (activeFieldsList.length === 0) errors.push("At least one field name is required.");
    const duplicateFields = activeFieldsList.filter((item, index) => activeFieldsList.indexOf(item) !== index);
    if (duplicateFields.length > 0) errors.push(`Duplicate field names: ${duplicateFields.join(", ")}`);
    
    if (latitude !== "") {
      const lat = Number(latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("Latitude must be between -90 and 90.");
    }
    if (longitude !== "") {
      const lng = Number(longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push("Longitude must be between -180 and 180.");
    }
    const periodSec = clampPositiveInt(samplePeriodSec, 10);
    if (periodSec < 1) errors.push("Sample period must be at least 1 second.");
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateConfig();
    if (validationErrors.length > 0) {
      setSyncState("error");
      setSyncMessage(validationErrors.join(" "));
      return;
    }
    try {
      if (selectedSetupKey === "new") {
        await api.createDataSetup(config);
        setSyncState("success");
        setSyncMessage("New setup created successfully.");
      } else {
        await api.updateDataSetup(selectedSetupKey, config);
        setSyncState("success");
        setSyncMessage("Setup updated successfully.");
      }
      await fetchSetups();
    } catch (error) {
      console.error(error);
      setSyncState("error");
      setSyncMessage(`Could not save: ${error?.message || "Unknown error"}`);
    }
  };

  const handleDelete = async () => {
    if (selectedSetupKey === "new") return;
    const ok = window.confirm("Are you sure you want to delete this setup and all its readings?");
    if (!ok) return;
    try {
      await api.deleteDataSetup(selectedSetupKey);
      setSyncState("success");
      setSyncMessage("Setup deleted.");
      setSelectedSetupKey("new");
      await fetchSetups();
    } catch (error) {
      console.error(error);
      setSyncState("error");
      setSyncMessage(`Could not delete: ${error?.message || "Unknown error"}`);
    }
  };

  const testDeviceApiConnection = async () => {
    const targetUrl = deviceApiUrl.trim();
    if (!targetUrl) {
      setApiCheckState("error");
      setApiCheckMessage("Please enter a Device API URL first.");
      return;
    }
    try {
      new URL(targetUrl);
    } catch {
      setApiCheckState("error");
      setApiCheckMessage("Device API URL is not a valid URL.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    setApiCheckState("checking");
    setApiCheckMessage("Testing connection...");

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let payload = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }

      const previewText = payload && typeof payload === "object"
        ? Object.keys(payload).slice(0, 4).join(", ") || "JSON object"
        : "text response";

      setApiCheckState("success");
      setApiCheckMessage(`Connection OK. Response looks like: ${previewText}.`);
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      setApiCheckState("error");
      setApiCheckMessage(isAbort ? "Connection timed out after 8 seconds." : `Connection failed: ${error?.message || "Unknown error"}`);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="data-grid">
      <section className="data-card">
        <h2>Data Setup</h2>
        <div className="data-group" style={{ marginBottom: "20px" }}>
          <label>Select Setup to Edit</label>
          <select 
            value={selectedSetupKey} 
            onChange={(e) => setSelectedSetupKey(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(10, 20, 40, 0.6)", color: "#fff", border: "1px solid rgba(0, 212, 255, 0.2)" }}
          >
            <option value="new">-- Create New Setup --</option>
            {setups.map(s => (
              <option key={s.setupKey} value={s.setupKey}>
                {s.name || s.setupKey} (Key: {s.setupKey})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="data-form">
          <div className="data-row">
            <div className="data-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weather Station" />
            </div>
            <div className="data-group">
              <label>GitHub Link</label>
              <input value={githubLink} onChange={(e) => setGithubLink(e.target.value)} placeholder="https://github.com/..." />
            </div>
          </div>

          <div className="data-group">
            <label>Device API URL</label>
            <input value={deviceApiUrl} onChange={(e) => setDeviceApiUrl(e.target.value)} placeholder="http://192.168.1.50/api/data" />
          </div>

          <div className="data-group">
            <label>Device API Key (Optional)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                value={deviceApiKey} 
                onChange={(e) => setDeviceApiKey(e.target.value)} 
                placeholder="Leave blank to disable, or enter a secret key" 
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="data-secondary-btn" 
                onClick={() => setDeviceApiKey(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))}
              >
                Generate
              </button>
            </div>
            {deviceApiKey && (
              <p className="data-muted" style={{ marginTop: "5px", fontSize: "13px" }}>
                MCU Header snippet: <code>x-device-api-key: {deviceApiKey}</code>
              </p>
            )}
          </div>

          <div className="data-actions">
            <button type="button" className="data-secondary-btn" onClick={testDeviceApiConnection} disabled={!deviceApiUrl.trim() || apiCheckState === "checking"}>
              {apiCheckState === "checking" ? "Testing..." : "Test Connection"}
            </button>
            {apiCheckMessage ? (
              <span className="data-saved" role="status" aria-live="polite" data-status={apiCheckState}>{apiCheckMessage}</span>
            ) : null}
          </div>

          <div className="data-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." />
          </div>

          <div className="data-row">
            <div className="data-group">
              <label>Latitude</label>
              <input type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="10.762622" />
            </div>
            <div className="data-group">
              <label>Longitude</label>
              <input type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="106.660172" />
            </div>
          </div>

          <div className="data-group">
            <label>Sample Period (Seconds)</label>
            <input type="number" min="1" value={samplePeriodSec} onChange={(e) => setSamplePeriodSec(e.target.value)} placeholder="10" />
          </div>

          <div className="data-group">
            <label>8 Field Names</label>
            <div className="data-fields-grid">
              {fields.map((value, idx) => (
                <input key={idx} value={value} onChange={(e) => updateField(idx, e.target.value)} placeholder={`Field ${idx + 1}`} />
              ))}
            </div>
          </div>

          {syncMessage ? (
            <p className="data-muted" data-sync-state={syncState} style={{ color: syncState === 'error' ? '#ff6b6b' : '#7cffb2' }}>
              {syncMessage}
            </p>
          ) : null}

          <div className="data-actions">
            <button type="submit" className="data-primary-btn">
              {selectedSetupKey === "new" ? "Create Setup" : "Update Setup"}
            </button>
            {selectedSetupKey !== "new" && (
              <button type="button" className="data-secondary-btn" onClick={handleDelete}>
                Delete Setup
              </button>
            )}
          </div>
        </form>
      </section>

      <aside className="data-card data-preview">
        <h2>Preview JSON</h2>
        <pre className="data-json">
          {JSON.stringify({ ...config, fields: normalizeFieldNames(fields) }, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
