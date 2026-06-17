import type { LucideIcon } from 'lucide-react';
import './StatsCard.css';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  label,
  value,
  color = 'blue',
}) => {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-card-content">
        <div>
          <p className="stats-card-label">{label}</p>
          <p className="stats-card-value">{value}</p>
        </div>
        <div className="stats-card-icon-wrapper">
          <Icon size={24} className="stats-card-icon" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
