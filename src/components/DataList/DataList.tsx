import React from 'react';
import './DataList.css';

export type BadgeVariant = 'pending' | 'accepted' | 'rejected' | 'default';

export interface BadgeConfig {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  gridArea: string;
  cell: (row: T) => React.ReactNode | BadgeConfig;
  hideHeader?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface RowAction<T> {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
}

export interface GridAreas {
  base: string;
  tablet?: string;
  desktop?: string;
}

export interface DataListProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  gridTemplateAreas: GridAreas;
  gridTemplateColumns?: string;
  actions?: RowAction<T>[];
  variant?: 'default' | 'dark';
  actionsAlign?: 'right' | 'center';
  alignActionsTop?: boolean;
  showRowNumbers?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

function isBadgeConfig(value: unknown): value is BadgeConfig {
  return (
    typeof value === 'object' && value !== null && 'label' in value && 'variant' in value
  );
}

function getTemplateColumnCount(template: string): number {
  const rows = template
    .split('\n')
    .map((row) => row.replace(/["']/g, '').trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return 1;
  }

  return rows.reduce((max, row) => {
    const count = row.split(/\s+/).filter(Boolean).length;
    return Math.max(max, count);
  }, 1);
}

function buildTemplateColumns(template: string): string {
  const count = getTemplateColumnCount(template);
  return `repeat(${count}, minmax(0, 1fr))`;
}

function Badge({ config }: { config: BadgeConfig }) {
  return (
    <span
      className={['dl-badge', `dl-badge--${config.variant}`, config.className]
        .filter(Boolean)
        .join(' ')}
    >
      {config.label}
    </span>
  );
}

export function DataList<T>({
  columns,
  data,
  rowKey,
  gridTemplateAreas,
  gridTemplateColumns,
  actions,
  variant = 'default',
  actionsAlign = 'right',
  alignActionsTop = false,
  showRowNumbers = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  rowClassName,
}: DataListProps<T>) {
  const hasActions = actions && actions.length > 0;

  const uid = React.useId().replace(/:/g, '');
  const scopeId = `dl-${uid}`;
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [isUsingFallbackLayout, setIsUsingFallbackLayout] = React.useState(false);

  const colCount = columns.length + (hasActions ? 1 : 0);
  const defaultCols = Array(colCount).fill('1fr').join(' ');
  const isRowClickable = Boolean(onRowClick);

  const baseColumns = buildTemplateColumns(gridTemplateAreas.base);
  const fallbackTemplate = gridTemplateAreas.tablet ?? gridTemplateAreas.base;
  const fallbackColumns = buildTemplateColumns(fallbackTemplate);
  const tabletColumns = gridTemplateAreas.tablet
    ? buildTemplateColumns(gridTemplateAreas.tablet)
    : baseColumns;
  const desktopColumns = gridTemplateColumns
    ? gridTemplateColumns
    : gridTemplateAreas.desktop
      ? buildTemplateColumns(gridTemplateAreas.desktop)
      : tabletColumns;

  const responsiveCSS = `
    #${scopeId} .dl-header,
    #${scopeId} .dl-row {
      grid-template-areas: ${gridTemplateAreas.base};
      grid-template-columns: ${baseColumns};
    }
    ${
      gridTemplateAreas.tablet
        ? `
    @media (min-width: 600px) {
      #${scopeId} .dl-header,
      #${scopeId} .dl-row {
        grid-template-areas: ${gridTemplateAreas.tablet};
        grid-template-columns: ${tabletColumns || defaultCols};
      }
    }`
        : ''
    }
    ${
      gridTemplateAreas.desktop
        ? `
    @media (min-width: 1025px) {
      #${scopeId} .dl-header,
      #${scopeId} .dl-row {
        grid-template-areas: ${gridTemplateAreas.desktop};
        grid-template-columns: ${desktopColumns || defaultCols};
      }

      #${scopeId}.dl-wrapper--fallback-layout .dl-header,
      #${scopeId}.dl-wrapper--fallback-layout .dl-row {
        grid-template-areas: ${fallbackTemplate};
        grid-template-columns: ${fallbackColumns};
      }
    }`
        : ''
    }
  `;

