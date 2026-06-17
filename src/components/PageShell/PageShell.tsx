import type { ReactNode } from 'react';

import './PageShell.css';

type PageShellProps = {
  className?: string;
  header: ReactNode;
  notice?: ReactNode;
  stats?: ReactNode;
  filterIndicator?: ReactNode;
  loading?: ReactNode;
  children: ReactNode;
};

const PageShell = ({
  className,
  header,
  notice,
  stats,
  filterIndicator,
  loading,
  children,
}: PageShellProps) => {
  return (
    <div className={className}>
      {header}
      {notice}
      {stats}
      {filterIndicator}
      {loading ?? children}
    </div>
  );
};

export default PageShell;
