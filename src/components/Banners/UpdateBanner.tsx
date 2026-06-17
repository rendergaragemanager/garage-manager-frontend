import { RefreshCcw, X } from 'lucide-react';
import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import './Banners.css';

export const UpdateBanner = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    void updateServiceWorker(true);
  };

  if (!needRefresh || dismissed) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner__icon">
        <RefreshCcw size={16} />
      </span>
      Nueva versión disponible
      <button className="update-banner__btn" onClick={handleUpdate} disabled={updating}>
        {updating ? 'Actualizando...' : 'Actualizar'}
      </button>
      <button
        className="banner-close-btn"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar banner"
      >
        <X size={16} />
      </button>
    </div>
  );
};
