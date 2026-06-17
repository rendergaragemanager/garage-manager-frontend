import { WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './Banners.css';

type BannerState = 'hidden' | 'offline' | 'restored' | 'hiding';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const prevOnline = useRef(true);

  useEffect(() => {
    const wasOnline = prevOnline.current;
    prevOnline.current = isOnline;

    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBannerState('offline');
      return;
    }

    if (!wasOnline) {
      setBannerState('restored');
      const timer = setTimeout(() => setBannerState('hiding'), 1200);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleAnimationEnd = () => {
    if (bannerState === 'hiding') setBannerState('hidden');
  };

  if (bannerState === 'hidden') return null;

  return (
    <div
      className={`offline-banner${bannerState === 'hiding' ? ' offline-banner--hiding' : ''}`}
      role="status"
      aria-live="polite"
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="offline-banner__icon" aria-hidden="true">
        <WifiOff size={16} />
      </span>
      {bannerState === 'restored' || bannerState === 'hiding'
        ? 'Conexión restaurada'
        : 'Sin conexión — algunas funciones no están disponibles'}
    </div>
  );
};
