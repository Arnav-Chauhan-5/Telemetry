import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:4000";
const TOKEN_KEY = "telemetry_token";

function App() {
  /* ── Health check state ──────────────────────────────────────── */
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);

  /* ── Auth state ──────────────────────────────────────────────── */
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null); // { email, createdAt }
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  /* ── Form fields ─────────────────────────────────────────────── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);

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

  /* ── Submit handler (signup or login) ────────────────────────── */
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
    setAuthSuccess(null);
    setAuthError(null);
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
          <div className="loading"><span>Restoring session…</span></div>
        ) : user ? (
          /* Logged-in state */
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
          /* Auth form */
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
              {authSuccess && <p className="msg msg-success">{authSuccess}</p>}

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
    </div>
  );
}

export default App;
