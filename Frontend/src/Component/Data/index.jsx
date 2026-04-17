import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import {
  createDataReading,
  getDataReadings,
  getDataSetups,
  SOCKET_URL
} from "../../Services/api";
import { io } from "socket.io-client";
import "./index.scss";

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

const buildMockReading = (fieldNames, lastValues) => {
  const values = {};
  fieldNames.forEach((fieldName) => {
    const prev = Number.isFinite(lastValues[fieldName])
      ? lastValues[fieldName]
      : 20 + Math.random() * 10;
    const delta = (Math.random() - 0.5) * 1.2;
    const next = Math.round((prev + delta) * 100) / 100;
    values[fieldName] = next;
  });

  return {
    timestamp: Date.now(),
    values,
  };
};

const normalizeDeviceReading = (payload, fieldNames) => {
  const candidates = [];
  if (Array.isArray(payload)) {
    const lastItem = payload[payload.length - 1];
    if (lastItem && typeof lastItem === "object") candidates.push(lastItem);
  } else if (payload && typeof payload === "object") {
    candidates.push(payload);
    if (payload.data && typeof payload.data === "object") candidates.push(payload.data);
    if (payload.values && typeof payload.values === "object") candidates.push(payload.values);
  }

  const source = candidates.find((item) => item && typeof item === "object") || {};
  const timestampSource = source.timestamp ?? source.time ?? source.createdAt ?? source.ts;
  const timestampValue = timestampSource ? new Date(timestampSource).getTime() : NaN;
  const timestamp = Number.isFinite(timestampValue) ? timestampValue : Date.now();

  const values = {};
  fieldNames.forEach((fieldName) => {
    const rawValue = source[fieldName] ?? source.values?.[fieldName] ?? source.data?.[fieldName];
    const numericValue = Number(rawValue);
    values[fieldName] = Number.isFinite(numericValue) ? numericValue : null;
  });

  return { timestamp, values, rawPayload: payload };
};

const fetchDeviceReading = async (targetUrl, fieldNames) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    return normalizeDeviceReading(payload, fieldNames);
  } finally {
    clearTimeout(timeoutId);
  }
};

const colorToRgbTriplet = (color) => {
  if (!color) return "93, 223, 179";
  const probe = document.createElement("span");
  probe.style.color = color;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computedColor = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "93, 223, 179";
  return `${match[1]}, ${match[2]}, ${match[3]}`;
};

const formatChartValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? "--");
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function FieldLineChart({ labels, series }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const buildAreaGradient = (chart, topColor) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return `rgba(${topColor}, 0.12)`;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `rgba(${topColor}, 0.48)`);
    gradient.addColorStop(0.55, `rgba(${topColor}, 0.18)`);
    gradient.addColorStop(1, `rgba(${topColor}, 0.02)`);
    return gradient;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [], borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 14,
          tension: 0.42, fill: true, cubicInterpolationMode: "monotone",
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: "nearest", intersect: false },
        onClick: (_event, elements, chart) => {
          if (!elements.length) { setSelectedPoint(null); return; }
          const point = elements[0];
          const index = point.index;
          setSelectedPoint({ index, label: chart.data.labels?.[index] ?? "", value: chart.data.datasets?.[0]?.data?.[index] });
        },
        layout: { padding: { top: 12, right: 12, bottom: 8, left: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true, displayColors: false, backgroundColor: "rgba(7, 13, 25, 0.92)",
            titleColor: "#e6eeff", bodyColor: "#e6eeff", borderColor: "rgba(0, 212, 255, 0.28)", borderWidth: 1, padding: 10,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 5, padding: 8, color: "#9fb0d9" } },
          y: { grid: { drawBorder: false, color: (c) => c.tick.value === 0 ? "rgba(0, 212, 255, 0.24)" : "rgba(160, 181, 223, 0.12)" }, ticks: { maxTicksLimit: 5, padding: 8, color: "#9fb0d9" } },
        },
      },
    });
    chartRef.current = chart;
    return () => { chart.destroy(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const container = canvasRef.current?.closest(".data-container") || document.documentElement;
    const styles = getComputedStyle(container);
    const accentSecondary = styles.getPropertyValue("--accent-secondary").trim();
    const border = styles.getPropertyValue("--border-color").trim();
    const textMuted = styles.getPropertyValue("--text-muted").trim();
    const textSecondary = styles.getPropertyValue("--text-secondary").trim();
    const accentSecondaryRgb = colorToRgbTriplet(accentSecondary);

    chart.data.labels = labels;
    chart.data.datasets[0].data = series;
    chart.data.datasets[0].borderColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].backgroundColor = (context) => buildAreaGradient(context.chart, accentSecondaryRgb);
    chart.data.datasets[0].pointBackgroundColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].pointBorderColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].pointHoverBackgroundColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].pointHoverBorderColor = accentSecondary || "#7cffb2";

    chart.options.scales.x.ticks.color = textMuted || "#999";
    chart.options.scales.y.ticks.color = textMuted || "#999";
    chart.options.scales.y.grid.color = border || "#e0e0e0";
    chart.options.scales.x.grid.color = border || "#e0e0e0";
    chart.options.scales.x.border = { color: border || "#e0e0e0" };
    chart.options.scales.y.border = { color: border || "#e0e0e0" };
    chart.options.plugins.tooltip.bodyColor = textSecondary || "#6b6b6b";
    chart.options.plugins.tooltip.titleColor = textSecondary || "#6b6b6b";
    chart.update("none");
  }, [labels, series]);

  useEffect(() => {
    setSelectedPoint((current) => {
      if (!current) return current;
      if (current.index >= series.length) return null;
      return { ...current, label: labels[current.index] ?? current.label, value: series[current.index] };
    });
  }, [labels, series]);

  return (
    <div className="data-sparkline-inner">
      <canvas ref={canvasRef} />
      {selectedPoint ? (
        <div className="data-chart-value-badge" role="status" aria-live="polite">
          <span>{selectedPoint.label || "Selected"}</span>
          <strong>{formatChartValue(selectedPoint.value)}</strong>
        </div>
      ) : null}
    </div>
  );
}

