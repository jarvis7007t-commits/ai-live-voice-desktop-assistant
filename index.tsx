
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Could not find root element to mount to");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("App mounted successfully");
  } catch (error) {
    console.error("Critical error during app mount:", error);
    rootElement.innerHTML = `
      <div class="error-display">
        <strong>Application Error</strong><br/>
        <small>${error instanceof Error ? error.message : 'Unknown error'}</small><br/>
        <button onclick="window.location.reload()" style="margin-top:10px; padding:5px 10px; cursor:pointer;">Retry</button>
      </div>
    `;
  }
};

// Ensure DOM is fully parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
