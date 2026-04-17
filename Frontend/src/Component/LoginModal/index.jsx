import React, { useState, useEffect, useRef } from 'react';
import { loginAdmin } from '../../Services/api';
import './index.scss';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await loginAdmin(username, password);
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <div className="admin-glow login-glow"></div>
          <i className="bi bi-shield-lock-fill login-icon"></i>
          <h2>Admin Authentication</h2>
          <p>Please enter your credentials to access the hidden dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-modal-form">
          {error && <div className="login-error"><i className="bi bi-exclamation-triangle"></i> {error}</div>}
          
          <div className="login-field">
            <label>Username</label>
            <div className="login-input-wrap">
              <i className="bi bi-person"></i>
              <input 
                ref={usernameRef}
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="admin"
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <i className="bi bi-key"></i>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? <i className="bi bi-arrow-repeat spin"></i> : <i className="bi bi-box-arrow-in-right"></i>}
            {loading ? 'Authenticating...' : 'Login to Dashboard'}
          </button>
        </form>
        
        <button className="login-close-btn" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  );
}
