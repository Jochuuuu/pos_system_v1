// frontend/src/components/modules/inventory/stock/StockCard.tsx
import React from 'react';
import type { Product } from '../../../../types/inventory.types';

interface StockCardProps {
  product: Product;
  onAddStock: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ product, onAddStock }) => {
  
  // Determinar nivel de criticidad y color
  const getCriticalityLevel = (stock: number) => {
    if (stock === 0) return { level: 'AGOTADO', color: 'error', icon: '🔴' };
    if (stock <= 5) return { level: 'CRÍTICO', color: 'warning', icon: '🟡' };
    if (stock < 10) return { level: 'BAJO', color: 'info', icon: '🟠' };
    return { level: 'NORMAL', color: 'success', icon: '🟢' };
  };

  const criticality = getCriticalityLevel(product.stock);

  return (
    <div className={`stock-card stock-card--${criticality.color}`}>
      {/* Header con estado crítico */}
      <div className="stock-card-header">
        <div className="stock-status">
          <span className="status-icon">{criticality.icon}</span>
          <span className={`status-label status-label--${criticality.color}`}>
            {criticality.level}
          </span>
        </div>
        <div className="stock-code">#{product.cod}</div>
      </div>

      {/* Información del producto */}
      <div className="stock-card-content">
        <h4 className="product-name" title={product.descripcion}>
          {product.descripcion}
        </h4>
        
        <div className="stock-info">
          <div className="stock-current">
            <span className="stock-label">Stock actual:</span>
            <span className={`stock-value stock-value--${criticality.color}`}>
              {product.stock} {product.unidad === 'U' ? 'unidades' : product.unidad === 'K' ? 'kg' : 'paquetes'}
            </span>
          </div>
          
          <div className="stock-price">
            <span className="price-label">Precio venta:</span>
            <span className="price-value">S/ {product.p_venta.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Acción principal */}
      <div className="stock-card-actions">
        <button 
          className="btn btn--primary btn--block stock-add-btn"
          onClick={onAddStock}
        >
          ➕ Agregar Stock
        </button>
        
        {product.stock === 0 && (
          <div className="urgent-notice">
            ⚠️ Producto agotado
          </div>
        )}
      </div>

      {/* Indicador visual lateral */}
      <div className={`criticality-indicator criticality-indicator--${criticality.color}`}></div>
    </div>
  );
};

export default StockCard;