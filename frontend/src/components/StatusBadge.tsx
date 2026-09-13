import React from 'react';

interface Props {
  status: string;
  type?: 'order' | 'risk' | 'supplier' | 'inventory';
}

const StatusBadge: React.FC<Props> = ({ status, type = 'order' }) => {
  const getStyle = () => {
    const s = status.toLowerCase();
    
    if (type === 'risk') {
      if (s === 'active') return 'bg-red-100 text-red-800';
      if (s === 'acknowledged') return 'bg-yellow-100 text-yellow-800';
      if (s === 'dismissed') return 'bg-gray-100 text-gray-800';
      if (s === 'resolved') return 'bg-green-100 text-green-800';
    }
    
    if (type === 'inventory') {
      if (s === 'critical') return 'bg-red-100 text-red-800';
      if (s === 'low') return 'bg-orange-100 text-orange-800';
      if (s === 'healthy') return 'bg-green-100 text-green-800';
    }
    
    // Default / Orders
    if (['pending', 'processing', 'draft'].includes(s)) return 'bg-yellow-100 text-yellow-800';
    if (['shipped', 'in_transit'].includes(s)) return 'bg-blue-100 text-blue-800';
    if (['delivered', 'completed', 'active'].includes(s)) return 'bg-green-100 text-green-800';
    if (['cancelled', 'failed', 'inactive'].includes(s)) return 'bg-red-100 text-red-800';
    
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStyle()}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
