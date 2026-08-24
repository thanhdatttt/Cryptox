import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App(): React.ReactElement {
  return (
    <main>
      <h1>Cryptox</h1>
      <p>Frontend skeleton ready.</p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
