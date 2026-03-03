import React, { useState } from "react";
import "./index.scss";
function Navbar({ onHome, onProject, onAbout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (callback) => {
    callback();
    setIsMenuOpen(false);
  };

  return (
    <div>
      <div className="navbar-container">
        <div className="navbar_logo">
          <i className="fa-solid fa-code"></i>
          <h2>Project Showcase</h2>
        </div>
        <div className="navbar_menu">
          <ul className="navbar_menu_list">
            <li
              onClick={() => handleMenuClick(onHome)}
              style={{ cursor: "pointer" }}
            >
              Home
            </li>
            <li
              onClick={() => handleMenuClick(onProject)}
              style={{ cursor: "pointer" }}
            >
              Projects
            </li>
            <li
              onClick={() => handleMenuClick(onAbout)}
              style={{ cursor: "pointer" }}
            >
              About
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
