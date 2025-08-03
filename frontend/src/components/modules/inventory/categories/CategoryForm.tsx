// frontend/src/components/modules/inventory/categories/CategoryForm.tsx
// FORMULARIO UNIFICADO - CON SISTEMA DE PERMISOS
import React, { useState, useEffect } from 'react';
import type { Familia } from '../../../../stores/inventory/categoriesStore';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  mode: 'create-family' | 'edit-family' | 'create-subfamily' | 'edit-subfamily';
  initialData?: any;
  selectedFamily?: Familia;
  familias: Familia[];
  existingItems: any[];
  userRole: 'A' | 'S' | 'C';  // 🔐 AGREGADO: Rol del usuario
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  selectedFamily,
  familias,
  existingItems,
  userRole  // 🔐 Recibir rol del usuario
}) => {
  const [name, setName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<number>(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🔐 SISTEMA DE PERMISOS
  const permissions = {
    canCreate: userRole === 'A' || userRole === 'S',        // Admin y Supervisor pueden crear
    canEdit: userRole === 'A' || userRole === 'S',          // Admin y Supervisor pueden editar
    canView: true                                           // Todos pueden ver
  };

  // Configuración según el modo
  const isFamily = mode === 'create-family' || mode === 'edit-family';
  const isEditing = mode.includes('edit');
  const isSubfamily = mode === 'create-subfamily' || mode === 'edit-subfamily';
  const isEditingSubfamily = mode === 'edit-subfamily';

  // 🔐 Verificar permisos para el modo actual
  const hasPermissionForMode = () => {
    if (mode.includes('create') && !permissions.canCreate) return false;
    if (mode.includes('edit') && !permissions.canEdit) return false;
    return true;
  };

  const config = {
    title: (() => {
      if (mode === 'create-family') return 'Nueva Familia';
      if (mode === 'edit-family') return 'Editar Familia';
      if (mode === 'create-subfamily') return 'Nueva Subfamilia';
      if (mode === 'edit-subfamily') return 'Editar Subfamilia';
      return 'Formulario';
    })(),
    label: isFamily ? 'Nombre de la Familia' : 'Nombre de la Subfamilia',
    placeholder: isFamily ? 
      'Ej: ALIMENTOS, LIMPIEZA...' : 
      'Ej: Lácteos, Detergentes...',
    helpText: isFamily ? 
      'Se guardará en MAYÚSCULAS' : 
      'Se Capitalizará Cada Palabra',
    buttonText: (() => {
      if (mode === 'create-family') return 'Crear Familia';
      if (mode === 'edit-family') return 'Guardar Familia';
      if (mode === 'create-subfamily') return 'Crear Subfamilia';
      if (mode === 'edit-subfamily') return 'Guardar Subfamilia';
      return 'Guardar';
    })(),
    loadingText: (() => {
      if (mode === 'create-family') return 'Creando familia...';
      if (mode === 'edit-family') return 'Guardando familia...';
      if (mode === 'create-subfamily') return 'Creando subfamilia...';
      if (mode === 'edit-subfamily') return 'Guardando subfamilia...';
      return 'Guardando...';
    })(),
    maxLength: 35,
    formatName: isFamily ? 
      (val: string) => val.toUpperCase() : 
      (val: string) => val.replace(/\b\w/g, l => l.toUpperCase())
  };

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      setName(initialData?.nom || '');
      setSelectedFamilyId(selectedFamily?.id || 0);
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, initialData, selectedFamily]);

  // Obtener familia actual para validación
  const getCurrentFamily = () => {
    if (isEditingSubfamily) {
      return familias.find(f => f.id === selectedFamilyId);
    }
    return selectedFamily;
  };

  // Validar duplicados
  const validateName = (value: string) => {
    if (!value.trim()) {
      return `Nombre de ${isFamily ? 'familia' : 'subfamilia'} requerido`;
    }
    
    if (value.trim().length < 2) {
      return 'Mínimo 2 caracteres';
    }

    if (value.trim().length > config.maxLength) {
      return `Máximo ${config.maxLength} caracteres`;
    }

    // Para subfamilias, validar en la familia seleccionada
    let itemsToCheck = existingItems;
    if (isEditingSubfamily && selectedFamilyId !== selectedFamily?.id) {
      // Si cambió familia, validar en la nueva familia
      const targetFamily = familias.find(f => f.id === selectedFamilyId);
      itemsToCheck = targetFamily?.subfamilias || [];
    }

    // Verificar duplicados
    const formatted = config.formatName(value.trim());
    const isDuplicate = itemsToCheck.some(item => 
      config.formatName(item.nom) === formatted && 
      item.id !== initialData?.id
    );

    if (isDuplicate) {
      if (isSubfamily) {
        const currentFam = getCurrentFamily();
        return `Ya existe "${formatted}" en ${currentFam?.nom || 'la familia seleccionada'}`;
      }
      return 'Ya existe una familia con este nombre';
    }

    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setError('');
  };

  const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFamilyId = Number(e.target.value);
    setSelectedFamilyId(newFamilyId);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔐 Verificar permisos antes de proceder
    if (!hasPermissionForMode()) {
      setError('No tienes permisos para realizar esta acción');
      return;
    }
    
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const formattedName = config.formatName(name.trim());
      const data: any = { nom: formattedName };

      // Para subfamilias, incluir familia si es necesario
      if (isSubfamily) {
        if (mode === 'create-subfamily') {
          data.fam_id = selectedFamily?.id;
        } else if (mode === 'edit-subfamily' && selectedFamilyId !== selectedFamily?.id) {
          data.fam_id = selectedFamilyId;
        }
      }

      onSave(data);
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 No mostrar formulario si no hay permisos
  if (!isOpen || !hasPermissionForMode()) {
    if (!hasPermissionForMode()) {
      console.warn(`Usuario ${userRole} sin permisos para ${mode}`);
    }
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">{config.title}</h3>
          <button 
            className="modal__close" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          {/* 🔍 DEBUG: Mostrar permisos (quitar en producción) */}
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1rem' }}>
            Modo: {mode} | Usuario: {userRole} | 
            Crear: {permissions.canCreate ? '✅' : '❌'} | 
            Editar: {permissions.canEdit ? '✅' : '❌'}
          </div>

          {/* Info de contexto para subfamilias */}
          {isSubfamily && selectedFamily && !isEditingSubfamily && (
            <div className="form-info">
              <span className="form-info__label">Familia:</span>
              <span className="form-info__value">{selectedFamily.nom}</span>
            </div>
          )}

          {/* Campo nombre */}
          <div className="form-group">
            <label className="form-label required">
              {config.label}
            </label>
            
            <input
              type="text"
              className={`form-input ${error ? 'form-input--error' : ''}`}
              value={name}
              onChange={handleNameChange}
              placeholder={config.placeholder}
              maxLength={config.maxLength}
              disabled={isLoading}
              autoFocus
            />
            
            {error && <span className="form-error">{error}</span>}
            
            <span className="form-help">
              {config.helpText}
            </span>
          </div>

          {/* Selector de familia (solo al editar subfamilia) */}
          {isEditingSubfamily && (
            <div className="form-group">
              <label className="form-label">Familia:</label>
              <select 
                value={selectedFamilyId} 
                onChange={handleFamilyChange}
                className="form-select"
                disabled={isLoading}
              >
                {familias.map(familia => (
                  <option key={familia.id} value={familia.id}>
                    {familia.nom}
                    {familia.id === selectedFamily?.id && ' (actual)'}
                  </option>
                ))}
              </select>
              
              {/* Warning si cambió familia */}
              {selectedFamilyId !== selectedFamily?.id && (
                <span className="form-help form-help--warning">
                  ⚠️ Se moverá de "{selectedFamily?.nom}" a "{familias.find(f => f.id === selectedFamilyId)?.nom}"
                </span>
              )}
            </div>
          )}

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <span className="btn__spinner"></span>
                  {config.loadingText}
                </>
              ) : (
                config.buttonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;