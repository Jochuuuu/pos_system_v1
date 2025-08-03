// frontend/src/components/modules/customers/CustomerForm.tsx - DOCUMENTO FLEXIBLE
import React, { useState, useEffect } from 'react';
import type { CustomerFormData, Customer } from '../../../types/customer.types';

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  readonly?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSubmit,
  onCancel,
  loading = false,
  readonly = false
}) => {
  // 📝 Estado del formulario
  const [formData, setFormData] = useState<CustomerFormData>({
    doc: '',
    nom: '',
    dir: '',
    telefono: '',
    email: '',
    tipo: 'P'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ⚡ Cargar datos del cliente al abrir el modal
  useEffect(() => {
    if (customer) {
      console.log('📝 Cargando datos del cliente en formulario:', customer.nom);
      
      setFormData({
        doc: customer.doc || '',
        nom: customer.nom || '',
        dir: customer.dir || '',
        telefono: customer.telefono || '',
        email: customer.email || '',
        tipo: customer.tipo
      });
      
      // Limpiar errores al cargar nuevo cliente
      setErrors({});
    } else {
      console.log('📝 Formulario para nuevo cliente');
      
      // Resetear formulario para nuevo cliente
      setFormData({
        doc: '',
        nom: '',
        dir: '',
        telefono: '',
        email: '',
        tipo: 'P'
      });
      
      setErrors({});
    }
  }, [customer]);

  // 🔄 Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Limpiar error general si existe
    if (errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  // ✅ Validaciones del formulario - DOCUMENTO FLEXIBLE
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre (requerido)
    if (!formData.nom.trim()) {
      newErrors.nom = 'El nombre es requerido';
    } else if (formData.nom.trim().length < 2) {
      newErrors.nom = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nom.trim().length > 65) {
      newErrors.nom = 'El nombre no puede exceder 65 caracteres';
    }

    // ✅ DOCUMENTO - VALIDACIÓN FLEXIBLE (solo si hay contenido)
    if (formData.doc.trim()) {
      const docLength = formData.doc.trim().length;
      
      if (docLength < 1) {
        newErrors.doc = 'El documento debe tener al menos 1 caracter';
      } else if (docLength > 15) {
        newErrors.doc = 'El documento no puede exceder 15 caracteres';
      }
      
      // Validación opcional de solo números para documentos peruanos
      const onlyNumbers = /^[0-9]+$/.test(formData.doc.trim());
      if (!onlyNumbers && formData.tipo === 'E') {
        // Solo advertir para RUC que no son números, pero no bloquear
        // newErrors.doc = 'El RUC generalmente contiene solo números';
      }
    }

    // ✅ EMAIL - VALIDACIÓN SÚPER FLEXIBLE (solo longitud máxima)
    if (formData.email.trim()) {
      if (formData.email.trim().length > 100) {
        newErrors.email = 'El email no puede exceder 100 caracteres';
      }
      // ❌ QUITAMOS: Validación de formato de email
      // ❌ QUITAMOS: RegEx estricta - ahora acepta cualquier formato
    }

    // ✅ TELÉFONO - VALIDACIÓN SÚPER FLEXIBLE (solo longitud máxima) 
    if (formData.telefono.trim()) {
      if (formData.telefono.trim().length > 20) {
        newErrors.telefono = 'El teléfono no puede exceder 20 caracteres';
      }
      // ❌ QUITAMOS: Validación de formato de teléfono
      // ❌ QUITAMOS: RegEx de solo números - acepta cualquier caracter
      // ❌ QUITAMOS: Longitud mínima molesta
    }

    // Validar dirección (opcional pero con longitud si se proporciona)
    if (formData.dir.trim() && formData.dir.trim().length > 85) {
      newErrors.dir = 'La dirección no puede exceder 85 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🚀 Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (readonly) return;
    if (isSubmitting || loading) return;

    console.log('📤 Enviando formulario:', customer ? 'actualizar' : 'crear');

    // Validar antes de enviar
    if (!validateForm()) {
      console.log('❌ Formulario inválido, no se envía');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Limpiar datos antes de enviar
      const cleanData: CustomerFormData = {
        doc: formData.doc.trim(),
        nom: formData.nom.trim(),
        dir: formData.dir.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim(),
        tipo: formData.tipo
      };

      await onSubmit(cleanData);
      
      console.log('✅ Formulario enviado exitosamente');
      // El modal se cierra automáticamente desde el store
      
    } catch (error) {
      console.error('❌ Error al enviar formulario:', error);
      
      setErrors({
        general: error instanceof Error ? error.message : 'Error al guardar cliente'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔘 Manejar cancelar
  const handleCancel = () => {
    console.log('❌ Cancelando formulario');
    
    if (!isSubmitting && !loading) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="customer-form">
      {/* 🚨 Error general */}
      {errors.general && (
        <div className="alert alert-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errors.general}</span>
          </div>
        </div>
      )}

      <div className="form-grid">
        {/* 📋 Tipo de cliente */}
        <div className="form-group">
          <label htmlFor="tipo" className="form-label">
            Tipo de Cliente *
          </label>
          <select
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            className={`form-select ${errors.tipo ? 'error' : ''}`}
          >
            <option value="P">Persona Natural</option>
            <option value="E">Empresa</option>
          </select>
          {errors.tipo && <span className="error-text">{errors.tipo}</span>}
        </div>

        {/* 📄 Documento - AHORA MÁS FLEXIBLE */}
        <div className="form-group">
          <label htmlFor="doc" className="form-label">
            {formData.tipo === 'P' ? 'DNI/Pasaporte/Cédula' : 'RUC/Documento Fiscal'}
          </label>
          <input
            type="text"
            id="doc"
            name="doc"
            value={formData.doc}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            placeholder={formData.tipo === 'P' ? 'Ej: 12345678, ABC123456' : 'Ej: 20123456789, DOC123'}
            className={`form-input ${errors.doc ? 'error' : ''}`}
            maxLength={15}
          />
          {errors.doc && <span className="error-text">{errors.doc}</span>}
          <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Máximo 15 caracteres. Acepta números, letras y algunos símbolos.
          </small>
        </div>

        {/* 👤 Nombre */}
        <div className="form-group form-group-full">
          <label htmlFor="nom" className="form-label">
            {formData.tipo === 'P' ? 'Nombre Completo' : 'Razón Social'} *
          </label>
          <input
            type="text"
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            placeholder={formData.tipo === 'P' ? 'Ej: Juan Pérez López' : 'Ej: Empresa SAC'}
            className={`form-input ${errors.nom ? 'error' : ''}`}
            maxLength={65}
          />
          {errors.nom && <span className="error-text">{errors.nom}</span>}
        </div>

        {/* 📧 Email - AHORA MÁS FLEXIBLE */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email / Contacto Digital
          </label>
          <input
            type="text"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            placeholder="ejemplo@correo.com, @usuario, contacto123"
            className={`form-input ${errors.email ? 'error' : ''}`}
            maxLength={100}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
          <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acepta emails, usuarios de redes sociales, o cualquier contacto digital.
          </small>
        </div>

        {/* 📞 Teléfono - AHORA MÁS FLEXIBLE */}
        <div className="form-group">
          <label htmlFor="telefono" className="form-label">
            Teléfono / WhatsApp
          </label>
          <input
            type="text"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            placeholder="999-123-456, +51 999 123 456, WhatsApp: 999123456"
            className={`form-input ${errors.telefono ? 'error' : ''}`}
            maxLength={20}
          />
          {errors.telefono && <span className="error-text">{errors.telefono}</span>}
          <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acepta cualquier formato: números, WhatsApp, extensiones, etc.
          </small>
        </div>

        {/* 🏠 Dirección */}
        <div className="form-group form-group-full">
          <label htmlFor="dir" className="form-label">
            Dirección
          </label>
          <input
            type="text"
            id="dir"
            name="dir"
            value={formData.dir}
            onChange={handleInputChange}
            disabled={readonly || loading || isSubmitting}
            placeholder="Av. Principal 123, Lima"
            className={`form-input ${errors.dir ? 'error' : ''}`}
            maxLength={85}
          />
          {errors.dir && <span className="error-text">{errors.dir}</span>}
        </div>
      </div>

      {/* 🔘 Botones de acción */}
      {!readonly && (
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting || loading}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="btn btn-primary"
          >
            {isSubmitting || loading ? (
              <>
                <div className="loading-spinner"></div>
                {customer ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {customer ? 'Actualizar Cliente' : 'Crear Cliente'}
              </>
            )}
          </button>
        </div>
      )}

      {/* 📊 Vista de solo lectura */}
      {readonly && (
        <div className="form-readonly-info">
          <div className="info-section">
            <h4>Información del Cliente</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">ID:</span>
                <span className="info-value">#{customer?.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tipo:</span>
                <span className={`type-badge type-${formData.tipo}`}>
                  {formData.tipo === 'P' ? 'Persona Natural' : 'Empresa'}
                </span>
              </div>
              {formData.doc && (
                <div className="info-item">
                  <span className="info-label">Documento:</span>
                  <span className="info-value">{formData.doc}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default CustomerForm;