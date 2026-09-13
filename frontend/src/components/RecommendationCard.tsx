import React from 'react';
import { RecommendationOption } from '../types';
import { DollarSign, Clock, Shield, CheckCircle } from 'lucide-react';

interface Props {
  options: RecommendationOption[];
  riskTitle: string;
}

const RecommendationCard: React.FC<Props> = ({ options, riskTitle }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended Actions for: {riskTitle}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option, idx) => (
          <div key={idx} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
            {idx === 0 && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                Best Option
              </div>
            )}
            <h4 className="font-bold text-gray-900 mb-2">{option.title}</h4>
            <p className="text-sm text-gray-600 mb-4 flex-1">{option.description}</p>
            
            <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center"><DollarSign size={14} className="mr-1"/> Est. Cost</span>
                <span className="font-medium">${option.estimated_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center"><Clock size={14} className="mr-1"/> Delay</span>
                <span className="font-medium">{option.expected_delay_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center"><Shield size={14} className="mr-1"/> Risk</span>
                <span className="font-medium capitalize">{option.risk_level}</span>
              </div>
            </div>
            
            <button className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-medium rounded-lg transition-colors flex justify-center items-center">
              <CheckCircle size={16} className="mr-2" />
              Approve Action
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationCard;