function DataPage() {
  const [setups, setSetups] = useState([]);
  const [selectedSetupKey, setSelectedSetupKey] = useState("");
  const activeSetup = useMemo(() => setups.find(s => s.setupKey === selectedSetupKey), [setups, selectedSetupKey]);

  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef(null);
  const isLiveRef = useRef(false);
  const lastValuesRef = useRef({});
  const [readings, setReadings] = useState([]);

  const [exportRange, setExportRange] = useState("1h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [apiCheckState, setApiCheckState] = useState("idle");
  const [apiCheckMessage, setApiCheckMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchInit = async () => {
      try {
        const data = await getDataSetups();
        if (!cancelled) {
          setSetups(data || []);
          if (data && data.length > 0) {
            setSelectedSetupKey(data[0].setupKey);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchInit();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    stopLive();
    setReadings([]);
    lastValuesRef.current = {};
    if (!selectedSetupKey) return;
    
    let cancelled = false;
    const fetchReadings = async () => {
      try {
        const stored = await getDataReadings(selectedSetupKey, { limit: 500 });
        if (!cancelled && Array.isArray(stored)) {
          setReadings(stored);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchReadings();
    return () => { cancelled = true; };
  }, [selectedSetupKey]);

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on("new_reading", (reading) => {
      if (isLiveRef.current) {
        lastValuesRef.current = { ...lastValuesRef.current, ...reading.values };
        setReadings((current) => {
          const appended = [...current, reading];
          const MAX = 5000;
          if (appended.length <= MAX) return appended;
          return appended.slice(appended.length - MAX);
        });
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current && selectedSetupKey) {
      socketRef.current.emit("join_room", selectedSetupKey);
    }
  }, [selectedSetupKey]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const startLive = () => {
    if (!activeSetup) {
      alert("Please select a dataset.");
      return;
    }
    const activeFields = normalizeFieldNames(activeSetup.fields);
    if (activeFields.length === 0) {
      alert("This dataset has no active fields configured.");
      return;
    }

    const periodSec = clampPositiveInt(activeSetup.samplePeriodSec, 10);
    const periodMs = periodSec * 1000;

    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    setIsLive(true);
    isLiveRef.current = true;
    const targetUrl = (activeSetup.deviceApiUrl || "").trim();

    if (targetUrl) {
      setApiCheckState("success");
      setApiCheckMessage("✓ Real-time WebSockets Active (Waiting for device...)");
      // The device will push to Backend, which emits over Socket.io
      // We don't need to poll anymore!
    } else {
      setApiCheckState("info");
      setApiCheckMessage("ℹ Source: Mock Data Simulator");
      
      const tick = async () => {
        if (!isLiveRef.current) return;
        
        const nextReading = buildMockReading(activeFields, lastValuesRef.current);
        
        try {
          await createDataReading(activeSetup.setupKey, {
            timestamp: nextReading.timestamp,
            values: nextReading.values,
            source: "mock",
            rawPayload: null,
          });
          // The socket.io listener will catch the event and update the UI
        } catch (error) {
          console.error(error);
          setApiCheckState("error");
          setApiCheckMessage(`Mock ingest failed: ${error?.message || "Unknown error"}`);
        }

        if (isLiveRef.current) {
          intervalRef.current = setTimeout(tick, periodMs);
        }
      };
      tick();
    }
  };

  const stopLive = () => {
    setIsLive(false);
    isLiveRef.current = false;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const latest = readings.length ? readings[readings.length - 1] : null;

  function computeExportRange() {
    const now = new Date();
    const end = now;
    let start = null;
    if (exportRange === "15min") start = new Date(now.getTime() - 15 * 60 * 1000);
    else if (exportRange === "1h") start = new Date(now.getTime() - 60 * 60 * 1000);
    else if (exportRange === "1d") start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (exportRange === "1w") start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (exportRange === "1m") start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (exportRange === "custom") {
      const fromDate = customFrom ? new Date(customFrom) : null;
      const toDate = customTo ? new Date(customTo) : null;
      start = fromDate && Number.isFinite(fromDate.getTime()) ? fromDate : null;
      const safeTo = toDate && Number.isFinite(toDate.getTime()) ? toDate : null;
      return { start, end: safeTo };
    }
    return { start, end };
  }

  const chartReadings = useMemo(() => {
    if (isLive) {
      const LIVE_POINTS = 30;
      if (readings.length <= LIVE_POINTS) return readings;
      return readings.slice(-LIVE_POINTS);
    }

    const { start, end } = computeExportRange();
    const startMs = start ? start.getTime() : Number.NEGATIVE_INFINITY;
    const endMs = end ? end.getTime() : Number.POSITIVE_INFINITY;
    const filtered = readings.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= startMs && ts <= endMs;
    });
    const MAX_POINTS = 500;
    if (filtered.length <= MAX_POINTS) return filtered;
    const step = Math.ceil(filtered.length / MAX_POINTS);
    return filtered.filter((_, idx) => idx % step === 0);
  }, [readings, exportRange, customFrom, customTo, isLive]);

  const chartLabels = useMemo(() => {
    return chartReadings.map((r) =>
      new Date(r.timestamp).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    );
  }, [chartReadings]);

  const chartSeriesByField = useMemo(() => {
    const map = {};
    const activeFields = activeSetup ? normalizeFieldNames(activeSetup.fields) : [];
    activeFields.forEach((fieldName) => {
      map[fieldName] = chartReadings.map((r) => {
        const v = r.values?.[fieldName];
        return v === undefined || v === null ? null : Number(v);
      });
    });
    return map;
  }, [chartReadings, activeSetup]);

  const exportCsv = () => {
    const { start, end } = computeExportRange();
    const startMs = start ? start.getTime() : Number.NEGATIVE_INFINITY;
    const endMs = end ? end.getTime() : Number.POSITIVE_INFINITY;
    const exportReadings = readings.filter((r) => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= startMs && ts <= endMs;
    });
    
    if (!exportReadings.length) {
      alert("No readings in selected range.");
      return;
    }

    const activeFields = normalizeFieldNames(activeSetup?.fields || []);
    const headers = ["timestamp", ...activeFields];
    const rows = exportReadings.map((r) => {
      const ts = new Date(r.timestamp).toISOString();
      const values = activeFields.map((fieldName) => {
        const v = r.values?.[fieldName];
        return v === undefined || v === null ? "" : v;
      });
      return [ts, ...values];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const filename = `data_${activeSetup.setupKey}_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    downloadBlob(blob, filename);
  };

  if (!setups.length) {
    return (
      <div className="data-container">
        <div className="data-header">
          <div className="data-label">DATA</div>
          <h1>Weather Data Config</h1>
          <p>Không có bộ dữ liệu nào. Vui lòng liên hệ Admin để cấu hình.</p>
        </div>
      </div>
    );
  }

  const activeFields = normalizeFieldNames(activeSetup?.fields || []);

  return (
    <div className="data-container">
      <div className="data-header">
        <div className="data-label">DATA</div>
        <h1>Device History</h1>
        <p>Theo dõi biểu đồ và xuất dữ liệu lịch sử.</p>
        
        <div className="data-group" style={{ maxWidth: "400px", marginTop: "20px" }}>
          <select 
            value={selectedSetupKey} 
            onChange={(e) => setSelectedSetupKey(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(10, 20, 40, 0.8)", color: "#fff", border: "1px solid rgba(0, 212, 255, 0.3)", fontSize: "16px" }}
          >
            {setups.map(s => (
              <option key={s.setupKey} value={s.setupKey}>
                {s.name || s.setupKey}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="data-live" style={{ marginTop: "30px" }}>
        <div className="data-live-top">
          <div className="data-card data-live-controls">
            <h2>History Control</h2>
            <p className="data-muted">
              Fields: {activeFields.length} • Period: {clampPositiveInt(activeSetup?.samplePeriodSec, 10)}s
            </p>

            <div className="data-actions">
              {isLive ? (
                <button type="button" className="data-secondary-btn" onClick={stopLive}>Stop</button>
              ) : (
                <button type="button" className="data-primary-btn" onClick={startLive}>Start</button>
              )}
            </div>
            {apiCheckMessage && (
              <p className="data-muted" style={{ marginTop: "10px" }} data-status={apiCheckState}>{apiCheckMessage}</p>
            )}

            <div className="data-export" style={{ marginTop: "20px" }}>
              <div className="data-export-row">
                <div className="data-group">
                  <label>Range</label>
                  <select value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
                    <option value="15min">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="1d">1 day</option>
                    <option value="1w">1 week</option>
                    <option value="1m">1 month</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {exportRange === "custom" && (
                  <div className="data-export-custom">
                    <div className="data-group">
                      <label>From</label>
                      <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                    </div>
                    <div className="data-group">
                      <label>To</label>
                      <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="data-actions">
                <button type="button" className="data-primary-btn" onClick={exportCsv} disabled={!readings.length || activeFields.length === 0}>
                  Export CSV
                </button>
              </div>

              <p className="data-muted">Samples stored locally: {readings.length}</p>
            </div>
          </div>
        </div>

        <div className="data-card data-live-cards">
          <h2>Fields</h2>
          <p className="data-muted">
            {latest ? `Last update: ${new Date(latest.timestamp).toLocaleString()}` : "No data yet. Press Start."}
          </p>
          <div className="data-field-cards">
            {activeFields.length === 0 ? (
              <div className="data-empty">No fields configured.</div>
            ) : (
              activeFields.map((fieldName) => (
                <div className="data-field-card" key={fieldName}>
                  <div className="data-field-name">{fieldName}</div>
                  <div className="data-field-value">
                    {latest && latest.values && latest.values[fieldName] !== undefined ? latest.values[fieldName] : "—"}
                  </div>
                  <div className="data-sparkline" aria-hidden="true">
                    <FieldLineChart labels={chartLabels} series={chartSeriesByField[fieldName] || []} />
                  </div>
                  <div className="data-field-meta">latest</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataPage;
