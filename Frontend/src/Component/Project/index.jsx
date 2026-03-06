import React, { useState } from "react";
import "./index.scss";
import Project_list from "./Project-list";
import AddProjectModal from "./AddProjectModal";

function Project() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6; // 2 rows x 3 columns

  const [projects, setProjects] = useState([
    {
      id: 1,
      title: "AI Chat Assistant",
      description:
        "A conversational AI chatbot built with OpenAI's API, featuring real-time streaming responses and context-aware dialogue.",
      category: "AI",
      techStack: ["React", "Next.js", "OpenAI", "Tailwind CSS"],
      image:
        "https://www.ilink-digital.com/wp-content/uploads/2023/05/Conversation-between-chat-bot-on-screen-of-phone-and-customer-scaled.jpg",
      githubLink: "",
      liveDemoLink: "",
    },
    {
      id: 2,
      title: "Analytics Dashboard",
      description:
        "A comprehensive analytics dashboard with real-time data visualization, custom charts, and interactive reporting tools.",
      category: "Technical",
      techStack: ["React", "D3.js", "Node.js", "MongoDB"],
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
      githubLink: "",
      liveDemoLink: "",
    },
    {
      id: 3,
      title: "E-commerce Platform",
      description:
        "A modern online shopping platform with cart management, payment integration, and order tracking capabilities.",
      category: "Technical",
      techStack: ["Vue.js", "Stripe", "PostgreSQL", "SCSS"],
      image:
        "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
      githubLink: "",
      liveDemoLink: "",
    },
    {
      id: 4,
      title: "Task Manager App",
      description:
        "A collaborative task management app with drag-and-drop interface, team collaboration, and deadline tracking.",
      category: "Personal",
      techStack: ["React", "Firebase", "Material-UI"],
      image:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
      githubLink: "",
      liveDemoLink: "",
    },
    {
      id: 5,
      title: "Online Code Editor",
      description:
        "A browser-based code editor with syntax highlighting, live preview, and multi-language support.",
      category: "Technical",
      techStack: ["TypeScript", "Monaco Editor", "Express"],
      image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800",
      githubLink: "",
      liveDemoLink: "",
    },
    {
      id: 6,
      title: "Music Streaming App",
      description:
        "A beautiful music streaming application with playlist management, audio visualization, and social sharing features.",
      category: "Personal",
      techStack: ["React Native", "Spotify API", "Redux"],
      image:
        "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800",
      githubLink: "",
      liveDemoLink: "",
    },
  ]);

  const addProject = (newProjectData) => {
    if (editingProject) {
      // Edit existing project
      setProjects(
        projects.map((project) =>
          project.id === editingProject.id
            ? {
                ...project,
                ...newProjectData,
                techStack: newProjectData.techStack
                  .split(",")
                  .map((tech) => tech.trim()),
                image: newProjectData.image || project.image,
              }
            : project,
        ),
      );
      setEditingProject(null);
    } else {
      // Add new project
      const newProject = {
        id: projects.length + 1,
        ...newProjectData,
        techStack: newProjectData.techStack
          .split(",")
          .map((tech) => tech.trim()),
        image:
          newProjectData.image ||
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
      };
      setProjects([newProject, ...projects]);
    }
  };

  const editProject = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const deleteProject = (projectId) => {
    setProjects(projects.filter((project) => project.id !== projectId));
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
