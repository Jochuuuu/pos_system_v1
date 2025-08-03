// frontend/src/components/ThemeToggle.tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle btn btn-ghost btn-sm"
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {isDark ? (
        // Icono de sol (modo claro)
        <svg 
          width="18" 
          height="18" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          className="transition-transform duration-300 rotate-0"
        >
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        // Icono de luna (modo oscuro)
        <svg 
          width="18" 
          height="18" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          className="transition-transform duration-300 rotate-0"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;