import { useRef, useState, useEffect } from "react";
import "./App.css";
import Navbar from "./Component/Navbar";
import Hero_section from "./Component/Hero-section";
import About from "./Component/About";
import Project from "./Component/Project";
import AdminDashboard from "./Component/AdminDashboard";
import DataPage from "./Component/Data";
import LoginModal from "./Component/LoginModal";

function App() {
  const SECRET_ADMIN_CODE = "wsad";
  const pathname = window.location.pathname;
  const isAdminRoute = pathname === "/admin-dashboard-hidden";
  const isDataRoute = pathname === "/data";
  const homeref = useRef(null);
  const projectref = useRef(null);
  const aboutref = useRef(null);
  const keyBufferRef = useRef("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);


  useEffect(() => {
    if (isAdminRoute) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.style.paddingTop = "0px";
      return;
    }

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    document.body.style.paddingTop = "70px";
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const handleKeydown = (event) => {
      // Allow shortcut Ctrl + Shift + A
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShowLoginModal(true);
        return;
      }

      // Ignore other modifiers
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
        return;
      }

      // Listen for "wsad" sequence
      keyBufferRef.current =
        `${keyBufferRef.current}${event.key.toLowerCase()}`.slice(
          -SECRET_ADMIN_CODE.length,
        );

      if (keyBufferRef.current === SECRET_ADMIN_CODE) {
        setShowLoginModal(true);
        keyBufferRef.current = ""; // Reset buffer
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isAdminRoute]);

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

  if (isAdminRoute) {
    return (
      <AdminDashboard
        onBackToSite={() => {
          window.history.pushState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  if (isDataRoute) {
    return (
      <div>
        <Navbar
          onHome={() => window.location.assign("/")}
          onProject={() => window.location.assign("/")}
          onAbout={() => window.location.assign("/")}
          onData={() => {}}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          variant="data-ops"
        />
        <DataPage />
      </div>
    );
  }

  return (
    <div>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onSuccess={() => {
          setShowLoginModal(false);
          window.location.assign("/admin-dashboard-hidden");
        }} 
      />
      <Navbar
        onHome={() => homeref.current.scrollIntoView({ behavior: "smooth" })}
        onProject={() =>
          projectref.current.scrollIntoView({ behavior: "smooth" })
        }
        onAbout={() => aboutref.current.scrollIntoView({ behavior: "smooth" })}
        onData={() => window.location.assign("/data")}
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
        <Project />
      </div>
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
