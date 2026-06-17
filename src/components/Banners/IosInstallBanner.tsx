import { Share, X } from 'lucide-react';
import { useState } from 'react';

import './Banners.css';

const isIosInstallable = (): boolean => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dismissed = sessionStorage.getItem('ios-install-dismissed');

  return isIos && isSafari && !isStandalone && !dismissed;
};

export const IosInstallBanner = () => {
  const [show, setShow] = useState(isIosInstallable);

  const dismiss = () => {
    sessionStorage.setItem('ios-install-dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="install-banner ios-install-banner"
      role="complementary"
      aria-label="Instalar aplicación"
    >
      <span className="install-banner__icon" aria-hidden="true">
        <Share size={16} />
      </span>
      <span className="install-banner__text">
        Pulsa <strong>Compartir</strong> y luego{' '}
        <strong>"Añadir a pantalla de inicio" </strong>para instalar la app
      </span>
      <button className="banner-close-btn" onClick={dismiss} aria-label="Cerrar banner">
        <X size={16} />
      </button>
    </div>
  );
};
