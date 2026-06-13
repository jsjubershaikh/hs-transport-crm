import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ToastContainer } from './components/Toast.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Provider order: Auth -> UI -> Data (Data depends on Auth + UI). */}
      <AuthProvider>
        <UIProvider>
          <DataProvider>
            <App />
            <ToastContainer />
          </DataProvider>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
