// frontend/src/types/inventory.types.ts
// Tipos compartidos para el módulo de inventario

export interface Subfamilia {
  id: number;
  nom: string;
  productCount?: number;
}

export interface Familia {
  id: number;
  nom: string;
  subfamilias: Subfamilia[];
  productCount?: number;
}

export interface Product {
  cod: string;              // Código de barras (VARCHAR(15))
  descripcion: string;      // VARCHAR(45)
  p_compra: number;         // Precio de compra
  p_venta: number;          // Precio de venta
  unidad: 'U' | 'K' | 'P';  // U=Unidad, K=Kg, P=Paquete
  stock: number;            // DECIMAL(8,3)
  sub_id: number;           // Referencia a subfamilia
  subfamilia: number;       // sub_id (para consistencia)
  activo?: boolean;         // Producto activo/inactivo
}



export interface StockFilters {
  criticidad: 'all' | 'AGOTADO' | 'CRITICO' | 'BAJO';
  subfamilia_id?: number;
  search: string;
}