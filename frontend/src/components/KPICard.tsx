import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: LucideIcon;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, value, subtitle, trend, trendValue, icon: Icon, color = 'blue' 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon size={24} />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-auto flex items-center text-sm">
          {trend && (
            <span className={`flex items-center font-medium mr-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1">{trendValue}</span>
            </span>
          )}
          {subtitle && <span className="text-gray-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default KPICard;
