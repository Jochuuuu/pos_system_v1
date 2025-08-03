// frontend/src/components/modules/inventory/categories/SimpleDeleteConfirmation.tsx
// CONFIRMACIÓN SIMPLE - CON SISTEMA DE PERMISOS
import React, { useState } from 'react';

interface SimpleDeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'familia' | 'subfamilia';
  canDelete: boolean;
  blockedReason?: string;
  userRole: 'A' | 'S' | 'C';  // 🔐 AGREGADO: Rol del usuario
}

const SimpleDeleteConfirmation: React.FC<SimpleDeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  canDelete,
  blockedReason,
  userRole  // 🔐 Recibir rol del usuario
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 🔐 SISTEMA DE PERMISOS
  const permissions = {
    canDelete: userRole === 'A',  // Solo Admin puede eliminar
  };

  const handleConfirm = async () => {
    // 🔐 Verificar permisos antes de proceder
    if (!permissions.canDelete || !canDelete) return;
        
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 No mostrar modal si no hay permisos
  if (!isOpen || !permissions.canDelete) {
    if (!permissions.canDelete) {
      console.warn(`Usuario ${userRole} sin permisos para eliminar`);
    }
    return null;
  }

  // 🔐 Determinar si realmente se puede eliminar
  const finalCanDelete = permissions.canDelete && canDelete;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--delete" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header modal__header--danger">
          <span className="modal__icon">⚠️</span>
          <h3 className="modal__title">Confirmar eliminación</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">
          {/* 🔍 DEBUG: Mostrar permisos (quitar en producción) */}
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1rem' }}>
            Usuario: {userRole} | Eliminar: {permissions.canDelete ? '✅' : '❌'}
          </div>

          <p>
            ¿Estás seguro de eliminar la {itemType} <strong>"{itemName}"</strong>?
          </p>

          {/* 🔐 Mensaje si no tiene permisos */}
          {!permissions.canDelete && (
            <div className="delete-blocker">
              <span className="delete-blocker__icon">🔒</span>
              <p className="delete-blocker__message">
                Solo los Administradores pueden eliminar categorías
              </p>
            </div>
          )}

          {/* Mensaje si está bloqueado por relaciones */}
          {permissions.canDelete && !canDelete && blockedReason && (
            <div className="delete-blocker">
              <span className="delete-blocker__icon">🚫</span>
              <p className="delete-blocker__message">{blockedReason}</p>
            </div>
          )}

          {/* Warning de confirmación */}
          {finalCanDelete && (
            <p className="delete-warning">
              <strong>Esta acción no se puede deshacer.</strong>
            </p>
          )}
        </div>

        <div className="modal__footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
                    
          <button
            type="button"
            className={`btn ${finalCanDelete ? 'btn--danger' : 'btn--secondary'}`}
            onClick={handleConfirm}
            disabled={!finalCanDelete || isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn__spinner"></span>
                Eliminando...
              </>
            ) : finalCanDelete ? (
              `Eliminar ${itemType}`
            ) : !permissions.canDelete ? (
              'Sin permisos'
            ) : (
              'No se puede eliminar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleDeleteConfirmation;