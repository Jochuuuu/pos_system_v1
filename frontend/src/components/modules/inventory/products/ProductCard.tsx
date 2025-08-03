// frontend/src/components/modules/inventory/products/ProductCard.tsx
import React from 'react';
import type { Product } from '../../../../types/inventory.types';

// Constante para la imagen por defecto - SIMPLE
const DEFAULT_IMAGE = '/src/components/modules/inventory/products/default.png';

interface ProductCardProps {
  product: Product;  // 🔧 Usar tipo compartido directamente
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  userRole: 'A' | 'S' | 'C';  // 🔐 AGREGADO: Rol del usuario para permisos
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onViewDetails,
  userRole
}) => {
  const isLowStock = product.stock <= 10;
  const isOutOfStock = product.stock === 0;

  // 🔐 SISTEMA DE PERMISOS - Configuración centralizada
  const permissions = {
    canViewCompra: userRole === 'A' || userRole === 'S',         // 💰 Solo Admin y Supervisor ven precio compra
    canViewVenta: true,                                          // 💵 TODOS ven precio venta (incluye Cajeros)
    canEdit: userRole === 'A',                                   // ✏️ Solo Admin puede editar
    canDelete: false,                                            // 🚫 Nadie puede eliminar desde cards (futuro)
    canViewDetails: true                                         // 👁️ Todos pueden ver detalles
  };

  // 🔧 FÁCIL DE MODIFICAR - Para cambiar permisos, edita estas líneas:
  // canViewCompra: userRole === 'A',                 // Solo Admin ve precio compra
  // canViewVenta: true,                              // Todos ven precio venta
  // canEdit: userRole === 'A' || userRole === 'S',  // Admin y Supervisor pueden editar
  // canDelete: userRole === 'A',                     // Solo Admin puede eliminar

  return (
    <div className={`product-card ${!product.activo ? 'product-card--inactive' : ''}`}>
      {/* Imagen del producto */}
      <div className="product-card__image">
        <img 
          src={DEFAULT_IMAGE}
          alt={product.descripcion}
        />
        {isOutOfStock && (
          <div className="product-card__badge product-card__badge--danger">
            Sin Stock
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="product-card__badge product-card__badge--warning">
            Stock Bajo
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="product-card__content">
        <div className="product-card__header">
          <h4 className="product-card__title">{product.descripcion}</h4>
          <span className="product-card__code">{product.cod}</span>
        </div>

        <div className="product-card__details">
          <div className="product-card__category">
            <span className="product-card__category-label">Subfamilia ID:</span>
            <span className="product-card__category-value">{product.subfamilia}</span>
          </div>

          {/* 🔐 PRECIO COMPRA - Solo si tiene permisos */}
          {permissions.canViewCompra ? (
            <div className="product-card__price">
              <span className="product-card__price-label">P. Compra:</span>
              <span className="product-card__price-value">S/ {product.p_compra.toFixed(2)}</span>
            </div>
          ) : null}

          {/* 🔐 PRECIO VENTA - Solo si tiene permisos */}
          {permissions.canViewVenta ? (
            <div className="product-card__price">
              <span className="product-card__price-label">P. Venta:</span>
              <span className="product-card__price-value product-card__price-value--primary">S/ {product.p_venta.toFixed(2)}</span>
            </div>
          ) : null}



          <div className={`product-card__stock ${isLowStock ? 'product-card__stock--warning' : ''} ${isOutOfStock ? 'product-card__stock--danger' : ''}`}>
            <span className="product-card__stock-label">Stock:</span>
            <span className="product-card__stock-value">
              {product.unidad === 'K' 
                ? `${product.stock} kg`
                : product.unidad === 'P' 
                  ? `${product.stock} ${product.stock === 1 ? 'paquete' : 'paquetes'}`
                  : `${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'}`
              }
            </span>
          </div>
        </div>

        {/* Acciones - Con permisos aplicados */}
        <div className="product-card__actions">
          {/* 👁️ Ver detalles - Disponible para todos si está habilitado */}
          {onViewDetails && permissions.canViewDetails && (
            <button
              className="action-btn action-btn--info action-btn--sm"
              onClick={() => onViewDetails(product)}
              title="Ver detalles"
            >
              👁️
            </button>
          )}
          
          {/* ✏️ Editar - Deshabilitado por ahora (futuro) */}
          <button
            className={`action-btn action-btn--primary action-btn--sm ${!permissions.canEdit ? 'action-btn--disabled' : ''}`}
            onClick={() => permissions.canEdit && onEdit(product)}
            disabled={!permissions.canEdit}
            title={permissions.canEdit ? "Editar producto" : "Edición no disponible"}
          >
            ✏️
          </button>
          
          {/* 🗑️ Eliminar - Deshabilitado por ahora (futuro) */}
          <button
            className={`action-btn action-btn--danger action-btn--sm ${!permissions.canDelete ? 'action-btn--disabled' : ''}`}
            onClick={() => permissions.canDelete && onDelete(product)}
            disabled={!permissions.canDelete}
            title={permissions.canDelete ? "Eliminar producto" : "Eliminación no disponible"}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;