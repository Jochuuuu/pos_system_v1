// frontend/src/components/modules/customers/CustomerSearch.tsx - SIMPLIFICADO
import React, { useState } from 'react';

interface CustomerSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSearch,
  placeholder = "Buscar por nombre o documento..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 🔍 Ejecutar búsqueda
  const handleSearch = async () => {
    if (isSearching) return;
    
    console.log('🔍 Buscando:', searchQuery.trim());
    setIsSearching(true);
    
    try {
      await onSearch(searchQuery.trim());
    } catch (error) {
      console.error('❌ Error en búsqueda:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 🧹 Limpiar búsqueda
  const handleClear = async () => {
    if (isSearching) return;
    
    console.log('🧹 Limpiando búsqueda');
    setSearchQuery('');
    setIsSearching(true);
    
    try {
      await onSearch('');
    } catch (error) {
      console.error('❌ Error al limpiar búsqueda:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // ⌨️ Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  // 📝 Manejar cambio de input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        {/* 🔍 Icono de búsqueda */}
        <div className="search-icon">
          {isSearching ? (
            <div className="search-spinner"></div>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </div>

        {/* 📝 Input de búsqueda */}
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          disabled={isSearching}
          maxLength={50}
          autoComplete="off"
        />

        {/* ❌ Botón limpiar */}
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSearching}
            className="search-clear"
            title="Limpiar búsqueda (Esc)"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* 🔍 Botón buscar */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="search-button"
          title="Buscar (Enter)"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {/* CSS integrado para evitar problemas */}
      <style jsx>{`
        .search-container {
          position: relative;
          width: 320px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 10px 45px 10px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background-color: white;
          color: #1f2937;
          font-size: 14px;
          transition: all 0.2s ease;
          min-height: 40px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input:disabled {
          background-color: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          z-index: 1;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #d1d5db;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .search-clear {
          position: absolute;
          right: 45px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          color: #6b7280;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          min-height: 28px;
        }

        .search-clear:hover:not(:disabled) {
          color: #1f2937;
          background-color: #f3f4f6;
        }

        .search-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-button {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          padding: 8px;
          color: white;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
        }

        .search-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive para móvil */
        @media (max-width: 640px) {
          .search-container {
            width: 100%;
          }

          .search-input {
            font-size: 16px; /* Evita zoom en iOS */
            min-height: 44px; /* iOS touch target */
            padding-right: 80px;
          }

          .search-clear {
            right: 50px;
            min-width: 32px;
            min-height: 32px;
          }

          .search-button {
            right: 8px;
            min-width: 36px;
            min-height: 36px;
            padding: 10px;
          }
        }

        /* Tema oscuro */
        [data-theme="dark"] .search-input {
          background-color: #1f2937;
          color: #f9fafb;
          border-color: #374151;
        }

        [data-theme="dark"] .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        [data-theme="dark"] .search-input:disabled {
          background-color: #111827;
          color: #6b7280;
        }

        [data-theme="dark"] .search-icon {
          color: #9ca3af;
        }

        [data-theme="dark"] .search-clear {
          color: #9ca3af;
        }

        [data-theme="dark"] .search-clear:hover:not(:disabled) {
          color: #f9fafb;
          background-color: #374151;
        }

        [data-theme="dark"] .search-spinner {
          border-color: #374151;
          border-top-color: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default CustomerSearch;