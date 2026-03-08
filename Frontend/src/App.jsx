import { useRef, useState, useEffect } from "react";
import "./App.css";
import Navbar from "./Component/Navbar";
import Hero_section from "./Component/Hero-section";
import About from "./Component/About";
import Project from "./Component/Project";

function App() {
  const homeref = useRef(null);
  const projectref = useRef(null);
  const aboutref = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div>
      <Navbar
        onHome={() => homeref.current.scrollIntoView({ behavior: "smooth" })}
        onProject={() =>
          projectref.current.scrollIntoView({ behavior: "smooth" })
        }
        onAbout={() => aboutref.current.scrollIntoView({ behavior: "smooth" })}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      <div ref={homeref}>
        <Hero_section
          onProject={() =>
            projectref.current.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
      <div ref={projectref}>
        {/* Project section sẽ ở đây */}
        <h2 style={{ padding: "50px", textAlign: "center" }}>
        </h2>
      </div>

      <Project />
      <div ref={aboutref}>
        <About
          onProject={() =>
            projectref.current.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
    </div>
  );
}

export default App;
