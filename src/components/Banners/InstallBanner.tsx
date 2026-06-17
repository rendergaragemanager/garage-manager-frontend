import { Download, X } from 'lucide-react';
import { useState } from 'react';

import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import './Banners.css';

export const InstallBanner = () => {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="install-banner" role="complementary" aria-label="Instalar aplicación">
      <span className="install-banner__icon" aria-hidden="true">
        <Download size={16} />
      </span>
      <span className="install-banner__text">
        Instala la app para acceder sin navegador
      </span>
      <button className="install-banner__btn" onClick={() => void install()}>
        Instalar
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
