// frontend/src/components/modules/customers/index.ts

// 📦 Barrel exports para el módulo de clientes
export { default as CustomerList } from './CustomerList';
export { default as CustomerForm } from './CustomerForm';
export { default as CustomerSearch } from './CustomerSearch';

// 🎯 Re-exportar tipos para conveniencia
export type { 
  Customer, 
  CustomerFormData, 
  CustomerFilters,
  CustomerListProps,
  CustomerFormProps,
  CustomerSearchProps 
} from '../../../types/customer.types';

// 🏪 Re-exportar stores y hooks
export { 
  useCustomersStore,
  useCustomersData,
  useCustomersLoading,
  useCustomersError,
  useCustomersModal,
  useCustomerActions
} from '../../../stores/customersStore';