  React.useEffect(() => {
    const element = wrapperRef.current;

    if (!element || !gridTemplateAreas.desktop) {
      return;
    }

    const ENTER_FALLBACK_OVERFLOW_PX = 12;
    const EXIT_FALLBACK_OVERFLOW_PX = 2;

    let frame: number | null = null;

    const measureDesktopOverflow = () => {
      const isDesktopViewport = window.matchMedia('(min-width: 1025px)').matches;

      if (!isDesktopViewport) {
        return {
          isDesktopViewport,
          overflow: 0,
        };
      }

      const hasFallbackClass = element.classList.contains('dl-wrapper--fallback-layout');

      if (hasFallbackClass) {
        element.classList.remove('dl-wrapper--fallback-layout');
      }

      const overflow = element.scrollWidth - element.clientWidth;

      if (hasFallbackClass) {
        element.classList.add('dl-wrapper--fallback-layout');
      }

      return {
        isDesktopViewport,
        overflow,
      };
    };

    const checkOverflow = () => {
      frame = window.requestAnimationFrame(() => {
        const { isDesktopViewport, overflow } = measureDesktopOverflow();

        if (!isDesktopViewport) {
          setIsUsingFallbackLayout(false);
          return;
        }

        const nextValue = isUsingFallbackLayout
          ? overflow > EXIT_FALLBACK_OVERFLOW_PX
          : overflow > ENTER_FALLBACK_OVERFLOW_PX;

        setIsUsingFallbackLayout((previous) =>
          previous === nextValue ? previous : nextValue,
        );
      });
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    isUsingFallbackLayout,
    columns.length,
    data.length,
    gridTemplateAreas.base,
    gridTemplateAreas.desktop,
    gridTemplateAreas.tablet,
    gridTemplateColumns,
    hasActions,
  ]);

  return (
    <>
      <style>{responsiveCSS}</style>

      <div
        id={scopeId}
        ref={wrapperRef}
        className={[
          'dl-wrapper',
          variant === 'dark' ? 'dl-wrapper--variant-dark' : '',
          alignActionsTop ? 'dl-wrapper--actions-top' : '',
          isUsingFallbackLayout ? 'dl-wrapper--fallback-layout' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* ── Header ── */}
        <div className="dl-header" aria-hidden="true">
          {showRowNumbers && (
            <div className="dl-header-cell dl-num" style={{ gridArea: 'num' }}>
              #
            </div>
          )}
          {columns.map((col) => (
            <div
              key={col.key}
              className={[
                'dl-header-cell',
                col.align === 'right' ? 'dl-align-right' : '',
                col.align === 'center' ? 'dl-align-center' : '',
              ].join(' ')}
              style={{ gridArea: col.gridArea }}
            >
              {col.hideHeader ? null : col.header}
            </div>
          ))}
          {hasActions && (
            <div
              className={[
                'dl-header-cell',
                actionsAlign === 'center' ? 'dl-align-center' : 'dl-align-right',
              ].join(' ')}
              style={{ gridArea: 'actions' }}
            >
              ACCIONES
            </div>
          )}
        </div>

        {/* ── List ── */}
        {data.length === 0 ? (
          <div className="dl-empty">{emptyMessage}</div>
        ) : (
          <ul className="dl-list">
            {data.map((row, index) => (
              <li
                key={rowKey(row)}
                className={[
                  'dl-row',
                  isRowClickable ? 'dl-row--clickable' : '',
                  rowClassName ? rowClassName(row) : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {showRowNumbers && (
                  <div className="dl-cell dl-row-num" style={{ gridArea: 'num' }}>
                    <span className="dl-cell-label">#</span>
                    {index + 1}
                  </div>
                )}

                {columns.map((col) => {
                  const value = col.cell(row);
                  return (
                    <div
                      key={col.key}
                      className={[
                        'dl-cell',
                        col.align === 'right' ? 'dl-align-right' : '',
                        col.align === 'center' ? 'dl-align-center' : '',
                      ].join(' ')}
                      style={{ gridArea: col.gridArea }}
                    >
                      {!col.hideHeader && (
                        <span className="dl-cell-label">{col.header}</span>
                      )}
                      <span className="dl-cell-value">
                        {isBadgeConfig(value) ? <Badge config={value} /> : value}
                      </span>
                    </div>
                  );
                })}

                {hasActions && (
                  <div
                    className="dl-cell dl-cell--actions"
                    style={{ gridArea: 'actions' }}
                  >
                    <div
                      className={[
                        'dl-actions',
                        actionsAlign === 'center' ? 'dl-actions--center' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {actions!
                        .filter((a) => !a.show || a.show(row))
                        .map((action) => (
                          <button
                            type="button"
                            key={action.key}
                            className={
                              action.key === 'activate' &&
                              typeof row === 'object' &&
                              row !== null &&
                              'active' in row &&
                              !(row as { active: boolean }).active
                                ? 'dl-action-btn activate-btn'
                                : 'dl-action-btn'
                            }
                            aria-label={action.label}
                            title={action.label}
                            onClick={(event) => {
                              event.stopPropagation();
                              action.onClick(row);
                            }}
                          >
                            {action.icon}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
