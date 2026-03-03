import React from "react";
import "./index.scss";
function About() {
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
        <button className="btn-1">
          <i className="bi bi-chat-dots-fill"></i>
          Share your Project
        </button>
        <button className="btn-2">
          <i className="bi bi-github"></i>
          View on Github
        </button>
      </div>
    </div>
  );
}

export default About;
