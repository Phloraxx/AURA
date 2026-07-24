import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';
import './design-system.css';
import './motion-personality.css';

const root = document.querySelector('#root');

if (root === null) {
  throw new Error('AURA renderer root was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
