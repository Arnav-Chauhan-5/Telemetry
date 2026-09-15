import { useState, useEffect, useCallback } from "react";
import "./App.css";

const API = "http://localhost:4000";
const TOKEN_KEY = "telemetry_token";

function formatRelativeTime(dateString) {
  if (!dateString) return "—";
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function App() {
  /* ── Health check state ──────────────────────────────────────── */
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);

  /* ── Auth state ──────────────────────────────────────────────── */
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(
    () => !!localStorage.getItem(TOKEN_KEY),
  );

  /* ── Auth form fields ────────────────────────────────────────── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);

  /* ── Services state ──────────────────────────────────────────── */
  const [services, setServices] = useState([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcError, setSvcError] = useState(null);

  /* ── Status polling state ────────────────────────────────────── */
  const [statuses, setStatuses] = useState({});

  /* ── Add-service form fields ─────────────────────────────────── */
  const [svcName, setSvcName] = useState("");
  const [svcUrl, setSvcUrl] = useState("");
  const [svcInterval, setSvcInterval] = useState("");
  const [addingSvc, setAddingSvc] = useState(false);

  /* ── Fetch health on mount ───────────────────────────────────── */
  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch(() => setHealthError("Could not reach server"));
  }, []);

  /* ── Fetch /auth/me whenever token changes ───────────────────── */
  useEffect(() => {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setAuthChecking(false);
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => {
        setUser(null);
        setToken(null);
        setAuthError("Session expired — please log in again");
      })
      .finally(() => setAuthChecking(false));
  }, [token]);

  /* ── Fetch services when user is set ─────────────────────────── */
  const fetchServices = useCallback(async () => {
    if (!token) return;
    setSvcLoading(true);
    setSvcError(null);
    try {
      const res = await fetch(`${API}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load services");
      const data = await res.json();
      setServices(data);
    } catch {
      setSvcError("Could not load services");
    } finally {
      setSvcLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) fetchServices();
  }, [user, fetchServices]);

  /* ── Poll service statuses ─────────────────────────────────────── */
  useEffect(() => {
    if (!token || !user || services.length === 0) return;

    let mounted = true;
    
    async function fetchStatus(id) {
      try {
        const res = await fetch(`${API}/services/${id}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && mounted) {
          const data = await res.json();
          setStatuses((prev) => ({ ...prev, [id]: data }));
        }
      } catch (e) {
        // ignore network errors for polling
      }
    }

    // Initial fetch for all
    services.forEach(svc => fetchStatus(svc._id));

    // Poll every 10 seconds
    const interval = setInterval(() => {
      services.forEach(svc => fetchStatus(svc._id));
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token, user, services]);

  /* ── Auth submit (signup or login) ───────────────────────────── */
  async function handleAuth(e) {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/signup";

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || `Request failed (${res.status})`);
        return;
      }

      setToken(data.token);
      setAuthSuccess(isLogin ? "Logged in!" : "Account created!");
      setEmail("");
      setPassword("");
    } catch {
      setAuthError("Could not reach server");
    } finally {
      setAuthLoading(false);
    }
  }

  /* ── Logout ──────────────────────────────────────────────────── */
  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setServices([]);
    setStatuses({});
    setAuthSuccess(null);
    setAuthError(null);
  }

  /* ── Add service ─────────────────────────────────────────────── */
  async function handleAddService(e) {
    e.preventDefault();
    setSvcError(null);
    setAddingSvc(true);

    const body = { name: svcName, url: svcUrl };
    if (svcInterval) body.checkIntervalSeconds = Number(svcInterval);

    try {
      const res = await fetch(`${API}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSvcError(data.error || "Failed to add service");
        return;
      }

      setSvcName("");
      setSvcUrl("");
      setSvcInterval("");
      fetchServices();
    } catch {
      setSvcError("Could not reach server");
    } finally {
      setAddingSvc(false);
    }
  }

  /* ── Delete service ──────────────────────────────────────────── */
  async function handleDeleteService(id) {
    setSvcError(null);
    try {
      const res = await fetch(`${API}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setSvcError(data.error || "Failed to delete service");
        return;
      }

      fetchServices();
    } catch {
      setSvcError("Could not reach server");
    }
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="app-container">
      {/* ── Health Card ──────────────────────────────────────── */}
      {healthError ? (
        <div className="card error-card">
          <div className="icon">⚠</div>
          <p>{healthError}</p>
          <p className="hint">Is the server running on port 4000?</p>
        </div>
      ) : !health ? (
        <div className="card health-card loading">
          <span>Checking server health…</span>
        </div>
      ) : (
        <div className="card health-card">
          <h2>Server Health</h2>
          <div className="status-row">
            <span className="status-label">status</span>
            <span className="status-value ok">{health.status}</span>
          </div>
          <div className="status-row">
            <span className="status-label">mongoConnected</span>
            <span
              className={`status-value ${health.mongoConnected ? "connected" : "disconnected"}`}
            >
              {String(health.mongoConnected)}
            </span>
          </div>
        </div>
      )}

      {/* ── Auth Card ────────────────────────────────────────── */}
      <div className="card auth-card">
        {authChecking ? (
          <div className="loading">
            <span>Restoring session…</span>
          </div>
        ) : user ? (
          <div className="auth-profile">
            <div className="avatar">{user.email[0].toUpperCase()}</div>
            <h2>Welcome back</h2>
            <p className="user-email">{user.email}</p>
            <p className="user-since">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={`tab ${!isLogin ? "active" : ""}`}
                onClick={() => {
                  setIsLogin(false);
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
              >
                Sign Up
              </button>
              <button
                className={`tab ${isLogin ? "active" : ""}`}
                onClick={() => {
                  setIsLogin(true);
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
              >
                Log In
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />

              {authError && <p className="msg msg-error">{authError}</p>}
              {authSuccess && (
                <p className="msg msg-success">{authSuccess}</p>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait…"
                  : isLogin
                    ? "Log In"
                    : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Services Card (only when logged in) ──────────────── */}
      {user && (
        <div className="card services-card">
          <h2>Your Services</h2>

          {/* Add-service form */}
          <form className="svc-form" onSubmit={handleAddService}>
            <div className="svc-form-row">
              <input
                id="svc-name"
                type="text"
                placeholder="Service name"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                required
              />
              <input
                id="svc-url"
                type="url"
                placeholder="https://example.com/health"
                value={svcUrl}
                onChange={(e) => setSvcUrl(e.target.value)}
                required
              />
              <input
                id="svc-interval"
                type="number"
                placeholder="Interval (s)"
                min={10}
                value={svcInterval}
                onChange={(e) => setSvcInterval(e.target.value)}
                className="svc-interval-input"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={addingSvc || !svcName.trim() || !svcUrl.trim()}
            >
              {addingSvc ? "Adding…" : "Add Service"}
            </button>
          </form>

          {svcError && <p className="msg msg-error">{svcError}</p>}

          {/* Service list */}
          {svcLoading ? (
            <div className="loading" style={{ marginTop: 16 }}>
              <span>Loading services…</span>
            </div>
          ) : services.length === 0 ? (
            <p className="svc-empty">
              No services yet — add one above to get started.
            </p>
          ) : (
            <ul className="svc-list">
              {services.map((svc) => (
                <li key={svc._id} className="svc-item">
                  <div className="svc-info">
                    <div className="svc-header">
                      <span className={`svc-status-dot ${statuses[svc._id]?.currentStatus || 'unknown'}`}></span>
                      <span className="svc-name">{svc.name}</span>
                    </div>
                    <span className="svc-url">{svc.url}</span>
                  </div>
                  <div className="svc-stats">
                    <div className="svc-stat">
                      <span className="stat-label">Uptime</span>
                      <span className="stat-val">{statuses[svc._id]?.uptimePercentage != null ? `${statuses[svc._id].uptimePercentage.toFixed(1)}%` : "—"}</span>
                    </div>
                    <div className="svc-stat">
                      <span className="stat-label">Response</span>
                      <span className="stat-val">{statuses[svc._id]?.lastResponseTime != null ? `${statuses[svc._id].lastResponseTime}ms` : "—"}</span>
                    </div>
                    <div className="svc-stat">
                      <span className="stat-label">Checked</span>
                      <span className="stat-val">{formatRelativeTime(statuses[svc._id]?.lastCheckedAt)}</span>
                    </div>
                  </div>
                  <button
                    className="btn-delete"
                    title="Delete service"
                    onClick={() => handleDeleteService(svc._id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
