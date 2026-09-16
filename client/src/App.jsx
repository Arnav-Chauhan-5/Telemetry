import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import PublicStatus from "./PublicStatus";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/status" element={<PublicStatus />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
