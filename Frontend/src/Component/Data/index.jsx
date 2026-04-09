import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import {
  createDataReading,
  deleteDataReadings,
  deleteDataSetup,
  getDataReadings,
  getDataSetup,
  saveDataSetup,
} from "../../Services/api";
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

const normalizeSetupRecord = (record) => {
  const fields = Array.isArray(record?.fields)
    ? [...record.fields].slice(0, 8)
    : createDefaultFields();

  while (fields.length < 8) {
    fields.push("");
  }

  return {
    name: String(record?.name ?? ""),
    description: String(record?.description ?? ""),
    githubLink: String(record?.githubLink ?? ""),
    deviceApiUrl: String(record?.deviceApiUrl ?? ""),
    latitude:
      record?.location?.latitude === null ||
      record?.location?.latitude === undefined
        ? ""
        : String(record.location.latitude),
    longitude:
      record?.location?.longitude === null ||
      record?.location?.longitude === undefined
        ? ""
        : String(record.location.longitude),
    samplePeriodSec:
      record?.samplePeriodSec === null || record?.samplePeriodSec === undefined
        ? "2"
        : String(record.samplePeriodSec),
    fields,
  };
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
    if (lastItem && typeof lastItem === "object") {
      candidates.push(lastItem);
    }
  } else if (payload && typeof payload === "object") {
    candidates.push(payload);
    if (payload.data && typeof payload.data === "object") {
      candidates.push(payload.data);
    }
    if (payload.values && typeof payload.values === "object") {
      candidates.push(payload.values);
    }
  }

  const source =
    candidates.find((item) => item && typeof item === "object") || {};

  const timestampSource =
    source.timestamp ?? source.time ?? source.createdAt ?? source.ts;
  const timestampValue = timestampSource
    ? new Date(timestampSource).getTime()
    : NaN;
  const timestamp = Number.isFinite(timestampValue)
    ? timestampValue
    : Date.now();

  const values = {};
  fieldNames.forEach((fieldName) => {
    const rawValue =
      source[fieldName] ??
      source.values?.[fieldName] ??
      source.data?.[fieldName];
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
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return normalizeDeviceReading(payload, fieldNames);
  } finally {
    clearTimeout(timeoutId);
  }
};

const colorToRgbTriplet = (color) => {
  if (!color) {
    return "93, 223, 179";
  }

  const probe = document.createElement("span");
  probe.style.color = color;
  probe.style.display = "none";
  document.body.appendChild(probe);

  const computedColor = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return "93, 223, 179";
  }

  return `${match[1]}, ${match[2]}, ${match[3]}`;
};

const formatChartValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? "--");
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
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
    const candidateList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.readings)
        ? parsed.readings
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];

    return candidateList
      .map((item) => {
        const timestampSource =
          item?.timestamp ?? item?.time ?? item?.createdAt ?? item?.ts;
        const timestampValue = timestampSource
          ? new Date(timestampSource).getTime()
          : NaN;
        const timestamp = Number.isFinite(timestampValue)
          ? timestampValue
          : Date.now();
        const values =
          item?.values && typeof item.values === "object" ? item.values : item;

        return {
          timestamp,
          values,
        };
      })
      .filter((item) => item && typeof item === "object");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const timestampIndex = headerIndex.has("timestamp")
      ? headerIndex.get("timestamp")
      : -1;
    const timestampSource = timestampIndex >= 0 ? cells[timestampIndex] : null;
    const timestampValue = timestampSource
      ? new Date(timestampSource).getTime()
      : NaN;
    const timestamp = Number.isFinite(timestampValue)
      ? timestampValue
      : Date.now();
    const values = {};

    headers.forEach((header, index) => {
      if (header === "timestamp") {
        return;
      }
      const numericValue = Number(cells[index]);
      values[header] = Number.isFinite(numericValue) ? numericValue : null;
    });

    return { timestamp, values };
  });
};

