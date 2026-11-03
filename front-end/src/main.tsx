import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HashRouter } from 'react-router-dom';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><HashRouter><App /></HashRouter></AppErrorBoundary>
  </StrictMode>,
);
