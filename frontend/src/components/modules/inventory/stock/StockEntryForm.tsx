// frontend/src/components/modules/inventory/stock/StockEntryForm.tsx
import React, { useState, useEffect } from 'react';
import type { Product } from '../../../../types/inventory.types';
import type { Customer } from '../../../../types/customer.types';
import { useStockStore } from '../../../../stores/inventory/stockStore';

interface ProductEntry {
  id: string;
  producto_cod: string;
  cantidad: string;
  precio_compra: string;
  has_unit_price: boolean;
}

interface StockEntryFormProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

const StockEntryForm: React.FC<StockEntryFormProps> = ({
  product,
  onClose,
  onSuccess
}) => {
  // =============================================
  // 🔌 ZUSTAND STORE CONNECTION
  // =============================================
  const {
    // Data
    products,
    customers,
    
    // Loading states
    isLoadingProducts,
    isLoadingCustomers,
    isSubmitting,
    
    // Error states
    submitError,
    
    // Actions
    loadProducts,
    loadCustomers,
    createStockEntry,
    validateProduct,
    searchCustomerByDoc,
    clearSubmitError
  } = useStockStore();

  // =============================================
  // LOCAL STATE (same as before)
  // =============================================
  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_doc: '',
    observaciones: '',
    total_pagado: '',
    incluye_igv: false
  });
  
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([
    {
      id: '1',
      producto_cod: product?.cod || '',
      cantidad: '',
      precio_compra: product?.p_compra?.toString() || '',
      has_unit_price: true
    }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // =============================================
  // 🚀 EFFECTS - LOAD DATA
  // =============================================
  useEffect(() => {
    // Cargar productos y clientes al montar
    loadProducts();
    loadCustomers();
    
    // Limpiar errores de submit
    return () => clearSubmitError();
  }, [loadProducts, loadCustomers, clearSubmitError]);

  useEffect(() => {
    if (product) {
      setProductEntries([{
        id: '1',
        producto_cod: product.cod,
        cantidad: '',
        precio_compra: product.p_compra.toString(),
        has_unit_price: true
      }]);
    }
  }, [product]);

  // =============================================
  // HANDLERS (updated for backend integration)
  // =============================================
  const handleFormDataChange = (field: string, value: string) => {
    if (field === 'incluye_igv') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProductEntryChange = async (id: string, field: keyof ProductEntry, value: string | boolean) => {
    setProductEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
    
    // Limpiar errores
    const errorKey = `${id}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }

    // 🔌 VALIDAR PRODUCTO EN TIEMPO REAL
    if (field === 'producto_cod' && typeof value === 'string' && value.trim()) {
      const entry = productEntries.find(e => e.id === id);
      if (entry?.has_unit_price) {
        const result = await validateProduct(value.trim());
        if (result.success && result.product) {
          setProductEntries(prev => prev.map(e => 
            e.id === id ? { ...e, precio_compra: result.product!.p_compra.toString() } : e
          ));
        }
      }
    }

    // Si cambia has_unit_price a false, limpiar precio_compra
    if (field === 'has_unit_price' && !value) {
      setProductEntries(prev => prev.map(e => 
        e.id === id ? { ...e, precio_compra: '' } : e
      ));
    }
  };

  // 🔌 BUSCAR CLIENTE POR DOCUMENTO
  const handleCustomerDocChange = async (doc: string) => {
    handleFormDataChange('cliente_doc', doc);
    
    if (doc.trim()) {
      const result = await searchCustomerByDoc(doc.trim());
      if (result.success && result.customer) {
        handleFormDataChange('cliente_id', result.customer.id.toString());
      } else if (doc === '') {
        handleFormDataChange('cliente_id', '');
      }
    }
  };

  // 🔌 SELECCIONAR CLIENTE POR DROPDOWN
  const handleCustomerSelect = (customerId: string) => {
    handleFormDataChange('cliente_id', customerId);
    const selectedCustomer = customers.find(c => c.id.toString() === customerId);
    if (selectedCustomer) {
      handleFormDataChange('cliente_doc', selectedCustomer.doc || '');
    } else {
      handleFormDataChange('cliente_doc', '');
    }
  };

  const addProductEntry = () => {
    const newId = Date.now().toString();
    setProductEntries(prev => [...prev, {
      id: newId,
      producto_cod: '',
      cantidad: '',
      precio_compra: '',
      has_unit_price: true
    }]);
  };

  const removeProductEntry = (id: string) => {
    if (productEntries.length > 1) {
      setProductEntries(prev => prev.filter(entry => entry.id !== id));
      
      // Limpiar errores relacionados
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${id}_`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  };

  // =============================================
  // CALCULATIONS (same as before)
  // =============================================
  const allHaveUnitPrice = (): boolean => {
    return productEntries.every(entry => entry.has_unit_price && entry.precio_compra);
  };

  const hasProductsWithoutPrice = (): boolean => {
    return productEntries.some(entry => !entry.has_unit_price);
  };

  const calculateFixedPricesTotal = (): number => {
    return productEntries.reduce((total, entry) => {
      if (entry.has_unit_price && entry.cantidad && entry.precio_compra) {
        return total + (parseFloat(entry.cantidad) * parseFloat(entry.precio_compra));
      }
      return total;
    }, 0);
  };

  const getProductsWithoutPriceCount = (): number => {
    return productEntries.reduce((total, entry) => {
      if (!entry.has_unit_price && entry.cantidad) {
        return total + parseFloat(entry.cantidad);
      }
      return total;
    }, 0);
  };

  const calculateAutoUnitPrice = (): number => {
    const totalPagado = parseFloat(formData.total_pagado) || 0;
    const fixedTotal = calculateFixedPricesTotal();
    const remainingAmount = totalPagado - fixedTotal;
    const productsWithoutPriceCount = getProductsWithoutPriceCount();
    
    if (productsWithoutPriceCount > 0 && remainingAmount > 0) {
      return remainingAmount / productsWithoutPriceCount;
    }
    return 0;
  };

  const calculateSubtotal = (): number => {
    return calculateFixedPricesTotal();
  };

  const calculateIGV = (): number => {
    if (formData.incluye_igv && allHaveUnitPrice() && formData.total_pagado) {
      const subtotal = calculateSubtotal();
      const totalPagado = parseFloat(formData.total_pagado);
      return Math.max(0, totalPagado - subtotal);
    }
    return 0;
  };

  const calculateTotalWithIGV = (): number => {
    if (formData.incluye_igv && allHaveUnitPrice() && formData.total_pagado) {
      return parseFloat(formData.total_pagado);
    }
    return calculateSubtotal();
  };

  const calculateTotalCost = (): number => {
    if (allHaveUnitPrice()) {
      if (formData.incluye_igv) {
        return calculateTotalWithIGV();
      }
      return calculateFixedPricesTotal();
    } else if (formData.total_pagado) {
      return parseFloat(formData.total_pagado);
    }
    return calculateFixedPricesTotal();
  };

  // =============================================
  // VALIDATION (same as before)
  // =============================================
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (productEntries.length === 0) {
      newErrors.general = 'Debe agregar al menos un producto';
      setErrors(newErrors);
      return false;
    }

    productEntries.forEach(entry => {
      if (!entry.producto_cod) {
        newErrors[`${entry.id}_producto_cod`] = 'Debe seleccionar un producto';
      }

      if (!entry.cantidad || parseFloat(entry.cantidad) <= 0) {
        newErrors[`${entry.id}_cantidad`] = 'La cantidad debe ser mayor a 0';
      }

      if (entry.has_unit_price && (!entry.precio_compra || parseFloat(entry.precio_compra) <= 0)) {
        newErrors[`${entry.id}_precio_compra`] = 'El precio debe ser mayor a 0';
      }
    });

    // Validar productos duplicados
    const productCodes = productEntries.map(e => e.producto_cod).filter(Boolean);
    const duplicates = productCodes.filter((code, index) => productCodes.indexOf(code) !== index);
    
    if (duplicates.length > 0) {
      productEntries.forEach(entry => {
        if (duplicates.includes(entry.producto_cod)) {
          newErrors[`${entry.id}_producto_cod`] = 'Producto duplicado';
        }
      });
    }

    if (hasProductsWithoutPrice() && (!formData.total_pagado || parseFloat(formData.total_pagado) <= 0)) {
      newErrors.total_pagado = 'Debe ingresar el total pagado';
    }

    if (hasProductsWithoutPrice() && formData.total_pagado) {
      const fixedTotal = calculateFixedPricesTotal();
      const totalPagado = parseFloat(formData.total_pagado);
      if (totalPagado <= fixedTotal) {
        newErrors.total_pagado = `Debe ser mayor a S/${fixedTotal.toFixed(2)} (total de productos con precio fijo)`;
      }
    }

    if (formData.incluye_igv && allHaveUnitPrice() && formData.total_pagado) {
      const subtotal = calculateSubtotal();
      const totalPagado = parseFloat(formData.total_pagado);
      if (totalPagado < subtotal) {
        newErrors.total_pagado = `Debe ser al menos S/${subtotal.toFixed(2)} (subtotal sin IGV)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================
  // 🔌 SUBMIT WITH BACKEND
  // =============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const autoUnitPrice = calculateAutoUnitPrice();
    
    // Preparar datos para el backend
    const stockEntryData = {
      cliente_id: formData.cliente_id ? parseInt(formData.cliente_id) : undefined,
      cliente_doc: formData.cliente_doc || undefined,
      observaciones: formData.observaciones || undefined,
      total_pagado: calculateTotalCost(),
      incluye_igv: formData.incluye_igv,
      productos: productEntries.map(entry => ({
        producto_cod: entry.producto_cod,
        cantidad: parseFloat(entry.cantidad),
        precio_compra: entry.has_unit_price 
          ? parseFloat(entry.precio_compra)
          : autoUnitPrice,
        precio_calculado_automaticamente: !entry.has_unit_price
      }))
    };

    console.log('🚀 Enviando entrada de stock:', stockEntryData);
    
    const result = await createStockEntry(stockEntryData);
    
    if (result.success) {
      console.log('✅ Entrada registrada exitosamente:', result.entry?.id);
      onSuccess();
    } else {
      console.error('❌ Error al registrar entrada:', result.error);
      setErrors({ submit: result.error || 'Error al registrar la entrada de stock' });
    }
  };

  const getSelectedProduct = (codigo: string): Product | undefined => {
    return products.find(p => p.cod === codigo);
  };

  const fixedTotal = calculateFixedPricesTotal();
  const remainingAmount = formData.total_pagado ? parseFloat(formData.total_pagado) - fixedTotal : 0;
  const autoUnitPrice = calculateAutoUnitPrice();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <h3 className="modal__title">
            <span className="modal__icon">➕</span>
            {product ? 'Entrada Rápida' : 'Nueva Entrada'} de Stock
          </h3>
          <button className="modal__close" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            {/* Lista de productos */}
            <div className="form-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <label className="form-label required">📦 Productos a ingresar</label>
                {!product && (
                  <button 
                    type="button" 
                    className="btn btn--secondary btn--sm"
                    onClick={addProductEntry}
                    disabled={isSubmitting}
                  >
                    ➕ Agregar producto
                  </button>
                )}
              </div>

              {/* 🔄 Loading state para productos */}
              {isLoadingProducts && (
                <div className="form-info" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                  <span>🔄 Cargando productos...</span>
                </div>
              )}

              {productEntries.map((entry, index) => {
                const selectedProd = getSelectedProduct(entry.producto_cod);
                
                return (
                  <div key={entry.id} className="form-info" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                      <span style={{ 
                        fontSize: '1.125rem',
                        fontWeight: '800',
                        color: 'var(--primary)',
                        display: 'block',
                        marginBottom: 'var(--spacing-sm)'
                      }}>
                        📦 Producto #{index + 1}
                      </span>
                      {!product && productEntries.length > 1 && (
                        <button 
                          type="button" 
                          className="btn btn--tertiary btn--sm"
                          onClick={() => removeProductEntry(entry.id)}
                          disabled={isSubmitting}
                          style={{ color: 'var(--error)' }}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>

                    {/* Selección de producto */}
                    <div className="form-group">
                      {product && index === 0 ? (
                        <div className="form-info">
                          <div className="form-info__item">
                            <span className="form-info__label">Código:</span>
                            <span className="form-info__value">#{product.cod}</span>
                          </div>
                          <div className="form-info__item">
                            <span className="form-info__label">Descripción:</span>
                            <span className="form-info__value">{product.descripcion}</span>
                          </div>
                          <div className="form-info__item">
                            <span className="form-info__label">Stock actual:</span>
                            <span className="form-info__value">
                              {product.stock} {product.unidad === 'U' ? 'unidades' : product.unidad === 'K' ? 'kg' : product.unidad === 'P' ? 'paquetes' : product.unidad}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label className="form-label required">🔍 Buscar producto</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-sm)' }}>
                            {/* Input para código */}
                            <input
                              type="text"
                              placeholder="Código: 001"
                              value={entry.producto_cod}
                              onChange={(e) => handleProductEntryChange(entry.id, 'producto_cod', e.target.value.toUpperCase())}
                              className={`form-input ${errors[`${entry.id}_producto_cod`] ? 'form-input--error' : ''}`}
                              disabled={isSubmitting || isLoadingProducts}
                              style={{ textTransform: 'uppercase' }}
                            />
                            {/* Select para descripción */}
                            <select
                              value={entry.producto_cod}
                              onChange={(e) => handleProductEntryChange(entry.id, 'producto_cod', e.target.value)}
                              className={`form-select ${errors[`${entry.id}_producto_cod`] ? 'form-input--error' : ''}`}
                              disabled={isSubmitting || isLoadingProducts}
                            >
                              <option value="">
                                {isLoadingProducts ? 'Cargando productos...' : 'Seleccionar por descripción...'}
                              </option>
                              {products.map(prod => (
                                <option key={prod.cod} value={prod.cod}>
                                  #{prod.cod} - {prod.descripcion} (Stock: {prod.stock})
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Mostrar producto seleccionado */}
                          {selectedProd && (
                            <div className="form-help" style={{ 
                              background: 'var(--primary-light)', 
                              padding: 'var(--spacing-xs) var(--spacing-sm)', 
                              borderRadius: 'var(--radius-sm)', 
                              marginTop: 'var(--spacing-xs)',
                              color: 'var(--primary)',
                              fontWeight: '600'
                            }}>
                              ✅ Seleccionado: #{selectedProd.cod} - {selectedProd.descripcion}
                            </div>
                          )}
                          {errors[`${entry.id}_producto_cod`] && (
                            <span className="form-error">{errors[`${entry.id}_producto_cod`]}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Checkbox para precio unitario */}
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={entry.has_unit_price}
                          onChange={(e) => handleProductEntryChange(entry.id, 'has_unit_price', e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <span className="form-label" style={{ margin: 0 }}>
                          💰 Tiene precio unitario conocido
                        </span>
                      </label>
                      <span className="form-help">
                        {entry.has_unit_price 
                          ? 'Se usará el precio unitario que ingreses'
                          : 'El precio se calculará automáticamente del total pagado'
                        }
                      </span>
                    </div>

                    {/* Cantidad y precio en la misma fila */}
                    <div style={{ display: 'grid', gridTemplateColumns: entry.has_unit_price ? '1fr 1fr' : '1fr', gap: 'var(--spacing-md)' }}>
                      <div className="form-group">
                        <label className="form-label required">📊 Cantidad</label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Ej: 50"
                          value={entry.cantidad}
                          onChange={(e) => handleProductEntryChange(entry.id, 'cantidad', e.target.value)}
                          className={`form-input ${errors[`${entry.id}_cantidad`] ? 'form-input--error' : ''}`}
                          disabled={isSubmitting}
                        />
                        {errors[`${entry.id}_cantidad`] && (
                          <span className="form-error">{errors[`${entry.id}_cantidad`]}</span>
                        )}
                      </div>

                      {entry.has_unit_price && (
                        <div className="form-group">
                          <label className="form-label required">💰 Precio unitario</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.precio_compra}
                            onChange={(e) => handleProductEntryChange(entry.id, 'precio_compra', e.target.value)}
                            className={`form-input ${errors[`${entry.id}_precio_compra`] ? 'form-input--error' : ''}`}
                            disabled={isSubmitting}
                          />
                          {errors[`${entry.id}_precio_compra`] && (
                            <span className="form-error">{errors[`${entry.id}_precio_compra`]}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Vista previa para este producto */}
                    {selectedProd && entry.cantidad && (entry.has_unit_price ? entry.precio_compra : autoUnitPrice > 0) && (
                      <div className="form-preview">
                        <label className="form-preview__label">Vista previa:</label>
                        <div className="form-preview__content">
                          <div className="form-info">
                            <div className="form-info__item">
                              <span className="form-info__label">Stock actual:</span>
                              <span className="form-info__value">
                                {selectedProd.stock} {selectedProd.unidad === 'U' ? 'unidades' : selectedProd.unidad === 'K' ? 'kg' : selectedProd.unidad === 'P' ? 'paquetes' : selectedProd.unidad}
                              </span>
                            </div>
                            <div className="form-info__item">
                              <span className="form-info__label">Stock después:</span>
                              <span className="form-info__value" style={{ color: 'var(--success)' }}>
                                {selectedProd.stock + parseFloat(entry.cantidad)} {selectedProd.unidad === 'U' ? 'unidades' : selectedProd.unidad === 'K' ? 'kg' : selectedProd.unidad === 'P' ? 'paquetes' : selectedProd.unidad}
                              </span>
                            </div>
                            <div className="form-info__item">
                              <span className="form-info__label">Precio unitario:</span>
                              <span className="form-info__value">
                                S/ {entry.has_unit_price ? parseFloat(entry.precio_compra).toFixed(2) : autoUnitPrice.toFixed(2)}
                                {!entry.has_unit_price && <small style={{ color: 'var(--text-muted)' }}> (calculado)</small>}
                              </span>
                            </div>
                            <div className="form-info__item">
                              <span className="form-info__label">Subtotal:</span>
                              <span className="form-info__value">
                                S/ {(parseFloat(entry.cantidad) * (entry.has_unit_price ? parseFloat(entry.precio_compra) : autoUnitPrice)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* IGV */}
            {allHaveUnitPrice() && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.incluye_igv}
                    onChange={(e) => handleFormDataChange('incluye_igv', e.target.checked.toString())}
                    disabled={isSubmitting}
                  />
                  <span className="form-label" style={{ margin: 0 }}>
                    🧾 Hay IGV en la factura
                  </span>
                </label>
                <span className="form-help">
                  Marcar si el documento incluye IGV. Deberás ingresar el total pagado más abajo.
                  <br />
                  <small style={{ color: 'var(--warning)' }}>⚠️ Funcionalidad sujeta a cambios - por ahora IGV = Total pagado - Subtotal</small>
                </span>
              </div>
            )}

            {/* Resumen IGV */}
            {formData.incluye_igv && allHaveUnitPrice() && (
              <div className="form-info">
                <div className="form-info__item">
                  <span className="form-info__label">💰 Subtotal (sin IGV):</span>
                  <span className="form-info__value">S/ {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="form-info__item">
                  <span className="form-info__label">🧾 IGV calculado:</span>
                  <span className="form-info__value">S/ {calculateIGV().toFixed(2)}</span>
                </div>
                <div className="form-info__item">
                  <span className="form-info__label">💵 Total con IGV:</span>
                  <span className="form-info__value" style={{ fontWeight: '700', color: 'var(--primary)' }}>
                    S/ {calculateTotalWithIGV().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Total pagado */}
            {(hasProductsWithoutPrice() || (formData.incluye_igv && allHaveUnitPrice())) && (
              <div className="form-group">
                <label htmlFor="total_pagado" className="form-label required">
                  💵 Total pagado en la compra
                </label>
                <input
                  id="total_pagado"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_pagado}
                  onChange={(e) => handleFormDataChange('total_pagado', e.target.value)}
                  className={`form-input ${errors.total_pagado ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.total_pagado && (
                  <span className="form-error">{errors.total_pagado}</span>
                )}
                <span className="form-help">
                  {hasProductsWithoutPrice() 
                    ? 'Monto total de la boleta/factura. Se distribuirá proporcionalmente entre productos sin precio.'
                    : 'Monto total pagado (debe ser mayor o igual al total con IGV calculado)'
                  }
                </span>
              </div>
            )}

            {/* Resumen de distribución */}
            {hasProductsWithoutPrice() && formData.total_pagado && (
              <div className="form-info">
                <div className="form-info__item">
                  <span className="form-info__label">💰 Productos con precio fijo:</span>
                  <span className="form-info__value">S/ {fixedTotal.toFixed(2)}</span>
                </div>
                <div className="form-info__item">
                  <span className="form-info__label">📊 A distribuir:</span>
                  <span className="form-info__value">S/ {remainingAmount.toFixed(2)}</span>
                </div>
                <div className="form-info__item">
                  <span className="form-info__label">🔢 Productos sin precio:</span>
                  <span className="form-info__value">{getProductsWithoutPriceCount()} unidades</span>
                </div>
                {autoUnitPrice > 0 && (
                  <div className="form-info__item">
                    <span className="form-info__label">⚡ Precio calculado c/u:</span>
                    <span className="form-info__value" style={{ color: 'var(--warning)' }}>
                      S/ {autoUnitPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total general */}
            <div className="form-info">
              <div className="form-info__item">
                <span className="form-info__label">💵 Total de la entrada:</span>
                <span className="form-info__value" style={{ fontSize: '1.2em', fontWeight: '700', color: 'var(--primary)' }}>
                  S/ {calculateTotalCost().toFixed(2)}
                  {allHaveUnitPrice() && !formData.incluye_igv && <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}> (calculado)</small>}
                  {allHaveUnitPrice() && formData.incluye_igv && !formData.total_pagado && <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}> (con IGV)</small>}
                  {formData.total_pagado && <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}> (ingresado)</small>}
                </span>
              </div>
              {formData.incluye_igv && allHaveUnitPrice() && formData.total_pagado && (
                <div className="form-info__item">
                  <span className="form-info__label">💰 Diferencia pagada:</span>
                  <span className="form-info__value" style={{ color: parseFloat(formData.total_pagado) > calculateTotalWithIGV() ? 'var(--success)' : 'var(--text-muted)' }}>
                    S/ {(parseFloat(formData.total_pagado) - calculateTotalWithIGV()).toFixed(2)}
                    {parseFloat(formData.total_pagado) > calculateTotalWithIGV() && <small> (propina/redondeo)</small>}
                  </span>
                </div>
              )}
            </div>

            {/* Proveedor - CON CONEXIÓN BACKEND */}
            <div className="form-group">
              <label htmlFor="proveedor" className="form-label">
                🏪 Proveedor (opcional)
              </label>
              
              {/* 🔄 Loading state para clientes */}
              {isLoadingCustomers && (
                <div className="form-help" style={{ color: 'var(--warning)' }}>
                  🔄 Cargando clientes...
                </div>
              )}
              
              {/* Input para buscar por documento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                <input
                  type="text"
                  placeholder="DNI/RUC: 12345678"
                  value={formData.cliente_doc || ''}
                  onChange={(e) => handleCustomerDocChange(e.target.value)}
                  className="form-input"
                  disabled={isSubmitting || isLoadingCustomers}
                />
                
                <select
                  id="proveedor"
                  value={formData.cliente_id}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting || isLoadingCustomers}
                >
                  <option value="">
                    {isLoadingCustomers ? 'Cargando clientes...' : 'Seleccionar por nombre...'}
                  </option>
                  <optgroup label="Empresas">
                    {customers.filter(c => c.tipo === 'E').map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.nom} - {customer.doc ? `RUC: ${customer.doc}` : 'Sin documento'}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Personas">
                    {customers.filter(c => c.tipo === 'P').map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.nom} - {customer.doc ? `DNI: ${customer.doc}` : 'Sin documento'}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Mostrar cliente seleccionado */}
              {formData.cliente_id && (
                <div className="form-help" style={{ 
                  background: 'var(--primary-light)', 
                  padding: 'var(--spacing-xs) var(--spacing-sm)', 
                  borderRadius: 'var(--radius-sm)', 
                  marginTop: 'var(--spacing-xs)',
                  color: 'var(--primary)',
                  fontWeight: '600'
                }}>
                  ✅ Seleccionado: {customers.find(c => c.id.toString() === formData.cliente_id)?.nom}
                  {customers.find(c => c.id.toString() === formData.cliente_id)?.doc && 
                    ` - ${customers.find(c => c.id.toString() === formData.cliente_id)?.doc}`
                  }
                </div>
              )}
              
              <span className="form-help">Busca por DNI/RUC o selecciona por nombre del proveedor</span>
            </div>

            {/* Observaciones */}
            <div className="form-group">
              <label htmlFor="observaciones" className="form-label">
                📝 Observaciones
              </label>
              <textarea
                id="observaciones"
                placeholder="Detalles adicionales sobre esta entrada..."
                value={formData.observaciones}
                onChange={(e) => handleFormDataChange('observaciones', e.target.value)}
                className="form-input"
                rows={3}
                disabled={isSubmitting}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            {/* Error general */}
            {(errors.submit || errors.general || submitError) && (
              <div className="form-error" style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
                {errors.submit || errors.general || submitError}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button 
            type="button" 
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting || productEntries.length === 0 || isLoadingProducts}
          >
            {isSubmitting && <span className="btn__spinner"></span>}
            {isSubmitting ? 'Registrando...' : `✅ Registrar ${productEntries.length} producto${productEntries.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockEntryForm;