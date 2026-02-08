import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '../Checkbox';
import { Spinner } from '../Spinner';
import { DataTableProps } from './types';
import { DataTablePagination } from './DataTablePagination';

/**
 * Reusable data table with sorting, pagination, and selection
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { header: 'Title', accessor: 'title', sortable: true },
 *     { header: 'Status', accessor: 'status', cell: (val) => <Badge status={val} /> }
 *   ]}
 *   data={contents}
 *   isLoading={isLoading}
 *   pagination={{ page, totalPages, onPageChange }}
 * />
 * ```
 */
export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  pagination,
  sorting,
}: DataTableProps<T>) {
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = () => {
    if (onSelectionChange) {
      onSelectionChange(isAllSelected ? [] : data.map((row) => row.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (onSelectionChange) {
      const newSelection = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelection);
    }
  };

  const handleSort = (columnAccessor: string) => {
    if (!sorting) return;

    const newOrder = sorting.column === columnAccessor && sorting.order === 'asc' ? 'desc' : 'asc';
    sorting.onSortChange(columnAccessor, newOrder);
  };

  const getCellValue = (row: T, accessor: any) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor as keyof T];
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className={isIndeterminate ? 'opacity-50' : ''}
                  />
                </th>
              )}
              {columns.map((column, index) => {
                const accessor =
                  typeof column.accessor === 'string' ? column.accessor : `column-${index}`;
                const isSorted = sorting?.column === accessor;
                const sortOrder = isSorted ? sorting?.order : undefined;

                return (
                  <th
                    key={accessor}
                    className={`
                      px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider
                      ${column.width || ''}
                      ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}
                    `}
                    onClick={() => column.sortable && handleSort(accessor)}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && (
                        <span className="text-gray-400">
                          {!isSorted && <ChevronsUpDown size={14} />}
                          {isSorted && sortOrder === 'asc' && <ArrowUp size={14} />}
                          {isSorted && sortOrder === 'desc' && <ArrowDown size={14} />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12">
                  <div className="flex justify-center">
                    <Spinner size="md" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${selectedIds.includes(row.id) ? 'bg-primary-50' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((column, index) => {
                    const accessor =
                      typeof column.accessor === 'string' ? column.accessor : `column-${index}`;
                    const value = getCellValue(row, column.accessor);

                    return (
                      <td key={accessor} className="px-4 py-3 text-sm text-gray-900">
                        {column.cell ? column.cell(value, row) : value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !isLoading && data.length > 0 && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
