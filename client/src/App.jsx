import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:4000/health";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch(() => setError("Could not reach server"));
  }, []);

  if (error) {
    return (
      <div className="error-card">
        <div className="icon">⚠</div>
        <p>{error}</p>
        <p className="hint">Is the server running on port 4000?</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="health-card loading">
        <span>Checking server health…</span>
      </div>
    );
  }

  return (
    <div className="health-card">
      <h1>Server Health</h1>

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
  );
}

export default App;
