import { useState, useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Navbar from "./Component/Navbar";
import Hero_section from "./Component/Hero-section";
import About from "./Component/About";

function App() {
  const homeref = useRef(null);
  const projectref = useRef(null);
  const aboutref = useRef(null);

  return (
    <div>
      <Navbar
        onHome={() => homeref.current.scrollIntoView({ behavior: "smooth" })}
        onProject={() =>
          projectref.current.scrollIntoView({ behavior: "smooth" })
        }
        onAbout={() => aboutref.current.scrollIntoView({ behavior: "smooth" })}
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
        <h2 style={{ padding: "100px", textAlign: "center" }}>
          Projects Section
        </h2>
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
