import React from "react";
import "./index.scss";

function Project_list({ projects, onDeleteProject, onEditProject }) {
  return (
    <div className="pro-list-container">
      {projects.map((project) => (
        <div className="pro-card" key={project._id}>
          <article>
            <div className="action-buttons">
              <button
                className="edit-btn"
                onClick={() => onEditProject(project)}
                title="Edit project"
              >
                <i className="bi bi-pencil"></i>
              </button>
              <button
                className="delete-btn"
                onClick={() => onDeleteProject(project._id)}
                title="Delete project"
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
            <div className="img-artical">
              <img src={project.image} alt={project.title} />
            </div>
            <div className="content-artical">
              <div className="title-art">
                <h3>{project.title}</h3>
                <span className="category-badge">{project.category}</span>
              </div>
              <div className="desp-art">
                <p>{project.description}</p>
              </div>
              <div className="category-art">
                {project.techStack.map((tech, index) => (
                  <span key={index}>{tech}</span>
                ))}
              </div>
              <div className="button-art">
                <a href={project.githubLink || "#"}>
                  <i className="bi bi-github"></i>
                  Code
                </a>
                <a href={project.liveDemoLink || "#"}>
                  <i className="bi bi-box-arrow-up-right"></i>
                  Live Demo
                </a>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}

export default Project_list;
