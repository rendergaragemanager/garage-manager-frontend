import { RefreshCcw } from 'lucide-react';
import type React from 'react';

import './RefreshButton.css';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  title?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isRefreshing,
  isLoading = false,
  ariaLabel = 'Actualizar',
  title,
}) => {
  return (
    <button
      type="button"
      className="subtitle-refresh-button"
      onClick={() => onRefresh()}
      disabled={isLoading || isRefreshing}
      aria-label={ariaLabel}
      title={title || (isRefreshing ? 'Actualizando...' : 'Actualizar')}
    >
      <RefreshCcw
        size={14}
        className={`subtitle-refresh-icon ${
          isRefreshing ? 'subtitle-refresh-icon--spinning' : ''
        }`}
      />
    </button>
  );
};

export default RefreshButton;
