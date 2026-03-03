import React from "react";
import "./index.scss";
function Hero_section({ onProject }) {
  return (
    <div className="hero-container">
      <p className="p-intro">Community Project Gallery</p>
      <h1 className="title">Showcase Your Best Work</h1>
      <p className="p-descrip">
        A place for developers to share their projects, discover inspiring work
        from the community, and connect with fellow builders around the world.
      </p>
      <div className="button">
        <button onClick={onProject} className="button-explore">
          <i className="bi bi-rocket-takeoff-fill"></i>
          Explore Projects
        </button>
        <button className="button-community">
          <i className="bi bi-people-fill"></i>
          Join the Community
        </button>
      </div>
    </div>
  );
}

export default Hero_section;
