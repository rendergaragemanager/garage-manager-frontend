import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import './SearchBar.css';

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  minLengthToDebounce?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

const SearchBar = ({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 300,
  minLengthToDebounce = 0,
  placeholder = 'Buscar...',
  ariaLabel = 'Buscar',
  className,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.trim().length > 0;
  const rootClassName = ['searchbar', 'searchbar--list-header', className]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!onDebouncedChange) return;

    const trimmedValue = value.trim();

    if (trimmedValue.length > 0 && trimmedValue.length < minLengthToDebounce) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDebouncedChange(value);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, onDebouncedChange, debounceMs, minLengthToDebounce]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={rootClassName} role="search">
      <Search size={18} className="searchbar-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="searchbar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasValue) {
            event.preventDefault();
            handleClear();
          }
        }}
      />

      {hasValue && (
        <button
          type="button"
          className="searchbar-clear"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
          onClick={handleClear}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
