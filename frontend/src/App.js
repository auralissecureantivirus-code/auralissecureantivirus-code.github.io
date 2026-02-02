import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  useEffect(() => {
    // Keep the starter ping (non-blocking)
    axios.get(`${API}/`).catch(() => {});
    // Redirect to the updated static site
    window.location.replace("/auralis-x/index.html");
  }, []);

  return (
    <div data-testid="redirecting-container" style={{ padding: 24 }}>
      <p data-testid="redirecting-text">Redirecting to Auralis X…</p>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
