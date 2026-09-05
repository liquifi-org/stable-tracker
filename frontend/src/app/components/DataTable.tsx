import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown } from 'lucide-react';

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
  resetKey?: string | number;
  onRowClick?: (row: any) => void;
  /** When false, render every row at full height with no pager. Default true. */
  paginate?: boolean;
}

export function DataTable({
  data,
  columns,
  pageSize = 10,
  defaultSortKey,
  defaultSortDirection = 'asc',
  resetKey,
  onRowClick,
  paginate = true,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  useEffect(() => {
    setCurrentPage(0);
  }, [resetKey, data.length]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  let sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  const totalPages = paginate ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const startIndex = paginate ? currentPage * pageSize : 0;
  const paginatedData = paginate
    ? sortedData.slice(startIndex, startIndex + pageSize)
    : sortedData;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-slate-200/50 dark:border-neutral-700 overflow-hidden">
      <div className={paginate ? 'overflow-auto max-h-[28rem]' : 'overflow-x-auto'}>
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b border-white/10" style={{ backgroundColor: 'var(--brand)' }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="px-4 py-3 text-left text-sm font-semibold text-white cursor-pointer hover:bg-[var(--brand-700)] transition-ui"
                >
                  <div className="flex items-center gap-1.5">
                    {column.header}
                    {sortKey === column.key && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5 text-white/80" />
                        : <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-neutral-700">
            {paginatedData.map((row, index) => (
              <tr
                key={row.countryId ?? row.isoAlpha2 ?? row.alpha2 ?? row.region ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-ui bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700/50 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
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

      {paginate && (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/50 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {sortedData.length === 0
            ? 'No entries'
            : `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, sortedData.length)} of ${sortedData.length} entries`}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-ui"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-ui"
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
                className={`min-w-[32px] px-2 py-1 rounded text-sm font-medium transition-ui ${
                  currentPage === pageNum
                    ? 'text-white'
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
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-ui"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-neutral-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-ui"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
