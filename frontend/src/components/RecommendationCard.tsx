import React, { useState } from 'react';
import { RecommendationOption } from '../types';
import { DollarSign, Clock, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { RecommendationApi } from '../services/api';

interface Props {
  options: RecommendationOption[];
  riskTitle: string;
  riskId?: number;
  onApprove?: (option: RecommendationOption) => void;
}

const RecommendationCard: React.FC<Props> = ({ options, riskTitle, riskId, onApprove }) => {
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);
  const [approvedIdx, setApprovedIdx] = useState<number | null>(null);

  const handleApprove = async (option: RecommendationOption, idx: number) => {
    if (!riskId) {
      window.alert("Action approved for this scenario.");
      return;
    }

    setApprovingIdx(idx);
    try {
      await RecommendationApi.approveOption(riskId, option);
      setApprovedIdx(idx);
      if (onApprove) {
        onApprove(option);
      }
    } catch (err: any) {
      console.error("Failed to approve action", err);
      window.alert(`Failed to approve action: ${err?.response?.data?.detail || 'Please try again.'}`);
    } finally {
      setApprovingIdx(null);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-base font-bold text-gray-900 mb-3">Recommended Actions for: {riskTitle}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option, idx) => {
          const isApproving = approvingIdx === idx;
          const isApproved = approvedIdx === idx;

          return (
            <div 
              key={idx} 
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                isApproved 
                  ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                  : 'border-blue-100 hover:shadow-md hover:border-blue-300'
              }`}
            >
              {idx === 0 && !isApproved && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Best Option
                </div>
              )}
              {isApproved && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Active / Approved
                </div>
              )}

              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1.5 pr-6">{option.title}</h4>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">{option.description}</p>
              </div>
              
              <div>
                <div className="space-y-1.5 mb-4 bg-gray-50/80 p-2.5 rounded-lg text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><DollarSign size={13} className="mr-1"/> Est. Cost</span>
                    <span className="font-semibold text-gray-900">${option.estimated_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><Clock size={13} className="mr-1"/> Delay</span>
                    <span className="font-semibold text-gray-900">{option.expected_delay_days} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><Shield size={13} className="mr-1"/> Residual Risk</span>
                    <span className="font-semibold capitalize text-gray-900">{option.risk_level}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleApprove(option, idx)}
                  disabled={approvingIdx !== null || isApproved}
                  className={`w-full py-2.5 font-medium rounded-lg transition-all flex justify-center items-center text-xs shadow-2xs ${
                    isApproved
                      ? 'bg-emerald-600 text-white cursor-default'
                      : isApproving
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {isApproving ? (
                    <>
                      <Loader2 size={15} className="mr-1.5 animate-spin" />
                      <span>Approving & Executing...</span>
                    </>
                  ) : isApproved ? (
                    <>
                      <CheckCircle size={15} className="mr-1.5 text-white" />
                      <span>Action Approved & Initiated</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} className="mr-1.5" />
                      <span>Approve Action</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationCard;
