import React, { useState, useEffect } from "react";
import "./index.scss";
import Project_list from "./Project-list";
import AddProjectModal from "./AddProjectModal";
import * as api from "../../Services/api";

function Project() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ITEMS_PER_PAGE = 6; // 2 rows x 3 columns

  // Fetch projects from API when component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError("Failed to load projects");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (newProjectData) => {
    try {
      if (editingProject) {
        // Edit existing project
        const updatedData = {
          ...newProjectData,
          techStack:
            typeof newProjectData.techStack === "string"
              ? newProjectData.techStack.split(",").map((tech) => tech.trim())
              : newProjectData.techStack,
        };
        const updated = await api.updateProject(
          editingProject._id,
          updatedData,
        );
        setProjects(
          projects.map((project) =>
            project._id === editingProject._id ? updated : project,
          ),
        );
        setEditingProject(null);
      } else {
        // Add new project
        const projectToCreate = {
          ...newProjectData,
          techStack:
            typeof newProjectData.techStack === "string"
              ? newProjectData.techStack.split(",").map((tech) => tech.trim())
              : newProjectData.techStack,
          image:
            newProjectData.image ||
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
        };
        const created = await api.createProject(projectToCreate);
        setProjects([created, ...projects]);
      }
    } catch (err) {
      console.error("Failed to save project:", err);
      alert("Failed to save project. Please try again.");
    }
  };

  const editProject = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const deleteProject = async (projectId) => {
    try {
      await api.deleteProject(projectId);
      setProjects(projects.filter((project) => project._id !== projectId));
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  const filteredProjects =
    selectedCategory === "All"
      ? projects
      : projects.filter((project) => project.category === selectedCategory);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProjects = filteredProjects.slice(startIndex, endIndex);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(0); // Reset to first page when category changes
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  if (loading) {
    return (
      <div className="project-container">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-container">
        <div className="error">{error}</div>
        <button onClick={fetchProjects}>Retry</button>
      </div>
    );
  }

  return (
    <div className="project-container">
      <div className="pro-label">
        <span>BROWSE</span>
      </div>
      <div className="pro-title">
        <h1>Community Projects</h1>
      </div>
      <div className="pro-content">
        <p>
          Discover projects shared by developers from all backgrounds — from AI
          experiments and dashboards to personal tools and creative builds.
        </p>
      </div>
      <div className="search-wrapper">
        <i className="bi bi-search"></i>
        <input
          type="text"
          placeholder="Search projects by title or keyword..."
        />
      </div>

      <div className="button-tech">
        <button
          className={selectedCategory === "All" ? "active" : ""}
          onClick={() => handleCategoryChange("All")}
        >
          All
        </button>
        <button
          className={selectedCategory === "AI" ? "active" : ""}
          onClick={() => handleCategoryChange("AI")}
        >
          AI
        </button>
        <button
          className={selectedCategory === "Technical" ? "active" : ""}
          onClick={() => handleCategoryChange("Technical")}
        >
          Technical
        </button>
        <button
          className={selectedCategory === "Role" ? "active" : ""}
          onClick={() => handleCategoryChange("Role")}
        >
          Role
        </button>
        <button
          className={selectedCategory === "Personal" ? "active" : ""}
          onClick={() => handleCategoryChange("Personal")}
        >
          Personal
        </button>
      </div>
      <div className="button-add">
        <button
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
        >
          <i className="bi bi-plus-lg"></i>
          Add Your Project
        </button>
      </div>

      <Project_list
        projects={currentProjects}
        onDeleteProject={deleteProject}
        onEditProject={editProject}
      />

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn prev"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="page-info">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="pagination-btn next"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onAddProject={addProject}
        editProject={editingProject}
      />
    </div>
  );
}

export default Project;
