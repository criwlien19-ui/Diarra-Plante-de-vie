
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // TailwindCSS — remplace le CDN cdn.tailwindcss.com
import App from './App';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Render Error:", error);
  rootElement.innerHTML = `<div style="padding: 20px; color: white; background: #991b1b; font-family: sans-serif;">
    <h2>Erreur de chargement</h2>
    <p>Le site n'a pas pu démarrer correctement. Veuillez vérifier la console du navigateur pour plus de détails.</p>
  </div>`;
}
