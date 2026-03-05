import React from "react";
import "./index.scss";
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
    </div>
  );
}

export default Project;
