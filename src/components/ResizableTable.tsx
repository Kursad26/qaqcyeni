import { useState, useEffect, useRef, ReactNode } from 'react';

export interface ColumnDefinition {
  key: string;
  header: ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  render: (row: any) => ReactNode;
}

interface ResizableTableProps {
  columns: ColumnDefinition[];
  data: any[];
  storageKey: string;
  onSort?: (column: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export function ResizableTable({
  columns,
  data,
  storageKey,
  onSort,
  sortColumn,
  sortDirection
}: ResizableTableProps) {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  useEffect(() => {
    const savedWidths = localStorage.getItem(storageKey);
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error('Failed to parse saved column widths', e);
      }
    } else {
      const defaultWidths: { [key: string]: number } = {};
      columns.forEach((col) => {
        defaultWidths[col.key] = col.width || 150;
      });
      setColumnWidths(defaultWidths);
    }
  }, [storageKey, columns]);

  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey]);

  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(columnKey);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnKey] || 150;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizingColumn) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(
        columns.find((col) => col.key === resizingColumn)?.minWidth || 80,
        Math.min(
          columns.find((col) => col.key === resizingColumn)?.maxWidth || 800,
          startWidthRef.current + diff
        )
      );

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizingColumn, columns]);

  const resetColumnWidths = () => {
    const defaultWidths: { [key: string]: number } = {};
    columns.forEach((col) => {
      defaultWidths[col.key] = col.width || 150;
    });
    setColumnWidths(defaultWidths);
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={resetColumnWidths}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Sütun Genişliklerini Sıfırla
        </button>
      </div>
      <div ref={tableRef} className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="flex">
                {columns.map((column, index) => (
                  <div
                    key={column.key}
                    className="relative flex-shrink-0 group"
                    style={{ width: columnWidths[column.key] || column.width || 150 }}
                  >
                    <div className="py-3 px-4 font-semibold text-gray-700 text-left">
                      {column.sortable && onSort ? (
                        <button
                          onClick={() => onSort(column.key)}
                          className="flex items-center space-x-1 hover:text-blue-600 w-full"
                        >
                          {column.header}
                          {sortColumn === column.key && (
                            <span className="ml-1 text-xs">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </div>
                    {index < columns.length - 1 && (
                      <div
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group-hover:bg-blue-300 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, column.key)}
                        style={{
                          backgroundColor: resizingColumn === column.key ? '#3b82f6' : undefined
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              {data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Veri bulunamadı
                </div>
              ) : (
                data.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        className="py-4 px-4 flex-shrink-0"
                        style={{ width: columnWidths[column.key] || column.width || 150 }}
                      >
                        {column.render(row)}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
