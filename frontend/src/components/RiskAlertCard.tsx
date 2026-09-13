import React from 'react';
import { RiskAlert } from '../types';
import { AlertCircle, AlertTriangle, Info, Clock, Check, X } from 'lucide-react';
import { RiskApi } from '../services/api';

interface Props {
  alert: RiskAlert;
  onUpdate?: () => void;
}

const RiskAlertCard: React.FC<Props> = ({ alert, onUpdate }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertCircle className="text-red-600" size={20} /> };
      case 'high': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: <AlertTriangle className="text-orange-600" size={20} /> };
      case 'medium': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: <Info className="text-yellow-600" size={20} /> };
      case 'low': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Info className="text-blue-600" size={20} /> };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <Info className="text-gray-600" size={20} /> };
    }
  };

  const style = getSeverityStyle(alert.severity);

  const handleAction = async (action: 'acknowledge' | 'dismiss') => {
    try {
      if (action === 'acknowledge') await RiskApi.acknowledgeRisk(alert.id);
      if (action === 'dismiss') await RiskApi.dismissRisk(alert.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(`Failed to ${action} risk`, error);
    }
  };

  return (
    <div className={`rounded-xl border ${style.border} bg-white shadow-sm overflow-hidden flex flex-col`}>
      <div className={`${style.bg} px-4 py-3 flex justify-between items-center border-b ${style.border}`}>
        <div className="flex items-center space-x-2">
          {style.icon}
          <span className={`font-semibold ${style.text} capitalize`}>{alert.severity} Risk</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Clock size={14} className="mr-1" />
          {new Date(alert.created_at).toLocaleDateString()}
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <h4 className="font-bold text-gray-900 mb-2">{alert.title}</h4>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{alert.description}</p>
        
        {alert.financial_impact !== null && (
          <div className="bg-gray-50 rounded p-2 mb-4">
            <span className="text-xs text-gray-500 uppercase font-medium">Est. Financial Impact</span>
            <div className="text-lg font-bold text-gray-900">${alert.financial_impact.toLocaleString()}</div>
          </div>
        )}
      </div>

      {alert.status === 'active' && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
          <button 
            onClick={() => handleAction('dismiss')}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex items-center"
          >
            <X size={16} className="mr-1" /> Dismiss
          </button>
          <button 
            onClick={() => handleAction('acknowledge')}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center"
          >
            <Check size={16} className="mr-1" /> Acknowledge
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskAlertCard;
