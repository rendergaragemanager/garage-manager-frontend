import './FilterStats.css';

import type React from 'react';

export interface FilterStatsColors {
  background: string;
  border: string;
  text: string;
  hoverBorder?: string;
  activeBorder?: string;
  activeRing?: string;
}

export interface FilterStatsItem {
  key: string;
  label: string;
  count: number;
  colors?: FilterStatsColors;
  isActive: boolean;
  onClick: () => void;
  ariaPressed?: boolean;
  hidden?: boolean;
}

interface FilterStatsProps {
  items: FilterStatsItem[];
  className?: string;
  tabletColumns?: number;
}

const FilterStats = ({ items, className, tabletColumns }: FilterStatsProps) => {
  const visibleItems = items.filter((item) => !item.hidden);
  const visibleCount = visibleItems.length;

  const desktopColumns = Math.max(1, Math.min(visibleCount, 6));
  const resolvedTabletColumns = tabletColumns
    ? Math.max(1, Math.min(tabletColumns, visibleCount))
    : visibleCount >= 3
      ? 3
      : Math.max(1, visibleCount);
  const mobileColumns = visibleCount > 1 && visibleCount % 2 === 0 ? 2 : 1;

  return (
    <section
      className={['filter-stats', className].filter(Boolean).join(' ')}
      style={
        {
          '--filter-stats-cols-desktop': desktopColumns,
          '--filter-stats-cols-tablet': resolvedTabletColumns,
          '--filter-stats-cols-mobile': mobileColumns,
        } as React.CSSProperties
      }
    >
      {visibleItems.map((item) => {
        const colors = item.colors;
        const itemStyle = colors
          ? ({
              '--filter-stat-bg': colors.background,
              '--filter-stat-border': colors.border,
              '--filter-stat-text': colors.text,
              '--filter-stat-hover-border': colors.hoverBorder ?? colors.activeBorder,
              '--filter-stat-active-border': colors.activeBorder ?? colors.border,
              '--filter-stat-active-ring':
                colors.activeRing ?? 'rgba(249, 250, 251, 0.25)',
            } as React.CSSProperties)
          : undefined;

        return (
          <button
            key={item.key}
            type="button"
            className={[
              'filter-stats__item',
              item.colors ? 'filter-stats__item--themed' : '',
              item.isActive ? 'filter-stats__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={item.onClick}
            aria-pressed={item.ariaPressed ?? item.isActive}
            style={itemStyle}
          >
            <span>{item.count}</span>
            <p>{item.label}</p>
          </button>
        );
      })}
    </section>
  );
};

export default FilterStats;
