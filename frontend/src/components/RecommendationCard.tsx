import React, { useState } from 'react';
import { RecommendationOption } from '../types';
import { DollarSign, Clock, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { RecommendationApi } from '../services/api';

interface Props {
  options: RecommendationOption[];
  riskTitle: string;
  riskId?: number;
  onApprove?: (option: RecommendationOption, executionDetails?: any) => void;
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
      const res = await RecommendationApi.approveOption(riskId, option);
      setApprovedIdx(idx);
      if (onApprove) {
        onApprove(option, res.data?.execution_details);
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900">Recommended Actions for: {riskTitle}</h3>
        <span className="text-xs text-gray-500">Select an action to execute real operational workflows</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option, idx) => {
          const isApproving = approvingIdx === idx;
          const isApproved = approvedIdx === idx;

          return (
            <div 
              key={idx} 
              className={`bg-white border rounded-xl p-4 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                isApproved 
                  ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/30' 
                  : 'border-blue-100 hover:shadow-md hover:border-blue-300'
              }`}
            >
              {idx === 0 && !isApproved && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Recommended
                </div>
              )}
              {isApproved && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Approved & Executed
                </div>
              )}

              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1.5 pr-6">{option.title}</h4>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">{option.description}</p>
              </div>
              
              <div>
                <div className="space-y-1.5 mb-4 bg-gray-50/90 p-2.5 rounded-lg text-xs border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><DollarSign size={13} className="mr-1 text-gray-400"/> Est. Cost</span>
                    <span className="font-semibold text-gray-900">${option.estimated_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><Clock size={13} className="mr-1 text-gray-400"/> Delay</span>
                    <span className="font-semibold text-gray-900">{option.expected_delay_days} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center"><Shield size={13} className="mr-1 text-gray-400"/> Residual Risk</span>
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
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]'
                  }`}
                >
                  {isApproving ? (
                    <>
                      <Loader2 size={15} className="mr-1.5 animate-spin" />
                      <span>Executing Workflow...</span>
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
