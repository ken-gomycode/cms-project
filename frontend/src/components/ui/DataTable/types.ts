import { ReactNode } from 'react';

export interface Column<T> {
  /** Column header label */
  header: string;
  /** Accessor key or function to get cell value */
  accessor: keyof T | ((row: T) => any);
  /** Custom cell renderer */
  cell?: (value: any, row: T) => ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Column width class */
  width?: string;
}

export interface DataTableProps<T> {
  /** Table columns configuration */
  columns: Column<T>[];
  /** Table data */
  data: T[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row IDs */
  selectedIds?: string[];
  /** Callback when selection changes */
  onSelectionChange?: (ids: string[]) => void;
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void;
  /** Pagination */
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  /** Sorting */
  sorting?: {
    column: string;
    order: 'asc' | 'desc';
    onSortChange: (column: string, order: 'asc' | 'desc') => void;
  };
}
