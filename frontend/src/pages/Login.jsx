import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogoIcon, MailIcon, LockIcon } from '../components/Icons';
import { Spinner } from '../components/Loader';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon-wrap">
            <BrandLogoIcon size={36} />
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-dark)', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
            Stock<span style={{ color: 'var(--primary-color)' }}>Pilot</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Enterprise Inventory & Warehouse Management
          </p>
        </div>

        {errorMsg && (
          <div className="alert-bar error" style={{ margin: '0 0 1rem 0' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-icon-group">
              <span className="input-icon-left">
                <MailIcon style={{ width: '18px', height: '18px' }} />
              </span>
              <input
                type="email"
                className="form-input has-left-icon"
                placeholder="e.g. admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
            </div>
            <div className="input-icon-group">
              <span className="input-icon-left">
                <LockIcon style={{ width: '18px', height: '18px' }} />
              </span>
              <input
                type="password"
                className="form-input has-left-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-with-spinner"
            style={{ width: '100%', padding: '0.8rem', justifyContent: 'center', marginTop: '0.5rem', fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size={18} color="#ffffff" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign In to Portal'
            )}
          </button>
        </form>

        {/* Interactive Quick-Fill Demo Credentials */}
        <div className="login-demo-badge">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Demo Credentials:</span>
            <button
              type="button"
              onClick={() => fillDemoCreds('admin@example.com', 'Admin@123')}
              style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'underline' }}
            >
              Auto-fill Admin
            </button>
          </div>
          <div>Admin: <strong>admin@example.com</strong></div>
          <div>Password: <strong>Admin@123</strong></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
