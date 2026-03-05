import { useRef } from "react";
import "./App.css";
import Navbar from "./Component/Navbar";
import Hero_section from "./Component/Hero-section";
import About from "./Component/About";
import Project from "./Component/Project";

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
