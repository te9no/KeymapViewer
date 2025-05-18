// frontend/src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";

const App = () => {
  return <h1>Hello from KeymapViewer Component!</h1>;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
