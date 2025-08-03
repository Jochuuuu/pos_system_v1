// frontend/src/types/customer.types.ts

// 🧑‍💼 Tipo principal de cliente
export interface Customer {
  id: number;
  doc: string | null;              // DNI/RUC/Pasaporte
  nom: string | null;              // Nombre completo
  dir: string | null;              // Dirección
  telefono: string | null;         // Teléfono
  email: string | null;            // Email
  tipo: 'P' | 'E';                // P=Persona, E=Empresa
}

// 📝 Datos para crear/editar cliente
export interface CustomerFormData {
  doc: string;
  nom: string;
  dir: string;
  telefono: string;
  email: string;
  tipo: 'P' | 'E';
}

// 🔍 Filtros para búsqueda de clientes
export interface CustomerFilters {
  search: string;                  // Búsqueda general (nombre, doc, email)
  tipo: 'all' | 'P' | 'E';        // Filtro por tipo
  sortBy: 'nom' | 'doc' | 'created'; // Ordenar por
  sortOrder: 'asc' | 'desc';      // Orden
}

// 📊 Paginación para clientes
export interface CustomerPagination {
  page: number;                    // Página actual
  limit: number;                   // Elementos por página
  total: number;                   // Total de elementos
  totalPages: number;              // Total de páginas
}

// 📋 Response de la API para lista de clientes
export interface CustomersResponse {
  data: Customer[];
  pagination: CustomerPagination;
  filters: CustomerFilters;
}

// ⚡ Estado de loading para operaciones
export interface CustomerLoadingState {
  list: boolean;                   // Cargando lista
  create: boolean;                 // Creando cliente
  update: boolean;                 // Actualizando cliente
  delete: boolean;                 // Eliminando cliente
}

// 🚨 Errores específicos de clientes
export interface CustomerError {
  field?: string;                  // Campo específico con error
  message: string;                 // Mensaje de error
  code?: string;                   // Código de error
}

// 🎯 Estado completo del store de clientes
export interface CustomerState {
  // 📊 Datos
  customers: Customer[];
  currentCustomer: Customer | null;
  
  // 🔍 Filtros y paginación
  filters: CustomerFilters;
  pagination: CustomerPagination;
  
  // ⚡ Estados de carga
  loading: CustomerLoadingState;
  
  // 🚨 Errores
  error: CustomerError | null;
  
  // 🎛️ UI States
  isModalOpen: boolean;
  modalMode: 'create' | 'edit' | 'view';
}

// 🛠️ Acciones del store de clientes
export interface CustomerActions {
  // 📋 CRUD operations
  fetchCustomers: (filters?: Partial<CustomerFilters>) => Promise<void>;
  createCustomer: (data: CustomerFormData) => Promise<Customer>;
  updateCustomer: (id: number, data: Partial<CustomerFormData>) => Promise<Customer>;
  deleteCustomer: (id: number) => Promise<void>;
  
  // 🔍 Búsqueda y filtros
  setFilters: (filters: Partial<CustomerFilters>) => void;
  setPagination: (pagination: Partial<CustomerPagination>) => void;
  searchCustomers: (query: string) => Promise<void>;
  
  // 🎛️ UI Actions
  openModal: (mode: 'create' | 'edit' | 'view', customer?: Customer) => void;
  closeModal: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
  
  // 🧹 Utilidades
  clearError: () => void;
  resetFilters: () => void;
}

// 📝 Props para componentes de clientes
export interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void;
  readonly?: boolean;
  showActions?: boolean;
}

export interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  showActions?: boolean;
}

export interface CustomerSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

// 🎨 Opciones de UI
export const CUSTOMER_TYPES = {
  P: 'Persona',
  E: 'Empresa'
} as const;

export const CUSTOMER_SORT_OPTIONS = {
  nom: 'Nombre',
  doc: 'Documento', 
  created: 'Fecha de registro'
} as const;