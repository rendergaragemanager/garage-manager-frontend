import { InstallBanner } from './components/Banners/InstallBanner';
import { IosInstallBanner } from './components/Banners/IosInstallBanner';
import { OfflineBanner } from './components/Banners/OfflineBanner';
import { UpdateBanner } from './components/Banners/UpdateBanner';
import AppRouter from './router/AppRouter';

import './App.css';

const App = () => {
  return (
    <>
      <AppRouter />
      <OfflineBanner />
      <UpdateBanner />
      <InstallBanner />
      <IosInstallBanner />
    </>
  );
};

export default App;
