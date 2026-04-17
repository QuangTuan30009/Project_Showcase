import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "https://project-showcase-tg3m.onrender.com/api");

export const SOCKET_URL = API_URL.replace(/\/api$/, "");

// Configure axios with longer timeout for cold starts
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for backend cold start
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem("admin_token");
    if (window.location.pathname === "/admin-dashboard-hidden") {
      window.location.assign("/");
    }
  }
  return Promise.reject(error);
});

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

// Retry helper function
const retryRequest = async (requestFn, retries = 2) => {
  try {
    return await requestFn();
  } catch (error) {
    if (
      retries > 0 &&
      (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK")
    ) {
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

// Login admin
export const loginAdmin = async (username, password) => {
  return retryRequest(async () => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  });
};

// Get all projects
export const getProjects = async ({ includeHidden = false } = {}) => {
  return retryRequest(async () => {
    const response = await api.get(
      `/projects${toQueryString({ includeHidden: includeHidden ? "true" : undefined })}`,
    );
    return response.data;
  });
};

// Get single project
export const getProject = async (id) => {
  return retryRequest(async () => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  });
};

// Create new project
export const createProject = async (projectData) => {
  return retryRequest(async () => {
    const response = await api.post("/projects", {
      ...projectData,
      moderationStatus: projectData.moderationStatus || "pending",
    });
    return response.data;
  });
};

// Update project
export const updateProject = async (id, projectData) => {
  return retryRequest(async () => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  });
};

// Update moderation status
export const updateProjectModeration = async (id, moderationData) => {
  return retryRequest(async () => {
    const response = await api.patch(
      `/projects/${id}/moderation`,
      moderationData,
    );
    return response.data;
  });
};

// Delete project
export const deleteProject = async (id) => {
  return retryRequest(async () => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  });
};

// Get all data setups
export const getDataSetups = async () => {
  return retryRequest(async () => {
    const response = await api.get("/data/setups");
    return response.data;
  });
};

// Get single data setup
export const getDataSetup = async (setupKey) => {
  return retryRequest(async () => {
    const response = await api.get(`/data/setup/${setupKey}`);
    return response.data;
  });
};

// Create new data setup
export const createDataSetup = async (setupData) => {
  return retryRequest(async () => {
    const response = await api.post("/data/setup", setupData);
    return response.data;
  });
};

// Update data setup
export const updateDataSetup = async (setupKey, setupData) => {
  return retryRequest(async () => {
    const response = await api.put(`/data/setup/${setupKey}`, setupData);
    return response.data;
  });
};

// Delete data setup and readings
export const deleteDataSetup = async (setupKey) => {
  return retryRequest(async () => {
    const response = await api.delete(`/data/setup/${setupKey}`);
    return response.data;
  });
};

// Clear data readings only
export const deleteDataReadings = async (setupKey) => {
  return retryRequest(async () => {
    const response = await api.delete(`/data/readings/${setupKey}`);
    return response.data;
  });
};

// Get recent data readings
export const getDataReadings = async (setupKey, { limit = 500 } = {}) => {
  return retryRequest(async () => {
    const response = await api.get(`/data/readings/${setupKey}${toQueryString({ limit })}`);
    return response.data;
  });
};

// Save a single data reading
export const createDataReading = async (setupKey, readingData) => {
  return retryRequest(async () => {
    const response = await api.post(`/data/readings/${setupKey}`, readingData);
    return response.data;
  });
};
