import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./index.scss";

const STORAGE_KEY = "demoWeatherDataConfig:v1";

const createDefaultFields = () => Array.from({ length: 8 }, () => "");

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

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

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const csvEscape = (value) => {
  const str = String(value ?? "");
  if (str.includes("\n") || str.includes('"') || str.includes(",")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatLocalDateTimeInput = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

function FieldLineChart({ labels, series }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderWidth: 3,
            pointRadius: 2,
            pointHoverRadius: 3,
            tension: 0.28,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: {
            top: 6,
            right: 10,
            bottom: 14,
            left: 10,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              padding: 10,
            },
          },
          y: {
            grid: { drawBorder: false },
            ticks: { maxTicksLimit: 5, padding: 6 },
          },
        },
      },
    });

    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent-primary").trim();
    const border = styles.getPropertyValue("--border-color").trim();
    const textMuted = styles.getPropertyValue("--text-muted").trim();
    const textSecondary = styles.getPropertyValue("--text-secondary").trim();

    chart.data.labels = labels;
    chart.data.datasets[0].data = series;
    chart.data.datasets[0].borderColor = accent || "#a67c52";
    chart.data.datasets[0].backgroundColor = "transparent";

    chart.options.scales.x.ticks.color = textMuted || "#999";
    chart.options.scales.y.ticks.color = textMuted || "#999";
    chart.options.scales.y.grid.color = border || "#e0e0e0";
    chart.options.scales.x.grid.color = border || "#e0e0e0";
    chart.options.scales.x.border = { color: border || "#e0e0e0" };
    chart.options.scales.y.border = { color: border || "#e0e0e0" };
    chart.options.plugins.tooltip.bodyColor = textSecondary || "#6b6b6b";

    chart.update("none");
  }, [labels, series]);

  return <canvas ref={canvasRef} />;
}

function DataPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [samplePeriodSec, setSamplePeriodSec] = useState("2");
  const [fields, setFields] = useState(createDefaultFields);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef(null);
  const lastValuesRef = useRef({});
  const [readings, setReadings] = useState([]);

  const [exportRange, setExportRange] = useState("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const updateField = (index, value) => {
    setFields((current) => current.map((v, i) => (i === index ? value : v)));
  };

  const activeFields = useMemo(() => normalizeFieldNames(fields), [fields]);

  const config = useMemo(() => {
    return {
      name: name.trim(),
      description: description.trim(),
      githubLink: githubLink.trim(),
      location: {
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
      },
      samplePeriodSec: clampPositiveInt(samplePeriodSec, 10),
      fields: [...fields],
    };
  }, [
    name,
    description,
    githubLink,
    latitude,
    longitude,
    samplePeriodSec,
    fields,
  ]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeJsonParse(raw);
    if (!parsed) return;

    setName(String(parsed.name ?? ""));
    setDescription(String(parsed.description ?? ""));
    setGithubLink(String(parsed.githubLink ?? ""));
    setLatitude(
      parsed.location?.latitude === null ||
        parsed.location?.latitude === undefined
        ? ""
        : String(parsed.location.latitude),
    );
    setLongitude(
      parsed.location?.longitude === null ||
        parsed.location?.longitude === undefined
        ? ""
        : String(parsed.location.longitude),
    );
    setSamplePeriodSec(
      parsed.samplePeriodSec === null || parsed.samplePeriodSec === undefined
        ? "2"
        : String(parsed.samplePeriodSec),
    );
    if (Array.isArray(parsed.fields)) {
      const padded = [...parsed.fields].slice(0, 8);
      while (padded.length < 8) padded.push("");
      setFields(padded);
    }
    setSubmitted(true);
  }, []);

  useEffect(() => {
    if (!submitted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error(err);
    }
  }, [config, submitted]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsLive(false);
    setReadings([]);
    lastValuesRef.current = {};
    setActiveTab("live");
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setGithubLink("");
    setLatitude("");
    setLongitude("");
    setSamplePeriodSec("2");
    setFields(createDefaultFields());
    setSubmitted(false);
    setActiveTab("setup");
    setReadings([]);
    lastValuesRef.current = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error(err);
    }
  };

  const startLive = () => {
    if (!submitted) {
      alert("Please save your setup first.");
      setActiveTab("setup");
      return;
    }
    if (activeFields.length === 0) {
      alert("Please enter at least 1 field name.");
      setActiveTab("setup");
      return;
    }

    const periodSec = clampPositiveInt(samplePeriodSec, 10);
    const periodMs = periodSec * 1000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsLive(true);

    const tick = () => {
      const timestamp = Date.now();
      const nextValues = {};
      const lastValues = lastValuesRef.current;

      activeFields.forEach((fieldName) => {
        const prev = Number.isFinite(lastValues[fieldName])
          ? lastValues[fieldName]
          : 20 + Math.random() * 10;
        const delta = (Math.random() - 0.5) * 1.2;
        const next = Math.round((prev + delta) * 100) / 100;
        nextValues[fieldName] = next;
      });

      lastValuesRef.current = { ...lastValues, ...nextValues };

      setReadings((current) => {
        const appended = [...current, { timestamp, values: nextValues }];
        const MAX = 5000;
        if (appended.length <= MAX) return appended;
        return appended.slice(appended.length - MAX);
      });
    };

    tick();
    intervalRef.current = setInterval(tick, periodMs);
  };

  const stopLive = () => {
    setIsLive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const latest = readings.length ? readings[readings.length - 1] : null;

  const chartReadings = useMemo(() => {
    const { start, end } = computeExportRange();
    const startMs = start ? start.getTime() : Number.NEGATIVE_INFINITY;
    const endMs = end ? end.getTime() : Number.POSITIVE_INFINITY;

    const filtered = readings.filter(
      (r) => r.timestamp >= startMs && r.timestamp <= endMs,
    );

    const MAX_POINTS = 500;
    if (filtered.length <= MAX_POINTS) return filtered;

    const step = Math.ceil(filtered.length / MAX_POINTS);
    return filtered.filter((_, idx) => idx % step === 0);
  }, [readings, exportRange, customFrom, customTo]);

  const chartLabels = useMemo(() => {
    return chartReadings.map((r) =>
      new Date(r.timestamp).toLocaleString([], {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [chartReadings]);

  const chartSeriesByField = useMemo(() => {
    const map = {};
    activeFields.forEach((fieldName) => {
      map[fieldName] = chartReadings.map((r) => {
        const v = r.values?.[fieldName];
        return v === undefined || v === null ? null : Number(v);
      });
    });
    return map;
  }, [chartReadings, activeFields]);

  function computeExportRange() {
    const now = new Date();
    const end = now;
    let start = null;

    if (exportRange === "1d") {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (exportRange === "1w") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (exportRange === "1m") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (exportRange === "custom") {
      const fromDate = customFrom ? new Date(customFrom) : null;
      const toDate = customTo ? new Date(customTo) : null;

      const safeFrom =
        fromDate && Number.isFinite(fromDate.getTime()) ? fromDate : null;
      const safeTo =
        toDate && Number.isFinite(toDate.getTime()) ? toDate : null;
      return { start: safeFrom, end: safeTo };
    }

    return { start, end };
  }

  const getReadingsForExport = () => {
    const { start, end } = computeExportRange();
    const startMs = start ? start.getTime() : Number.NEGATIVE_INFINITY;
    const endMs = end ? end.getTime() : Number.POSITIVE_INFINITY;
    return readings.filter(
      (r) => r.timestamp >= startMs && r.timestamp <= endMs,
    );
  };

  const exportCsv = () => {
    const exportReadings = getReadingsForExport();
    if (!exportReadings.length) {
      alert("No readings in selected range.");
      return;
    }

    const headers = ["timestamp", ...activeFields];
    const rows = exportReadings.map((r) => {
      const ts = new Date(r.timestamp).toISOString();
      const values = activeFields.map((fieldName) => {
        const v = r.values?.[fieldName];
        return v === undefined || v === null ? "" : v;
      });
      return [ts, ...values];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const filename = `weather-data_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    downloadBlob(blob, filename);
  };

  return (
    <div className="data-container">
      <div className="data-header">
        <div className="data-label">DATA</div>
        <h1>Weather Data Config</h1>
        <p>Setup nguồn dữ liệu, xem lịch sử theo field, và quản lý cấu hình.</p>
      </div>

      <div className="data-tabs">
        <button
          type="button"
          className={activeTab === "setup" ? "active" : ""}
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          type="button"
          className={activeTab === "live" ? "active" : ""}
          onClick={() => setActiveTab("live")}
        >
          History
        </button>
        <button
          type="button"
          className={activeTab === "manage" ? "active" : ""}
          onClick={() => setActiveTab("manage")}
        >
          Manage
        </button>
      </div>

      {activeTab === "setup" ? (
        <div className="data-grid">
          <section className="data-card">
            <h2>Setup</h2>

            <form onSubmit={handleSubmit} className="data-form">
              <div className="data-row">
                <div className="data-group">
                  <label>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Station Rooftop"
                  />
                </div>
                <div className="data-group">
                  <label>GitHub Link</label>
                  <input
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              <div className="data-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả thiết bị / nguồn dữ liệu..."
                />
              </div>

              <div className="data-row">
                <div className="data-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="10.762622"
                  />
                </div>
                <div className="data-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="106.660172"
                  />
                </div>
              </div>

              <div className="data-group">
                <label>samplePeriodSec</label>
                <input
                  type="number"
                  min="1"
                  value={samplePeriodSec}
                  onChange={(e) => setSamplePeriodSec(e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="data-group">
                <label>8 Field Names</label>
                <div className="data-fields-grid">
                  {fields.map((value, idx) => (
                    <input
                      key={idx}
                      value={value}
                      onChange={(e) => updateField(idx, e.target.value)}
                      placeholder={`Field ${idx + 1} (vd: temperature)`}
                    />
                  ))}
                </div>
              </div>

              <div className="data-actions">
                <button type="submit" className="data-primary-btn">
                  Save (Demo)
                </button>
                <button
                  type="button"
                  className="data-secondary-btn"
                  onClick={handleReset}
                >
                  Delete Setup
                </button>
                {submitted ? (
                  <span className="data-saved">
                    Saved ({normalizeFieldNames(fields).length} field(s))
                  </span>
                ) : null}
              </div>
            </form>
          </section>

          <aside className="data-card data-preview">
            <h2>Preview JSON</h2>
            <pre className="data-json">
              {JSON.stringify(
                { ...config, fields: normalizeFieldNames(fields) },
                null,
                2,
              )}
            </pre>
          </aside>
        </div>
      ) : null}

      {activeTab === "live" ? (
        <div className="data-live">
          <div className="data-live-top">
            <div className="data-card data-live-controls">
              <h2>History</h2>
              <p className="data-muted">
                {submitted
                  ? `Fields: ${activeFields.length} • Period: ${clampPositiveInt(samplePeriodSec, 10)}s`
                  : "Chưa có setup. Vui lòng vào tab Setup để lưu cấu hình."}
              </p>

              <div className="data-actions">
                {isLive ? (
                  <button
                    type="button"
                    className="data-secondary-btn"
                    onClick={stopLive}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    className="data-primary-btn"
                    onClick={startLive}
                  >
                    Start
                  </button>
                )}
                <button
                  type="button"
                  className="data-secondary-btn"
                  onClick={() => setReadings([])}
                  disabled={!readings.length}
                >
                  Clear Readings
                </button>
              </div>

              <div className="data-export">
                <div className="data-export-row">
                  <div className="data-group">
                    <label>Range</label>
                    <select
                      value={exportRange}
                      onChange={(e) => setExportRange(e.target.value)}
                    >
                      <option value="1d">1 day</option>
                      <option value="1w">1 week</option>
                      <option value="1m">1 month</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {exportRange === "custom" ? (
                    <div className="data-export-custom">
                      <div className="data-group">
                        <label>From</label>
                        <input
                          type="datetime-local"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                        />
                      </div>
                      <div className="data-group">
                        <label>To</label>
                        <input
                          type="datetime-local"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="data-actions">
                  <button
                    type="button"
                    className="data-primary-btn"
                    onClick={exportCsv}
                    disabled={!readings.length || activeFields.length === 0}
                  >
                    Export CSV
                  </button>
                </div>

                <p className="data-muted">Samples stored: {readings.length}</p>
              </div>
            </div>
          </div>

          <div className="data-card data-live-cards">
            <h2>Fields</h2>
            <p className="data-muted">
              {latest
                ? `Last update: ${new Date(latest.timestamp).toLocaleString()}`
                : "No data yet. Press Start."}
            </p>
            <div className="data-field-cards">
              {activeFields.length === 0 ? (
                <div className="data-empty">No fields configured.</div>
              ) : (
                activeFields.map((fieldName) => (
                  <div className="data-field-card" key={fieldName}>
                    <div className="data-field-name">{fieldName}</div>
                    <div className="data-field-value">
                      {latest &&
                      latest.values &&
                      latest.values[fieldName] !== undefined
                        ? latest.values[fieldName]
                        : "—"}
                    </div>
                    <div className="data-sparkline" aria-hidden="true">
                      <FieldLineChart
                        labels={chartLabels}
                        series={chartSeriesByField[fieldName] || []}
                      />
                    </div>
                    <div className="data-field-meta">latest</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "manage" ? (
        <div className="data-grid data-manage">
          <section className="data-card">
            <h2>Manage</h2>
            <p className="data-muted">
              Update / delete setup (demo). Live data will reset after saving.
            </p>

            <div className="data-manage-actions">
              <button
                type="button"
                className="data-primary-btn"
                onClick={() => setActiveTab("setup")}
              >
                Edit Setup
              </button>
              <button
                type="button"
                className="data-secondary-btn"
                onClick={() => {
                  const ok = window.confirm("Delete setup and all readings?");
                  if (ok) {
                    stopLive();
                    handleReset();
                  }
                }}
              >
                Delete Setup
              </button>
              <button
                type="button"
                className="data-secondary-btn"
                onClick={() => setReadings([])}
                disabled={!readings.length}
              >
                Clear Readings
              </button>
            </div>
          </section>

          <aside className="data-card data-preview">
            <h2>Current Setup</h2>
            <pre className="data-json">
              {JSON.stringify({ ...config, fields: activeFields }, null, 2)}
            </pre>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default DataPage;
