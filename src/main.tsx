import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { supabaseConfigured } from './lib/supabaseClient';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (!supabaseConfigured) {
  root.render(
    <p className="page-status">
      This site isn't connected to its database yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the
      hosting settings (or .env.local when running locally) and redeploy.
    </p>,
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}
