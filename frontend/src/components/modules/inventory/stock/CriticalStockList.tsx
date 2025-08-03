// frontend/src/components/modules/inventory/stock/CriticalStockList.tsx
import React from 'react';
import StockCard from './StockCard';
import type { Product } from '../../../../types/inventory.types';

interface CriticalStockListProps {
  products: Product[];
  onQuickEntry: (product: Product) => void;
  loading?: boolean;
}

const CriticalStockList: React.FC<CriticalStockListProps> = ({
  products,
  onQuickEntry,
  loading = false
}) => {
  
  if (loading) {
    return (
      <div className="critical-stock-loading">
        <div className="loading-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stock-card-skeleton">
              <div className="skeleton-header"></div>
              <div className="skeleton-content"></div>
              <div className="skeleton-button"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="critical-stock-list">
      <div className="stock-grid">
        {products.map((product) => (
          <StockCard
            key={product.cod}
            product={product}
            onAddStock={() => onQuickEntry(product)}
          />
        ))}
      </div>
      
      {products.length > 6 && (
        <div className="stock-list-footer">
          <button className="btn btn--tertiary btn--sm">
            Ver todos los productos críticos ({products.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default CriticalStockList;