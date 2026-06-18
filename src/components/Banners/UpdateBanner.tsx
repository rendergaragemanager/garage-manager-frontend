import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Comprueba si hay versión nueva cada 30 min (útil con la PWA instalada y abierta mucho tiempo)
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Mantiene registrado el Service Worker y, con `registerType: 'autoUpdate'`,
 * adopta las versiones nuevas automáticamente. Recarga la página una sola vez
 * cuando el SW nuevo toma el control, para evitar que una pestaña abierta
 * intente cargar chunks que `cleanupOutdatedCaches` ya borró (causa de 404).
 * No renderiza UI.
 */
export const UpdateBanner = () => {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
};
