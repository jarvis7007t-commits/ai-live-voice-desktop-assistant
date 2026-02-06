
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Simple route detection for Electron windows
const params = new URLSearchParams(window.location.search);
const isFloating = params.get('view') === 'floating' || window.location.hash.includes('view=floating');

if (isFloating) {
  document.body.classList.add('floating-mode');
}

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App isFloating={isFloating} />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Mount error:", error);
    rootElement.innerHTML = `<div style="color:red; padding:20px;">Mounting Error: ${error}</div>`;
  }
}
