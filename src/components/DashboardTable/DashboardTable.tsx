import React from 'react';
import './DashboardTable.css';

interface Column {
  label: string;
  className?: string;
}

interface DashboardTableProps<T> {
  title: string;
  columns: (string | Column)[];
  data: T[];
  rowRenderer: (item: T, index: number) => React.ReactNode;
}

function DashboardTable<T>({
  title,
  columns,
  data,
  rowRenderer,
}: DashboardTableProps<T>) {
  return (
    <div className="dashboard-table-container">
      <h3 className="dashboard-table-title">{title}</h3>
      <table className="dashboard-table">
        {columns.length > 0 && (
          <thead>
            <tr>
              {columns.map((col) => {
                const label = typeof col === 'string' ? col : col.label;
                const className = typeof col === 'string' ? undefined : col.className;
                return (
                  <th key={label} className={className}>
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>{rowRenderer(item, index)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DashboardTable;
