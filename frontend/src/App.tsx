// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useTheme } from './hooks/useTheme';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Componente de loading
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-secondary">
    <div className="text-center">
      <div className="brand-icon mx-auto mb-4">POS</div>
      <div className="loading-spinner mx-auto mb-4"></div>
      <p className="text-secondary">Cargando...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();
  
  console.log('🛡️ ProtectedRoute - isInitialized:', isInitialized, 'isAuthenticated:', isAuthenticated);
  
  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isInitialized } = useAuthStore();
  useTheme(); 

  useEffect(() => {
    console.log('🚀 App useEffect ejecutado');
    
    const token = localStorage.getItem('accessToken');
    console.log('🔍 Token en localStorage:', token ? 'Existe' : 'No existe');
    

    const store = useAuthStore.getState();
    console.log('📦 Estado del store antes de inicializar:', {
      isAuthenticated: store.isAuthenticated,
      isInitialized: store.isInitialized,
      user: store.user
    });
    
    store.initializeAuth();
  }, []);

  console.log('📱 App render - isInitialized:', isInitialized);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

export default App;