import React, { useState, useEffect } from "react";
import "./index.scss";

function AddProjectModal({ isOpen, onClose, onAddProject, editProject }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Technical",
    techStack: "",
    githubLink: "",
    liveDemoLink: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState("");
  const [uploadMethod, setUploadMethod] = useState("url"); // "url" or "file"

  useEffect(() => {
    if (editProject) {
      setFormData({
        ...editProject,
        techStack: Array.isArray(editProject.techStack)
          ? editProject.techStack.join(", ")
          : editProject.techStack,
      });
      setImagePreview(editProject.image || "");
    } else {
      setFormData({
        title: "",
        description: "",
        category: "Technical",
        techStack: "",
        githubLink: "",
        liveDemoLink: "",
        image: "",
      });
      setImagePreview("");
    }
  }, [editProject, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "image") {
      setImagePreview(value);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData((prev) => ({
          ...prev,
          image: base64String,
        }));
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddProject(formData);
    // Reset form
    setFormData({
      title: "",
      description: "",
      category: "Technical",
      techStack: "",
      githubLink: "",
      liveDemoLink: "",
      image: "",
    });
    setImagePreview("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <h2>{editProject ? "Edit Project" : "Add New Project"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group image-upload-section">
            <label>Project Image</label>

            <div className="upload-tabs">
              <button
                type="button"
                className={uploadMethod === "url" ? "active" : ""}
                onClick={() => setUploadMethod("url")}
              >
                <i className="bi bi-link-45deg"></i> URL
              </button>
              <button
                type="button"
                className={uploadMethod === "file" ? "active" : ""}
                onClick={() => setUploadMethod("file")}
              >
                <i className="bi bi-upload"></i> Upload
              </button>
            </div>

            {uploadMethod === "url" ? (
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <label htmlFor="file-upload" className="file-upload-btn">
                  <i className="bi bi-cloud-upload"></i>
                  Choose Image
                </label>
              </div>
            )}

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => {
                    setImagePreview("");
                    setFormData((prev) => ({ ...prev, image: "" }));
                  }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="A brief description of your project..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="Technical">Technical</option>
              <option value="Creative">Creative</option>
              <option value="Business">Business</option>
              <option value="Educational">Educational</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Tech Stack <span className="label-hint">(comma separated)</span>
            </label>
            <input
              type="text"
              name="techStack"
              value={formData.techStack}
              onChange={handleChange}
              placeholder="React, Next.js, Tailwind CSS"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GitHub Link</label>
              <input
                type="url"
                name="githubLink"
                value={formData.githubLink}
                onChange={handleChange}
                placeholder="https://github.com/..."
              />
            </div>

            <div className="form-group">
              <label>Live Demo Link</label>
              <input
                type="url"
                name="liveDemoLink"
                value={formData.liveDemoLink}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              <i className={`bi bi-${editProject ? "check" : "plus"}-lg`}></i>
              {editProject ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProjectModal;
