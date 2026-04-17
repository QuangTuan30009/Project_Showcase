import React, { useEffect, useMemo, useState } from "react";
import * as api from "../../Services/api";
import "./index.scss";
import DataSetupTab from "./DataSetupTab";
import DataManageTab from "./DataManageTab";

const statusOrder = ["pending", "approved", "rejected"];

const statusMeta = {
  pending: {
    label: "Pending",
    icon: "bi-hourglass-split",
  },
  approved: {
    label: "Approved",
    icon: "bi-check2-circle",
  },
  rejected: {
    label: "Rejected",
    icon: "bi-slash-circle",
  },
};

function formatDate(value) {
  if (!value) return "Not reviewed yet";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProjectStatus(project) {
  return project.moderationStatus || "approved";
}

const validCategories = ["AI", "Technical", "Role", "Personal"];

const createEmptyEditForm = () => ({
  title: "",
  description: "",
  category: "Technical",
  techStack: "",
  githubLink: "",
  liveDemoLink: "",
  image: "",
});

function AdminDashboard({ onBackToSite }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editUploadMethod, setEditUploadMethod] = useState("url");
  const [editForm, setEditForm] = useState(createEmptyEditForm());
  const [editImagePreview, setEditImagePreview] = useState("");
  const [activeTab, setActiveTab] = useState("moderation");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.style.paddingTop = "0px";
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects({ includeHidden: true });
      const sorted = [...data].sort((a, b) => {
        const statusDiff =
          statusOrder.indexOf(getProjectStatus(a)) -
          statusOrder.indexOf(getProjectStatus(b));

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setProjects(sorted);
      setSelectedProjectId((current) => current || sorted[0]?._id || null);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = projects.length;
    const pending = projects.filter(
      (project) => getProjectStatus(project) === "pending",
    ).length;
    const approved = projects.filter(
      (project) => getProjectStatus(project) === "approved",
    ).length;
    const rejected = projects.filter(
      (project) => getProjectStatus(project) === "rejected",
    ).length;

    return { total, pending, approved, rejected };
  }, [projects]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      projects.map((project) => project.category).filter(Boolean),
    );
    return ["All", ...Array.from(uniqueCategories)];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus =
        selectedStatus === "all" ||
        getProjectStatus(project) === selectedStatus;
      const matchesCategory =
        selectedCategory === "All" || project.category === selectedCategory;
      const matchesSearch =
        normalizedSearch === "" ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch) ||
        (Array.isArray(project.techStack) &&
          project.techStack.some((tech) =>
            tech.toLowerCase().includes(normalizedSearch),
          ));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [projects, searchTerm, selectedStatus, selectedCategory]);

  const selectedProject =
    filteredProjects.find((project) => project._id === selectedProjectId) ||
    filteredProjects[0] ||
    null;

  const updateLocalProject = (updatedProject) => {
    setProjects((current) =>
      current
        .map((project) =>
          project._id === updatedProject._id ? updatedProject : project,
        )
        .sort((a, b) => {
          const statusDiff =
            statusOrder.indexOf(getProjectStatus(a)) -
            statusOrder.indexOf(getProjectStatus(b));

          if (statusDiff !== 0) {
            return statusDiff;
          }

          return new Date(b.createdAt) - new Date(a.createdAt);
        }),
    );
  };

  const handleModeration = async (project, moderationStatus) => {
    const note =
      moderationStatus === "rejected"
        ? window.prompt(
            "Enter rejection note (optional)",
            project.moderationNote || "",
          ) || ""
        : moderationStatus === "pending"
          ? window.prompt(
              "Enter review note (optional)",
              project.moderationNote || "",
            ) || ""
          : "";

    try {
      setActionLoadingId(project._id);
      const updated = await api.updateProjectModeration(project._id, {
        moderationStatus,
        moderationNote: note,
      });
      updateLocalProject(updated);
      setSelectedProjectId(updated._id);
    } catch (err) {
      console.error(err);
      alert("Failed to update moderation status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (project) => {
    setEditingProjectId(project._id);
    setEditUploadMethod("url");
    setEditForm({
      title: project.title || "",
      description: project.description || "",
      category: project.category || "Technical",
      techStack: Array.isArray(project.techStack)
        ? project.techStack.join(", ")
        : project.techStack || "",
      githubLink: project.githubLink || "",
      liveDemoLink: project.liveDemoLink || "",
      image: project.image || "",
    });
    setEditImagePreview(project.image || "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProjectId(null);
    setEditForm(createEmptyEditForm());
    setEditImagePreview("");
    setEditUploadMethod("url");
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));

    if (name === "image") {
      setEditImagePreview(value);
    }
  };

  const handleEditFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Image is too large. Please select an image smaller than 5MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setEditForm((current) => ({ ...current, image: base64String }));
      setEditImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingProjectId) {
      return;
    }

    const selectedProjectData = projects.find(
      (project) => project._id === editingProjectId,
    );

    if (!selectedProjectData) {
      alert("Project no longer exists.");
      closeEditModal();
      return;
    }

    if (!validCategories.includes(editForm.category)) {
      alert("Invalid category selected.");
      return;
    }

    const updatedPayload = {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      category: editForm.category,
      techStack: editForm.techStack
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      githubLink: editForm.githubLink.trim(),
      liveDemoLink: editForm.liveDemoLink.trim(),
      image: editForm.image.trim(),
      moderationStatus: getProjectStatus(selectedProjectData),
      moderationNote: selectedProjectData.moderationNote || "",
    };

    if (!updatedPayload.title || !updatedPayload.description) {
      alert("Title and description cannot be empty.");
      return;
    }

    try {
      setActionLoadingId(editingProjectId);
      const updated = await api.updateProject(editingProjectId, updatedPayload);
      updateLocalProject(updated);
      setSelectedProjectId(updated._id);
      closeEditModal();
      alert("Project updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to update project.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditProject = (project) => {
    openEditModal(project);
  };

  const handleDeleteProject = async (project) => {
    const Swal = window.Swal;

    if (!Swal) {
      const fallbackConfirmed = window.confirm(
        `Delete project \"${project.title}\"? This action cannot be undone.`,
      );
      if (!fallbackConfirmed) {
        return;
      }
    }

    const swalWithBootstrapButtons = Swal
      ? Swal.mixin({
          customClass: {
            confirmButton: "btn btn-success",
            cancelButton: "btn btn-danger",
          },
          buttonsStyling: false,
        })
      : null;

    if (swalWithBootstrapButtons) {
      const result = await swalWithBootstrapButtons.fire({
        title: "Bạn chắc chắn muốn xóa?",
        text: `${project.title} sẽ bị xóa vĩnh viễn!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Có, xóa luôn!",
        cancelButtonText: "Không, giữ lại",
        reverseButtons: true,
      });

      if (!result.isConfirmed) {
        if (result.dismiss === Swal.DismissReason.cancel) {
          await swalWithBootstrapButtons.fire({
            title: "Đã hủy",
            text: "Project vẫn an toàn.",
            icon: "info",
          });
        }
        return;
      }
    }

    try {
      setActionLoadingId(project._id);
      await api.deleteProject(project._id);
      setProjects((current) =>
        current.filter((item) => item._id !== project._id),
      );

      setSelectedProjectId((currentId) => {
        if (currentId !== project._id) {
          return currentId;
        }

        const next = filteredProjects.find((item) => item._id !== project._id);
        return next?._id || null;
      });

      if (swalWithBootstrapButtons) {
        await swalWithBootstrapButtons.fire({
          title: "Đã xóa!",
          text: "Project đã được xóa khỏi hệ thống.",
          icon: "success",
        });
      }
    } catch (err) {
      console.error(err);
      if (swalWithBootstrapButtons) {
        await swalWithBootstrapButtons.fire({
          title: "Không thể xóa",
          text: "Đã có lỗi xảy ra, vui lòng thử lại.",
          icon: "error",
        });
      } else {
        alert("Failed to delete project.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-dashboard-shell">
      <div className="admin-glow admin-glow-one" />
      <div className="admin-glow admin-glow-two" />

      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">Hidden moderation desk</p>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">
            Review, approve, and triage submissions without exposing a public
            login screen.
          </p>
        </div>

        <div className="admin-topbar-actions">
          <button type="button" className="ghost-btn" onClick={fetchProjects}>
            <i className="bi bi-arrow-clockwise" />
            Refresh
          </button>
          <button type="button" className="back-btn" onClick={onBackToSite}>
            <i className="bi bi-box-arrow-left" />
            Back to site
          </button>
        </div>
      </header>

      <div className="admin-tabs-nav" style={{ padding: '0 2rem 1.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          className={`ghost-btn ${activeTab === 'moderation' ? 'active-tab' : ''}`} 
          style={{ background: activeTab === 'moderation' ? 'rgba(0, 212, 255, 0.15)' : 'transparent', border: activeTab === 'moderation' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent' }}
          onClick={() => setActiveTab('moderation')}
        >
          <i className="bi bi-shield-check" /> Moderation
        </button>
        <button 
          className={`ghost-btn ${activeTab === 'data-setup' ? 'active-tab' : ''}`} 
          style={{ background: activeTab === 'data-setup' ? 'rgba(0, 212, 255, 0.15)' : 'transparent', border: activeTab === 'data-setup' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent' }}
          onClick={() => setActiveTab('data-setup')}
        >
          <i className="bi bi-gear" /> Data Setup
        </button>
        <button 
          className={`ghost-btn ${activeTab === 'data-manage' ? 'active-tab' : ''}`} 
          style={{ background: activeTab === 'data-manage' ? 'rgba(0, 212, 255, 0.15)' : 'transparent', border: activeTab === 'data-manage' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent' }}
          onClick={() => setActiveTab('data-manage')}
        >
          <i className="bi bi-database" /> Data Manage
        </button>
      </div>

      {activeTab === "moderation" && (
        <>
          <section className="admin-stats-grid">
        <article className="stat-card accent">
          <span>Total</span>
          <strong>{stats.total}</strong>
          <small>submissions in queue</small>
        </article>
        <article className="stat-card warning">
          <span>Pending</span>
          <strong>{stats.pending}</strong>
          <small>waiting for review</small>
        </article>
        <article className="stat-card success">
          <span>Approved</span>
          <strong>{stats.approved}</strong>
          <small>visible to public</small>
        </article>
        <article className="stat-card danger">
          <span>Rejected</span>
          <strong>{stats.rejected}</strong>
          <small>closed or blocked</small>
        </article>
      </section>

      <section className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="panel-card">
            <div className="panel-header">
              <h2>Filters</h2>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStatus("pending");
                  setSelectedCategory("All");
                }}
              >
                Reset
              </button>
            </div>

            <label className="field-label">Search</label>
            <div className="search-box">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Title, tech, description..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <label className="field-label">Status</label>
            <div className="chip-list">
              {["pending", "all", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`chip ${selectedStatus === status ? "active" : ""}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === "all" ? "All" : statusMeta[status].label}
                </button>
              ))}
            </div>

            <label className="field-label">Category</label>
            <div className="chip-list categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`chip ${selectedCategory === category ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="sidebar-note">
              <i className="bi bi-shield-lock" />
              <p>
                This route is hidden by URL only. Keep the backend moderation
                checks enabled for real protection.
              </p>
            </div>
          </div>
        </aside>

        <main className="admin-queue">
          <div className="panel-card queue-header">
            <div>
              <h2>Submission Queue</h2>
              <p>{filteredProjects.length} item(s) match your filters.</p>
            </div>
            <div className="queue-pill">
              <i className="bi bi-stars" />
              Dark review mode
            </div>
          </div>

          {loading ? (
            <div className="panel-card empty-state">
              Loading moderation queue...
            </div>
          ) : error ? (
            <div className="panel-card empty-state error-state">
              <p>{error}</p>
              <button
                type="button"
                className="back-btn"
                onClick={fetchProjects}
              >
                Try again
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="panel-card empty-state">
              <i className="bi bi-inbox" />
              <h3>No results</h3>
              <p>Try loosening the filters to inspect more submissions.</p>
            </div>
          ) : (
            <div className="queue-list">
              {filteredProjects.map((project) => {
                const status = getProjectStatus(project);
                const isSelected = project._id === selectedProject?._id;

                return (
                  <article
                    key={project._id}
                    className={`queue-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedProjectId(project._id)}
                  >
                    <img
                      src={project.image}
                      alt={project.title}
                      className="queue-thumb"
                    />

                    <div className="queue-content">
                      <div className="queue-row">
                        <div>
                          <h3>{project.title}</h3>
                          <p>{project.category}</p>
                        </div>
                        <span className={`status-badge ${status}`}>
                          <i className={`bi ${statusMeta[status].icon}`} />
                          {statusMeta[status].label}
                        </span>
                      </div>

                      <p className="queue-description">{project.description}</p>

                      <div className="tech-stack-list">
                        {(project.techStack || []).slice(0, 4).map((tech) => (
                          <span key={tech}>{tech}</span>
                        ))}
                      </div>

                      <div className="queue-meta">
                        <span>
                          <i className="bi bi-calendar3" />
                          {formatDate(project.createdAt)}
                        </span>
                        <span>
                          <i className="bi bi-journal-text" />
                          {project.moderationNote || "No review note"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <aside className="admin-inspector">
          <div className="panel-card inspector-card">
            {selectedProject ? (
              <>
                <div className="inspector-hero">
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                  />
                  <div className="inspector-overlay">
                    <span
                      className={`status-badge ${getProjectStatus(selectedProject)}`}
                    >
                      <i
                        className={`bi ${statusMeta[getProjectStatus(selectedProject)].icon}`}
                      />
                      {statusMeta[getProjectStatus(selectedProject)].label}
                    </span>
                    <h2>{selectedProject.title}</h2>
                    <p>{selectedProject.category}</p>
                  </div>
                </div>

                <div className="inspector-body">
                  <div className="info-block">
                    <label>Description</label>
                    <p>{selectedProject.description}</p>
                  </div>

                  <div className="info-grid">
                    <div>
                      <label>Created</label>
                      <p>{formatDate(selectedProject.createdAt)}</p>
                    </div>
                    <div>
                      <label>Reviewed</label>
                      <p>{formatDate(selectedProject.reviewedAt)}</p>
                    </div>
                  </div>

                  <div className="info-block">
                    <label>Tech Stack</label>
                    <div className="tech-stack-list">
                      {(selectedProject.techStack || []).map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                    </div>
                  </div>

                  <div className="info-links">
                    {selectedProject.githubLink ? (
                      <a
                        href={selectedProject.githubLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="bi bi-github" />
                        GitHub
                      </a>
                    ) : null}
                    {selectedProject.liveDemoLink ? (
                      <a
                        href={selectedProject.liveDemoLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="bi bi-box-arrow-up-right" />
                        Live Demo
                      </a>
                    ) : null}
                  </div>

                  <div className="moderation-note">
                    <label>Moderator note</label>
                    <p>{selectedProject.moderationNote || "No note yet."}</p>
                  </div>

                  <div className="action-grid">
                    <button
                      type="button"
                      className="action-btn edit"
                      disabled={actionLoadingId === selectedProject._id}
                      onClick={() => handleEditProject(selectedProject)}
                    >
                      <i className="bi bi-pencil-square" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="action-btn delete"
                      disabled={actionLoadingId === selectedProject._id}
                      onClick={() => handleDeleteProject(selectedProject)}
                    >
                      <i className="bi bi-trash3" />
                      Delete
                    </button>
                    <button
                      type="button"
                      className="action-btn approve"
                      disabled={actionLoadingId === selectedProject._id}
                      onClick={() =>
                        handleModeration(selectedProject, "approved")
                      }
                    >
                      <i className="bi bi-check2" />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="action-btn reject"
                      disabled={actionLoadingId === selectedProject._id}
                      onClick={() =>
                        handleModeration(selectedProject, "rejected")
                      }
                    >
                      <i className="bi bi-x-lg" />
                      Reject
                    </button>
                    <button
                      type="button"
                      className="action-btn neutral"
                      disabled={actionLoadingId === selectedProject._id}
                      onClick={() =>
                        handleModeration(selectedProject, "pending")
                      }
                    >
                      <i className="bi bi-hourglass-split" />
                      Mark Pending
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state inspector-empty">
                <i className="bi bi-cursor" />
                <h3>Select a submission</h3>
                <p>Pick a card from the queue to inspect it here.</p>
              </div>
            )}
          </div>
        </aside>
      </section>
      </>
      )}

      {activeTab === "data-setup" && (
        <div style={{ padding: '0 2rem 2rem' }}>
          <DataSetupTab />
        </div>
      )}

      {activeTab === "data-manage" && (
        <div style={{ padding: '0 2rem 2rem' }}>
          <DataManageTab />
        </div>
      )}

      {isEditModalOpen ? (
        <div className="admin-edit-overlay" onClick={closeEditModal}>
          <div
            className="admin-edit-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="admin-edit-close"
              onClick={closeEditModal}
            >
              <i className="bi bi-x-lg" />
            </button>

            <div className="admin-edit-header">
              <p>Moderation Editor</p>
              <h2>Edit Project</h2>
            </div>

            <form className="admin-edit-form" onSubmit={handleEditSubmit}>
              <div className="admin-edit-field image-field">
                <label>Project Image</label>
                <div className="upload-tabs">
                  <button
                    type="button"
                    className={editUploadMethod === "url" ? "active" : ""}
                    onClick={() => setEditUploadMethod("url")}
                  >
                    <i className="bi bi-link-45deg" /> URL
                  </button>
                  <button
                    type="button"
                    className={editUploadMethod === "file" ? "active" : ""}
                    onClick={() => setEditUploadMethod("file")}
                  >
                    <i className="bi bi-upload" /> Upload
                  </button>
                </div>

                {editUploadMethod === "url" ? (
                  <input
                    type="url"
                    name="image"
                    value={editForm.image}
                    onChange={handleEditInputChange}
                    placeholder="https://example.com/image.jpg"
                  />
                ) : (
                  <label className="admin-file-upload">
                    <i className="bi bi-cloud-upload" />
                    Choose image file
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileUpload}
                    />
                  </label>
                )}

                {editImagePreview ? (
                  <div className="admin-image-preview">
                    <img src={editImagePreview} alt="Preview" />
                    <button
                      type="button"
                      onClick={() => {
                        setEditImagePreview("");
                        setEditForm((current) => ({ ...current, image: "" }));
                      }}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="admin-edit-field">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="admin-edit-field">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditInputChange}
                  rows="4"
                  required
                />
              </div>

              <div className="admin-edit-field">
                <label>Category</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditInputChange}
                >
                  {validCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-edit-field">
                <label>Tech Stack (comma separated)</label>
                <input
                  type="text"
                  name="techStack"
                  value={editForm.techStack}
                  onChange={handleEditInputChange}
                  placeholder="React, Node.js, MongoDB"
                />
              </div>

              <div className="admin-edit-row">
                <div className="admin-edit-field">
                  <label>GitHub Link</label>
                  <input
                    type="url"
                    name="githubLink"
                    value={editForm.githubLink}
                    onChange={handleEditInputChange}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="admin-edit-field">
                  <label>Live Demo Link</label>
                  <input
                    type="url"
                    name="liveDemoLink"
                    value={editForm.liveDemoLink}
                    onChange={handleEditInputChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="admin-edit-actions">
                <button
                  type="button"
                  className="cancel"
                  onClick={closeEditModal}
                >
                  <i className="bi bi-x-lg" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save"
                  disabled={actionLoadingId === editingProjectId}
                >
                  <i className="bi bi-check2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
