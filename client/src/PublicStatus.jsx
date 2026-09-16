import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API = "http://localhost:4000";

function PublicStatus() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/status/public`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load status");
        return res.json();
      })
      .then(data => setServices(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>System Status</h1>
        <Link to="/" className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      {loading && <div className="card loading"><span>Loading status...</span></div>}
      {error && <div className="card error-card"><p>{error}</p></div>}

      {!loading && !error && (
        <div className="card">
          {services.length === 0 ? (
            <p className="svc-empty">No services are being monitored.</p>
          ) : (
            <ul className="svc-list">
              {services.map(svc => {
                const isUp = svc.status === 'up' || svc.status === 'operational';
                const isDown = svc.status === 'down';
                const displayStatus = isUp ? 'Operational' : (isDown ? 'Down' : 'Unknown');
                const dotClass = isUp ? 'up' : (isDown ? 'down' : 'unknown');
                
                return (
                  <li key={svc.name} className="svc-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`svc-status-dot ${dotClass}`}></span>
                    <span className="svc-name" style={{ fontSize: '1.2rem', margin: 0 }}>{svc.name}</span>
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontWeight: 'bold', 
                      color: isUp ? 'var(--color-ok)' : (isDown ? 'var(--color-error)' : 'inherit') 
                    }}>
                      {displayStatus}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default PublicStatus;
