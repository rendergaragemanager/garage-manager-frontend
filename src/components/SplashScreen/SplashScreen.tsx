import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash" role="status" aria-label="Cargando Garage Manager">
      <img
        className="splash__logo"
        src="/logos/Logo.png"
        alt="Garage Manager"
        draggable={false}
      />
      <span className="splash__name">Garage Manager</span>
      <span className="splash__spinner" aria-hidden="true" />
    </div>
  );
};

export default SplashScreen;