function FieldLineChart({ labels, series }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const buildAreaGradient = (chart, topColor) => {
    const { ctx, chartArea } = chart;

    if (!chartArea) {
      return `rgba(${topColor}, 0.12)`;
    }

    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom,
    );
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
        datasets: [
          {
            data: [],
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 14,
            tension: 0.42,
            fill: true,
            cubicInterpolationMode: "monotone",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: "nearest",
          intersect: false,
        },
        onClick: (_event, elements, chart) => {
          if (!elements.length) {
            setSelectedPoint(null);
            return;
          }

          const point = elements[0];
          const index = point.index;
          const label = chart.data.labels?.[index] ?? "";
          const value = chart.data.datasets?.[0]?.data?.[index];

          setSelectedPoint({ index, label, value });
        },
        layout: {
          padding: {
            top: 12,
            right: 12,
            bottom: 8,
            left: 4,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            displayColors: false,
            backgroundColor: "rgba(7, 13, 25, 0.92)",
            titleColor: "#e6eeff",
            bodyColor: "#e6eeff",
            borderColor: "rgba(0, 212, 255, 0.28)",
            borderWidth: 1,
            padding: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 5,
              padding: 8,
              color: "#9fb0d9",
            },
          },
          y: {
            grid: {
              drawBorder: false,
              color: (context) =>
                context.tick.value === 0
                  ? "rgba(0, 212, 255, 0.24)"
                  : "rgba(160, 181, 223, 0.12)",
            },
            ticks: {
              maxTicksLimit: 5,
              padding: 8,
              color: "#9fb0d9",
            },
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

    const container =
      canvasRef.current?.closest(".data-container") || document.documentElement;
    const styles = getComputedStyle(container);
    const accentSecondary = styles.getPropertyValue("--accent-secondary").trim();
    const border = styles.getPropertyValue("--border-color").trim();
    const textMuted = styles.getPropertyValue("--text-muted").trim();
    const textSecondary = styles.getPropertyValue("--text-secondary").trim();

    const accentSecondaryRgb = colorToRgbTriplet(accentSecondary);

    chart.data.labels = labels;
    chart.data.datasets[0].data = series;
    chart.data.datasets[0].borderColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].backgroundColor = (context) =>
      buildAreaGradient(context.chart, accentSecondaryRgb);
    chart.data.datasets[0].pointBackgroundColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].pointBorderColor = accentSecondary || "#7cffb2";
    chart.data.datasets[0].pointHoverBackgroundColor =
      accentSecondary || "#7cffb2";
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
      if (!current) {
        return current;
      }

      if (current.index >= series.length) {
        return null;
      }

      return {
        ...current,
        label: labels[current.index] ?? current.label,
        value: series[current.index],
      };
    });
  }, [labels, series]);

  return (
    <div className="data-sparkline-inner">
      <canvas ref={canvasRef} />
      {selectedPoint ? (
        <div
          className="data-chart-value-badge"
          role="status"
          aria-live="polite"
        >
          <span>{selectedPoint.label || "Selected"}</span>
          <strong>{formatChartValue(selectedPoint.value)}</strong>
        </div>
      ) : null}
    </div>
  );
}

function DataPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [deviceApiUrl, setDeviceApiUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [samplePeriodSec, setSamplePeriodSec] = useState("2");
  const [fields, setFields] = useState(createDefaultFields);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const [isLive, setIsLive] = useState(false);
  const intervalRef = useRef(null);
  const isLiveRef = useRef(false);
  const lastValuesRef = useRef({});
  const [readings, setReadings] = useState([]);

  const [exportRange, setExportRange] = useState("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [syncState, setSyncState] = useState("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [apiCheckState, setApiCheckState] = useState("idle");
  const [apiCheckMessage, setApiCheckMessage] = useState("");
  const [importState, setImportState] = useState("idle");
  const [importMessage, setImportMessage] = useState("");
  const [dashboardLimit, setDashboardLimit] = useState("10");

  const updateField = (index, value) => {
    setFields((current) => current.map((v, i) => (i === index ? value : v)));
  };

  const activeFields = useMemo(() => normalizeFieldNames(fields), [fields]);

  const applySetupRecord = (record) => {
    const normalized = normalizeSetupRecord(record);

    setName(normalized.name);
    setDescription(normalized.description);
    setGithubLink(normalized.githubLink);
    setDeviceApiUrl(normalized.deviceApiUrl);
    setLatitude(normalized.latitude);
    setLongitude(normalized.longitude);
    setSamplePeriodSec(normalized.samplePeriodSec);
    setFields(normalized.fields);
    setSubmitted(Boolean(record));
  };

  const config = useMemo(() => {
    return {
      name: name.trim(),
      description: description.trim(),
      githubLink: githubLink.trim(),
      deviceApiUrl: deviceApiUrl.trim(),
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
    deviceApiUrl,
    latitude,
    longitude,
    samplePeriodSec,
    fields,
  ]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSetup = async () => {
      let record = null;

      try {
        record = await getDataSetup();
        if (record) {
          setSyncState("success");
          setSyncMessage("Loaded setup from MongoDB.");
        }
      } catch (error) {
        console.error(error);
      }

      if (!record) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = safeJsonParse(raw);
          if (parsed) {
            record = parsed;
            setSyncState("fallback");
            setSyncMessage(
              "Loaded setup from local cache and queued sync to MongoDB.",
            );
            void saveDataSetup(parsed).catch((error) => {
              console.error(error);
            });
          }
        }
      }

      if (!cancelled && record) {
        applySetupRecord(record);
      }

      try {
        const storedReadings = await getDataReadings({ limit: 500 });
        if (!cancelled) {
          setReadings(Array.isArray(storedReadings) ? storedReadings : []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void bootstrapSetup();

    return () => {
      cancelled = true;
    };
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
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const validateConfig = () => {
    const errors = [];

    if (!name.trim()) {
      errors.push("Name is required.");
    }

    const activeFieldsList = normalizeFieldNames(fields);
    if (activeFieldsList.length === 0) {
      errors.push("At least one field name is required.");
    }

    const duplicateFields = activeFieldsList.filter(
      (item, index) => activeFieldsList.indexOf(item) !== index,
    );
    if (duplicateFields.length > 0) {
      errors.push(
        `Duplicate field names: ${duplicateFields.join(", ")}. Each field must be unique.`,
      );
    }

    if (latitude !== "") {
      const lat = Number(latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.push("Latitude must be between -90 and 90.");
      }
    }

    if (longitude !== "") {
      const lng = Number(longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        errors.push("Longitude must be between -180 and 180.");
      }
    }

    const periodSec = clampPositiveInt(samplePeriodSec, 10);
    if (periodSec < 1) {
      errors.push("Sample period must be at least 1 second.");
    }

    return errors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateConfig();
    if (validationErrors.length > 0) {
      setSyncState("error");
      setSyncMessage(validationErrors.join(" "));
      return;
    }
    const submitSetup = async () => {
      try {
        await saveDataSetup(config);
        await deleteDataReadings();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        setSyncState("success");
        setSyncMessage("Setup saved to MongoDB.");
        setSubmitted(true);
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLive(false);
        isLiveRef.current = false;
        setReadings([]);
        lastValuesRef.current = {};
        setActiveTab("live");
      } catch (error) {
        console.error(error);
        setSyncState("error");
        setSyncMessage(
          `Could not save to MongoDB: ${error?.message || "Unknown error"}`,
        );
      }
    };
    void submitSetup();
  };

  const handleReset = () => {
    const resetSetup = async () => {
      try {
        await deleteDataSetup();
        setSyncState("success");
        setSyncMessage("Setup and readings deleted from MongoDB.");
      } catch (error) {
        console.error(error);
        setSyncState("error");
        setSyncMessage(
          `Could not delete from MongoDB: ${error?.message || "Unknown error"}`,
        );
      }

      setName("");
      setDescription("");
      setGithubLink("");
      setDeviceApiUrl("");
      setLatitude("");
      setLongitude("");
      setSamplePeriodSec("2");
      setFields(createDefaultFields());
      setSubmitted(false);
      setActiveTab("setup");
      setReadings([]);
      lastValuesRef.current = {};
      setSyncState("idle");
      setSyncMessage("");
      setApiCheckState("idle");
      setApiCheckMessage("");

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error(error);
      }
    };

    void resetSetup();
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
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let payload = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }

      const previewText =
        payload && typeof payload === "object"
          ? Object.keys(payload).slice(0, 4).join(", ") || "JSON object"
          : "text response";

      setApiCheckState("success");
      setApiCheckMessage(`Connection OK. Response looks like: ${previewText}.`);
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      setApiCheckState("error");
      setApiCheckMessage(
        isAbort
          ? "Connection timed out after 8 seconds."
          : `Connection failed: ${error?.message || "Unknown error"}`,
      );
    } finally {
      clearTimeout(timeoutId);
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
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    setIsLive(true);
    isLiveRef.current = true;

    const tick = async () => {
      if (!isLiveRef.current) {
        return;
      }

      const targetUrl = deviceApiUrl.trim();
      let nextReading = null;
      let readingSource = "mock";

      if (targetUrl) {
        try {
          nextReading = await fetchDeviceReading(targetUrl, activeFields);
          readingSource = "device";
          setApiCheckState("success");
          setApiCheckMessage("✓ Source: Device API");
        } catch (error) {
          setApiCheckState("warning");
          setApiCheckMessage(`⚠ Source: Mock Fallback (API unreachable)`);
        }
      } else {
        setApiCheckState("info");
        setApiCheckMessage("ℹ Source: Mock Data (no Device API URL)");
      }

      if (!nextReading) {
        nextReading = buildMockReading(activeFields, lastValuesRef.current);
        readingSource = "mock";
      }

      lastValuesRef.current = {
        ...lastValuesRef.current,
        ...nextReading.values,
      };

      setReadings((current) => {
        const appended = [...current, nextReading];
        const MAX = 5000;
        if (appended.length <= MAX) return appended;
        return appended.slice(appended.length - MAX);
      });

      try {
        await createDataReading({
          timestamp: nextReading.timestamp,
          values: nextReading.values,
          source: readingSource,
          rawPayload:
            readingSource === "device"
              ? (nextReading.rawPayload ?? null)
              : null,
        });
      } catch (error) {
        console.error(error);
        setApiCheckState("error");
        setApiCheckMessage(
          `Reading not stored in MongoDB: ${error?.message || "Unknown error"}`,
        );
      }

      if (isLiveRef.current) {
        intervalRef.current = setTimeout(tick, periodMs);
      }
    };

    tick();
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

  const dashboardReadings = useMemo(() => {
    const limit = clampPositiveInt(dashboardLimit, 10);
    return [...readings].slice(-limit).reverse();
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

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

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

      const normalizedFields = activeFields.length
        ? activeFields
        : Object.keys(imported[0]?.values || {});

      const nextReadings = [];

      for (const item of imported) {
        const importedValues = {};
        normalizedFields.forEach((fieldName) => {
          const numericValue = Number(item?.values?.[fieldName]);
          importedValues[fieldName] = Number.isFinite(numericValue)
            ? numericValue
            : null;
        });

        const reading = {
          timestamp: item.timestamp || Date.now(),
          values: importedValues,
          source: "imported",
          rawPayload: item,
        };

        nextReadings.push(reading);

        try {
          await createDataReading(reading);
        } catch (error) {
          console.error(error);
        }
      }

      setReadings((current) => [...current, ...nextReadings]);
      setImportState("success");
      setImportMessage(
        `Imported ${nextReadings.length} reading(s) into MongoDB.`,
      );
    } catch (error) {
      console.error(error);
      setImportState("error");
      setImportMessage(`Import failed: ${error?.message || "Unknown error"}`);
    }
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
                <label>Device API URL</label>
                <input
                  value={deviceApiUrl}
                  onChange={(e) => setDeviceApiUrl(e.target.value)}
                  placeholder="http://192.168.1.50/api/data"
                />
              </div>

              <div className="data-actions">
                <button
                  type="button"
                  className="data-secondary-btn"
                  onClick={testDeviceApiConnection}
                  disabled={
                    !deviceApiUrl.trim() || apiCheckState === "checking"
                  }
                >
                  {apiCheckState === "checking"
                    ? "Testing..."
                    : "Test Connection"}
                </button>
                {apiCheckMessage ? (
                  <span
                    className="data-saved"
                    role="status"
                    aria-live="polite"
                    data-status={apiCheckState}
                  >
                    {apiCheckMessage}
                  </span>
                ) : null}
              </div>

              {syncMessage ? (
                <p className="data-muted" data-sync-state={syncState}>
                  {syncMessage}
                </p>
              ) : null}

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
                  Save to MongoDB
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
            <h2>Dashboard</h2>
            <p className="data-muted">
              View recent history, import readings, and manage the saved setup.
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

            <div className="data-group data-group-spaced">
              <label>Import Readings</label>
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleImportFile}
              />
              {importMessage ? (
                <p className="data-muted" data-import-state={importState}>
                  {importMessage}
                </p>
              ) : null}
            </div>

            <div className="data-group">
              <label>Recent Items</label>
              <input
                type="number"
                min="1"
                max="50"
                value={dashboardLimit}
                onChange={(e) => setDashboardLimit(e.target.value)}
                placeholder="10"
              />
            </div>
          </section>

          <aside className="data-card data-preview">
            <h2>History Summary</h2>
            <div className="data-field-cards">
              <div className="data-field-card">
                <div className="data-field-name">Total readings</div>
                <div className="data-field-value">{dashboardStats.count}</div>
                <div className="data-field-meta">stored in MongoDB</div>
              </div>
              <div className="data-field-card">
                <div className="data-field-name">Configured fields</div>
                <div className="data-field-value">
                  {dashboardStats.fieldsCount}
                </div>
                <div className="data-field-meta">active setup</div>
              </div>
              <div className="data-field-card">
                <div className="data-field-name">Last source</div>
                <div className="data-field-value">
                  {dashboardStats.lastSource}
                </div>
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
                      <td colSpan={2 + activeFields.length}>
                        No readings yet.
                      </td>
                    </tr>
                  ) : (
                    dashboardReadings.map((reading, index) => (
                      <tr key={`${reading.timestamp}-${index}`}>
                        <td>{new Date(reading.timestamp).toLocaleString()}</td>
                        <td>
                          <span
                            className={`data-source-pill data-source-${String(reading.source || "unknown").toLowerCase()}`}
                          >
                            {reading.source || "unknown"}
                          </span>
                        </td>
                        {activeFields.map((fieldName) => (
                          <td key={fieldName}>
                            {reading.values?.[fieldName] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="data-history-cards"
              aria-label="Recent history cards"
            >
              {dashboardReadings.length === 0 ? (
                <div className="data-history-empty">No readings yet.</div>
              ) : (
                dashboardReadings.map((reading, index) => (
                  <article
                    className="data-history-card"
                    key={`${reading.timestamp}-${index}-card`}
                  >
                    <div className="data-history-card-top">
                      <div>
                        <div className="data-history-card-label">Time</div>
                        <div className="data-history-card-value">
                          {new Date(reading.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`data-source-pill data-source-${String(reading.source || "unknown").toLowerCase()}`}
                      >
                        {reading.source || "unknown"}
                      </span>
                    </div>

                    <div className="data-history-card-grid">
                      {activeFields.length === 0 ? (
                        <div className="data-history-empty">
                          No fields configured.
                        </div>
                      ) : (
                        activeFields.map((fieldName) => (
                          <div
                            className="data-history-mini"
                            key={`${fieldName}-${reading.timestamp}`}
                          >
                            <span className="data-history-mini-label">
                              {fieldName}
                            </span>
                            <strong className="data-history-mini-value">
                              {reading.values?.[fieldName] ?? "—"}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default DataPage;
