import React from "react";
import "./index.scss";
function About({ onProject }) {
  return (
    <div className="about_container">
      <p className="abt-intro">ABOUT</p>
      <h2 className="abt-title">Built for the Community</h2>
      <p className="abt-descrip">
        ProjectShowcase is an open platform where developers can share their
        work, get feedback, and find inspiration. Whether you're a beginner or a
        seasoned pro, your project belongs here.
      </p>
      <div className="button">
        <button onClick={onProject} className="btn-1">
          <i className="bi bi-chat-dots-fill"></i>
          Share your Project
        </button>
        <a
          className="btn-2"
          href="https://github.com/QuangTuan30009/Project_Showcase"
          target="_blank"
        >
          <i className="bi bi-github"></i>
          View on Github
        </a>
      </div>
    </div>
  );
}

export default About;
