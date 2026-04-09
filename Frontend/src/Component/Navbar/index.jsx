import React, { useState } from "react";
import "./index.scss";
function Navbar({
  onHome,
  onProject,
  onAbout,
  onData,
  isDarkMode,
  onToggleTheme,
  variant = "default",
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (callback) => {
    if (typeof callback === "function") {
      callback();
    }
    setIsMenuOpen(false);
  };

  return (
    <div>
      <div
        className={`navbar-container${variant === "data-ops" ? " data-ops" : ""}`}
      >
        <div className="navbar_logo">
          <i className="fa-solid fa-code"></i>
          <h2>ProjectShowcase</h2>
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
            <li
              onClick={() => handleMenuClick(onData)}
              style={{ cursor: "pointer" }}
            >
              Data
            </li>
          </ul>
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <i className="bi bi-sun-fill"></i>
            ) : (
              <i className="bi bi-moon-stars-fill"></i>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
