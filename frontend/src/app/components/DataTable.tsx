import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Column {
  key: string;
  header: React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

export function DataTable({ data, columns, pageSize = 10, defaultSortKey, defaultSortDirection = 'asc' }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  let sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = currentPage * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-slate-200/50 dark:border-neutral-700 overflow-hidden shadow-md transition-all duration-300">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200/50 dark:border-neutral-700 transition-all" style={{ backgroundColor: 'var(--brand)' }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="px-4 py-3 text-left text-sm font-semibold text-white cursor-pointer hover:bg-[var(--brand-700)] transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {sortKey === column.key && (
                      <span className="text-white/80">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-neutral-700">
            {paginatedData.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50 dark:hover:bg-neutral-700/50 transition-colors bg-white dark:bg-neutral-800">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/50 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 transition-all">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} entries
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all duration-300"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all duration-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i;
            } else if (currentPage < 3) {
              pageNum = i;
            } else if (currentPage > totalPages - 4) {
              pageNum = totalPages - 5 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[32px] px-2 py-1 rounded text-sm font-medium transition-all duration-300 ${
                  currentPage === pageNum
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-neutral-700/50'
                }`}
                style={currentPage === pageNum ? { backgroundColor: 'var(--brand)' } : {}}
              >
                {pageNum + 1}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 3 && (
            <span className="px-2 text-slate-400 dark:text-slate-500">...</span>
          )}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all duration-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all duration-300"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
