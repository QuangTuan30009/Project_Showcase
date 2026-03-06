import React from "react";
import "./index.scss";
import Project_list from "./Project-list";
function Project() {
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
        <button>All</button>
        <button>AI</button>
        <button>Technical</button>
        <button>Role</button>
        <button>Personal</button>
      </div>
      <div className="button-add">
        <button>
          <i className="bi bi-plus-lg"></i>
          Add Your Project
        </button>
      </div>

      <Project_list />
    </div>
  );
}

export default Project;
