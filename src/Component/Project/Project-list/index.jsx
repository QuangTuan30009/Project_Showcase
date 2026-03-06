import React from "react";
import "./index.scss";

function Project_list() {
  return (
    <div className="pro-list-container">
      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://www.ilink-digital.com/wp-content/uploads/2023/05/Conversation-between-chat-bot-on-screen-of-phone-and-customer-scaled.jpg"
              alt="Screenshot of AI Chat Assistant"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>AI Chat Assistant</h3>
            </div>
            <div className="desp-art">
              <p>
                A conversational AI chatbot built with OpenAI's API, featuring
                real-time streaming responses and context-aware dialogue.
              </p>
            </div>
            <div className="category-art">
              <span>React</span>
              <span>Next.js</span>
              <span>OpenAI</span>
              <span>Tailwind CSS</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>

      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"
              alt="Analytics Dashboard"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>Analytics Dashboard</h3>
            </div>
            <div className="desp-art">
              <p>
                A comprehensive analytics dashboard with real-time data
                visualization, custom charts, and interactive reporting tools.
              </p>
            </div>
            <div className="category-art">
              <span>React</span>
              <span>D3.js</span>
              <span>Node.js</span>
              <span>MongoDB</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>

      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800"
              alt="E-commerce Platform"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>E-commerce Platform</h3>
            </div>
            <div className="desp-art">
              <p>
                A modern online shopping platform with cart management, payment
                integration, and order tracking capabilities.
              </p>
            </div>
            <div className="category-art">
              <span>Vue.js</span>
              <span>Stripe</span>
              <span>PostgreSQL</span>
              <span>SCSS</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>

      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"
              alt="Task Manager App"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>Task Manager App</h3>
            </div>
            <div className="desp-art">
              <p>
                A collaborative task management app with drag-and-drop
                interface, team collaboration, and deadline tracking.
              </p>
            </div>
            <div className="category-art">
              <span>React</span>
              <span>Firebase</span>
              <span>Material-UI</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>

      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800"
              alt="Code Editor"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>Online Code Editor</h3>
            </div>
            <div className="desp-art">
              <p>
                A browser-based code editor with syntax highlighting, live
                preview, and multi-language support.
              </p>
            </div>
            <div className="category-art">
              <span>TypeScript</span>
              <span>Monaco Editor</span>
              <span>Express</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>

      <div className="pro-card">
        <article>
          <div className="img-artical">
            <img
              src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800"
              alt="Music Player"
            />
          </div>
          <div className="content-artical">
            <div className="title-art">
              <h3>Music Streaming App</h3>
            </div>
            <div className="desp-art">
              <p>
                A beautiful music streaming application with playlist
                management, audio visualization, and social sharing features.
              </p>
            </div>
            <div className="category-art">
              <span>React Native</span>
              <span>Spotify API</span>
              <span>Redux</span>
            </div>
            <div className="button-art">
              <a href="">
                <i className="bi bi-github"></i>
                Code
              </a>
              <a href="">
                <i className="bi bi-box-arrow-up-right"></i>
                Live Demo
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default Project_list;
