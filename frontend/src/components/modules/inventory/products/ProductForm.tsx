// frontend/src/components/modules/inventory/products/ProductForm.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, Subfamilia } from '../../../../types/inventory.types';

type FormMode = 'create' | 'edit' | 'view';


interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => Promise<void>;
  mode: FormMode;
  initialData?: Product | null;
  subfamilias: Subfamilia[];
  preSelectedSubfamilia?: Subfamilia | null; // 🆕 Subfamilia preseleccionada
  userRole: 'A' | 'S' | 'C';
}

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  subfamilias,
  preSelectedSubfamilia,
  userRole
}) => {
  // Estados del formulario
  const [formData, setFormData] = useState<Partial<Product>>({
    cod: '',
    descripcion: '',
    p_compra: 0,
    p_venta: 0,
    unidad: 'U',
    sub_id: 0,
    activo: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 🚀 OPTIMIZACIÓN: Memoizar permisos para evitar recálculos
  const permissions = useMemo(() => ({
    canViewCompra: userRole === 'A' || userRole === 'S',
    canEdit: userRole === 'A' || userRole === 'S',
    isReadOnly: mode === 'view' || (userRole !== 'A' && userRole !== 'S')
  }), [userRole, mode]);

  // 🚀 OPTIMIZACIÓN: Memoizar título para evitar recálculos
  const title = useMemo(() => {
    switch (mode) {
      case 'create': return 'Nuevo Producto';
      case 'edit': return 'Editar Producto';
      case 'view': return 'Ver Producto';
      default: return 'Producto';
    }
  }, [mode]);

  // 🚀 OPTIMIZACIÓN: Memoizar opciones de unidades
  const unidadOptions = useMemo(() => [
    { value: 'U', label: 'Unidad' },
    { value: 'K', label: 'Kilogramo' },
    { value: 'P', label: 'Paquete' }
  ], []);
  const defaultSubId = preSelectedSubfamilia?.id || subfamilias[0]?.id || 0;

  // 🚀 OPTIMIZACIÓN: Cargar datos iniciales con useCallback
  const loadInitialData = useCallback(() => {
    if (initialData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        cod: initialData.cod,
        descripcion: initialData.descripcion,
        p_compra: initialData.p_compra,
        p_venta: initialData.p_venta,
        unidad: initialData.unidad,
        sub_id: initialData.sub_id,
        activo: initialData.activo
      });
    } else if (mode === 'create') {
      setFormData({
        cod: '',
        descripcion: '',
        p_compra: 0,
        p_venta: 0,
        unidad: 'U',
        sub_id: defaultSubId,
        activo: true
      });
    }
    setErrors({});
  }, [mode, initialData, subfamilias]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, loadInitialData]);

  // 🚀 OPTIMIZACIÓN: Limpiar al cerrar con useCallback
  const handleClose = useCallback(() => {
    setFormData({
      cod: '',
      descripcion: '',
      p_compra: 0,
      p_venta: 0,
      unidad: 'U',
      sub_id: 0,
      activo: true
    });
    setErrors({});
    setIsLoading(false);
    onClose();
  }, [onClose]);

  // 🚀 OPTIMIZACIÓN: Manejar cambios en inputs con useCallback
  const handleInputChange = useCallback((field: keyof Product, value: any) => {
    if (permissions.isReadOnly) return;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo si existe
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, [permissions.isReadOnly]);

  // 🚀 OPTIMIZACIÓN: Funciones de imagen con useCallback
  const handleImageUpload = useCallback(() => {
    console.log('🚀 Funcionalidad futura: Subir imagen para', formData.cod);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        console.log('Archivo seleccionado:', file.name);
        alert(`📷 Archivo seleccionado: ${file.name}\n🔧 Funcionalidad de subida en desarrollo`);
      }
    };
    input.click();
  }, [formData.cod]);

  const handleImageRemove = useCallback(() => {
    console.log('🗑️ Funcionalidad futura: Quitar imagen de', formData.cod);
    
    if (confirm('¿Estás seguro de quitar la imagen del producto?')) {
      alert('🔧 Funcionalidad en desarrollo\nLa imagen se quitaría del servidor');
    }
  }, [formData.cod]);

  // 🚀 OPTIMIZACIÓN: Validaciones con useCallback
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Código de barras
    if (!formData.cod?.trim()) {
      newErrors.cod = 'El código de barras es obligatorio';
    } else if (formData.cod.length > 15) {
      newErrors.cod = 'El código no puede tener más de 15 caracteres';
    }

    // Descripción
    if (!formData.descripcion?.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.length > 45) {
      newErrors.descripcion = 'La descripción no puede tener más de 45 caracteres';
    }

    // Precios
    if (permissions.canViewCompra) {
      if (!formData.p_compra || formData.p_compra <= 0) {
        newErrors.p_compra = 'El precio de compra debe ser mayor a 0';
      }
      if (!formData.p_venta || formData.p_venta <= 0) {
        newErrors.p_venta = 'El precio de venta debe ser mayor a 0';
      }
      if (formData.p_compra && formData.p_venta && formData.p_venta < formData.p_compra) {
        newErrors.p_venta = 'El precio de venta debe ser mayor o igual al de compra';
      }
    } else {
      if (!formData.p_venta || formData.p_venta <= 0) {
        newErrors.p_venta = 'El precio de venta debe ser mayor a 0';
      }
    }

    // Subfamilia
    if (!formData.sub_id || formData.sub_id === 0) {
      newErrors.sub_id = 'Debe seleccionar una subfamilia';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, permissions.canViewCompra]);

  // 🚀 OPTIMIZACIÓN: Enviar formulario con useCallback
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (permissions.isReadOnly || !validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error guardando producto:', error);
      setErrors({ general: 'Error al guardar el producto' });
    } finally {
      setIsLoading(false);
    }
  }, [permissions.isReadOnly, validateForm, onSave, formData, handleClose]);

  // 🚀 OPTIMIZACIÓN: Calcular margen solo cuando sea necesario
  const marginInfo = useMemo(() => {
    if (!permissions.canViewCompra || !formData.p_compra || !formData.p_venta) {
      return null;
    }
    
    const margin = formData.p_venta - formData.p_compra;
    const percentage = ((margin / formData.p_compra) * 100);
    
    return {
      amount: margin.toFixed(2),
      percentage: percentage.toFixed(1)
    };
  }, [permissions.canViewCompra, formData.p_compra, formData.p_venta]);

  // No renderizar si no está abierto
  if (!isOpen) return null;

  return (
    <div className="product-form-overlay">
      <div className="product-form-container">
        {/* Header */}
        <div className="product-form-header">
          <h3 className="product-form-title">{title}</h3>
          <button 
            className="product-form-close"
            onClick={handleClose}
            disabled={isLoading}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="product-form-content">
          <form onSubmit={handleSubmit} className="product-form">
            
            {/* Error general */}
            {errors.general && (
              <div className="product-form-error--general">
                {errors.general}
              </div>
            )}

            {/* Permisos info para Cajeros */}
            {!permissions.canEdit && (
              <div className="product-form-info">
                <span className="product-form-info__icon">ℹ️</span>
                <span>Solo puedes ver la información. Contacta a un supervisor para modificaciones.</span>
              </div>
            )}

            <div className="product-form-grid product-form-grid--2col">
              
              {/* Código de barras */}
              <div className="product-form-group">
                <label className="product-form-label" htmlFor="cod">
                  Código de Barras <span className="product-form-required">*</span>
                </label>
                <input
                  id="cod"
                  type="text"
                  className={`product-form-input ${errors.cod ? 'product-form-input--error' : ''}`}
                  value={formData.cod || ''}
                  onChange={(e) => handleInputChange('cod', e.target.value)}
                  placeholder="Ej: 7751271001502"
                  maxLength={15}
                  disabled={permissions.isReadOnly || mode === 'edit'}
                  autoComplete="off"
                />
                {errors.cod && <span className="product-form-error">{errors.cod}</span>}
              </div>

              {/* Subfamilia */}
              <div className="product-form-group">
                <label className="product-form-label" htmlFor="sub_id">
                  Categoría <span className="product-form-required">*</span>
                </label>
                <select
                  id="sub_id"
                  className={`product-form-select ${errors.sub_id ? 'product-form-input--error' : ''}`}
                  value={formData.sub_id || ''}
                  onChange={(e) => handleInputChange('sub_id', parseInt(e.target.value))}
                  disabled={permissions.isReadOnly}
                >
                  <option value="">Seleccionar subfamilia</option>
                  {subfamilias.map((subfamilia) => (
                    <option key={subfamilia.id} value={subfamilia.id}>
                      {subfamilia.nom}
                    </option>
                  ))}
                </select>
                {errors.sub_id && <span className="product-form-error">{errors.sub_id}</span>}
              </div>

            </div>

            {/* Descripción */}
            <div className="product-form-group">
              <label className="product-form-label" htmlFor="descripcion">
                Descripción del Producto <span className="product-form-required">*</span>
              </label>
              <input
                id="descripcion"
                type="text"
                className={`product-form-input ${errors.descripcion ? 'product-form-input--error' : ''}`}
                value={formData.descripcion || ''}
                onChange={(e) => handleInputChange('descripcion', e.target.value)}
                placeholder="Ej: Coca Cola 500ml"
                maxLength={45}
                disabled={permissions.isReadOnly}
                autoComplete="off"
              />
              {errors.descripcion && <span className="product-form-error">{errors.descripcion}</span>}
            </div>

            {/* Precios */}
            <div className="product-form-grid product-form-grid--3col">
              
              {/* Precio de compra - Solo Admin y Supervisor */}
              {permissions.canViewCompra && (
                <div className="product-form-group">
                  <label className="product-form-label" htmlFor="p_compra">
                    Precio Compra <span className="product-form-required">*</span>
                  </label>
                  <div className="product-form-input-group">
                    <span className="product-form-input-prefix">S/</span>
                    <input
                      id="p_compra"
                      type="number"
                      step="0.01"
                      min="0"
                      className={`product-form-input ${errors.p_compra ? 'product-form-input--error' : ''}`}
                      value={formData.p_compra || ''}
                      onChange={(e) => handleInputChange('p_compra', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      disabled={permissions.isReadOnly}
                      autoComplete="off"
                    />
                  </div>
                  {errors.p_compra && <span className="product-form-error">{errors.p_compra}</span>}
                </div>
              )}

              {/* Precio de venta */}
              <div className="product-form-group">
                <label className="product-form-label" htmlFor="p_venta">
                  Precio Venta <span className="product-form-required">*</span>
                </label>
                <div className="product-form-input-group">
                  <span className="product-form-input-prefix">S/</span>
                  <input
                    id="p_venta"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`product-form-input ${errors.p_venta ? 'product-form-input--error' : ''}`}
                    value={formData.p_venta || ''}
                    onChange={(e) => handleInputChange('p_venta', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    disabled={permissions.isReadOnly}
                    autoComplete="off"
                  />
                </div>
                {errors.p_venta && <span className="product-form-error">{errors.p_venta}</span>}
              </div>

              {/* Unidad */}
              <div className="product-form-group">
                <label className="product-form-label" htmlFor="unidad">
                  Unidad <span className="product-form-required">*</span>
                </label>
                <select
                  id="unidad"
                  className="product-form-select"
                  value={formData.unidad || 'U'}
                  onChange={(e) => handleInputChange('unidad', e.target.value as 'U' | 'K' | 'P')}
                  disabled={permissions.isReadOnly}
                >
                  {unidadOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Estado activo */}
            <div className="product-form-group">
              <label className="product-form-checkbox">
                <input
                  type="checkbox"
                  checked={formData.activo || false}
                  onChange={(e) => handleInputChange('activo', e.target.checked)}
                  disabled={permissions.isReadOnly}
                />
                <span className="product-form-checkbox-text">Producto activo</span>
              </label>
            </div>

            {/* Información del margen */}
            {marginInfo && (
              <div className="product-form-info">
                <span className="product-form-info__icon">💰</span>
                <span>
                  Margen: S/ {marginInfo.amount} ({marginInfo.percentage}%)
                </span>
              </div>
            )}

            {/* Sección de imagen del producto */}
            <div className="product-image-section">
              <h4 className="product-form-section-title">📷 Imagen del Producto</h4>
              
              <div className="product-image-preview">
                <img 
                  src="/src/components/modules/inventory/products/default.png"
                  alt="Vista previa del producto"
                  className="product-image-preview__img"
                  loading="lazy"
                />
                <div className="product-image-preview__overlay">
                  <span className="product-image-preview__text">
                    {formData.cod ? `Imagen: ${formData.cod}.jpg` : 'Sin código asignado'}
                  </span>
                </div>
              </div>

              {!permissions.isReadOnly && (
                <div className="product-image-actions">
                  <button
                    type="button"
                    className="product-form-btn product-form-btn--primary product-form-btn--sm"
                    onClick={handleImageUpload}
                    disabled={isLoading || !formData.cod}
                  >
                    📤 Subir Imagen
                  </button>
                  <button
                    type="button"
                    className="product-form-btn product-form-btn--secondary product-form-btn--sm"
                    onClick={handleImageRemove}
                    disabled={isLoading || !formData.cod}
                  >
                    🗑️ Quitar
                  </button>
                </div>
              )}

              <div className="product-image-info">
                <p className="product-image-info__text">
                  • Formatos: JPG, PNG • Tamaño máximo: 2MB
                </p>
                <p className="product-image-info__text">
                  • La imagen se guardará como: <strong>{formData.cod || 'CODIGO'}.jpg</strong>
                </p>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="product-form-footer">
          <button
            type="button"
            className="product-form-btn product-form-btn--secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            {mode === 'view' ? 'Cerrar' : 'Cancelar'}
          </button>
          
          {!permissions.isReadOnly && (
            <button
              type="button"
              className="product-form-btn product-form-btn--primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductForm);