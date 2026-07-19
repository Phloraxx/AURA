import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import './style.css';

window.addEventListener('error', (event) => {
  console.error('[AURA sidepanel] Uncaught runtime error.', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[AURA sidepanel] Unhandled promise rejection.', event.reason);
});

console.info('[AURA sidepanel] Runtime started.', {
  extensionId: browser.runtime.id,
});

const root = document.querySelector('#root');

if (!(root instanceof HTMLElement)) {
  throw new Error('AURA side panel root element is missing');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
