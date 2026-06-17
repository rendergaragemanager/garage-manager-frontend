import { ArrowLeft } from 'lucide-react';

import './BackButton.css';

type DetailBackButtonProps = {
  onClick: () => void;
  label?: string;
  className?: string;
};

const DetailBackButton = ({
  onClick,
  label = 'Volver',
  className = '',
}: DetailBackButtonProps) => {
  const classes = ['detail-back-button', className].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} onClick={onClick}>
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
};

export default DetailBackButton;
