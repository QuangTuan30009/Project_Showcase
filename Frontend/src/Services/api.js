import axios from "axios";

const API_URL = "https://project-showcase-tg3m.onrender.com/api";

// Configure axios with longer timeout for cold starts
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for backend cold start
  headers: {
    'Content-Type': 'application/json'
  }
});

// Retry helper function
const retryRequest = async (requestFn, retries = 2) => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

// Get all projects
export const getProjects = async () => {
  return retryRequest(async () => {
    const response = await api.get('/projects');
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
    const response = await api.post('/projects', projectData);
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

// Delete project
export const deleteProject = async (id) => {
  return retryRequest(async () => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  });
};
