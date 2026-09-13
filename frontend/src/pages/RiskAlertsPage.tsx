import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiskAlert, RecommendationOption } from '../types';
import { RiskApi, RecommendationApi } from '../services/api';
import RiskAlertCard from '../components/RiskAlertCard';
import RecommendationCard from '../components/RecommendationCard';
import { 
  AlertCircle, AlertTriangle, Info, RefreshCw, CheckCircle2, 
  Loader2, CheckCircle, ArrowRight, X, ShoppingCart, Calendar, 
  Package, ShieldCheck
} from 'lucide-react';

interface ExecutionModalState {
  open: boolean;
  title: string;
  details?: any;
}

const RiskAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskAlert | null>(null);
  const [options, setOptions] = useState<RecommendationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [filter, setFilter] = useState('active');
  const [executionModal, setExecutionModal] = useState<ExecutionModalState | null>(null);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const res = await RiskApi.getRisks();
      setRisks(res.data);
      setSelectedRisk(prev => prev ? (res.data.find(r => r.id === prev.id) || null) : null);
    } catch (error) {
      console.error('Failed to fetch risks', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcSuccess(null);
    try {
      const res = await RiskApi.recalculateRisks();
      await fetchRisks();
      setRecalcSuccess(res.data?.message || 'Operational risks successfully recalculated!');
      setTimeout(() => setRecalcSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to recalculate risks', err);
      window.alert(`Failed to recalculate risks: ${err?.response?.data?.detail || 'Please try again.'}`);
    } finally {
      setRecalculating(false);
    }
  };

  const handleOptionApproved = async (option: RecommendationOption, executionDetails?: any) => {
    // Show execution modal immediately
    setExecutionModal({
      open: true,
      title: option.title,
      details: executionDetails
    });

    await fetchRisks();
    setRecalcSuccess(`✓ Mitigation Action Approved: "${option.title}". Risk successfully marked as resolved.`);
    setTimeout(() => setRecalcSuccess(null), 6000);
  };

  useEffect(() => {
    fetchRisks();
  }, []);

  const handleRiskSelect = async (risk: RiskAlert) => {
    setSelectedRisk(risk);
    if (risk.status === 'active') {
      setOptionsLoading(true);
      try {
        const res = await RecommendationApi.getRiskOptions(risk.id);
        setOptions(res.data);
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
        setOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    } else {
      setOptions([]);
    }
  };

  const filteredRisks = risks.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getSeverityCount = (severity: string) => risks.filter(r => r.status === 'active' && r.severity === severity).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Intelligence Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time risk radar analyzing inventory depletion, supplier delays, and order fulfillment</p>
        </div>
        <button 
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 flex items-center shadow-2xs disabled:opacity-60 transition-all cursor-pointer"
        >
          {recalculating ? (
            <Loader2 size={16} className="mr-2 animate-spin text-blue-600" />
          ) : (
            <RefreshCw size={16} className="mr-2" />
          )}
          <span>{recalculating ? 'Analyzing Risks...' : 'Recalculate Risks'}</span>
        </button>
      </div>

      {recalcSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{recalcSuccess}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center shadow-sm">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg mr-4"><AlertCircle size={24} /></div>
          <div><p className="text-sm text-red-800 font-medium">Critical</p><p className="text-2xl font-bold text-red-900">{getSeverityCount('critical')}</p></div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center shadow-sm">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg mr-4"><AlertTriangle size={24} /></div>
          <div><p className="text-sm text-orange-800 font-medium">High</p><p className="text-2xl font-bold text-orange-900">{getSeverityCount('high')}</p></div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center shadow-sm">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4"><Info size={24} /></div>
          <div><p className="text-sm text-yellow-800 font-medium">Medium</p><p className="text-2xl font-bold text-yellow-900">{getSeverityCount('medium')}</p></div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4"><Info size={24} /></div>
          <div><p className="text-sm text-blue-800 font-medium">Low</p><p className="text-2xl font-bold text-blue-900">{getSeverityCount('low')}</p></div>
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        {['active', 'acknowledged', 'resolved', 'dismissed', 'all'].map(status => (
          <button 
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all cursor-pointer ${
              filter === status ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status} Risks
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading risks...</div>
          ) : filteredRisks.length === 0 ? (
            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100 p-6">
              No {filter} risks found.
            </div>
          ) : (
            filteredRisks.map(alert => (
              <div 
                key={alert.id} 
                onClick={() => handleRiskSelect(alert)} 
                className={`cursor-pointer transition-transform ${selectedRisk?.id === alert.id ? 'transform scale-[1.02] ring-2 ring-blue-500 rounded-xl' : ''}`}
              >
                <RiskAlertCard alert={alert} onUpdate={fetchRisks} />
              </div>
            ))
          )}
        </div>
        
        <div className="lg:col-span-2">
          {selectedRisk ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedRisk.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedRisk.status === 'resolved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : selectedRisk.severity === 'critical' 
                        ? 'bg-red-100 text-red-800' 
                        : selectedRisk.severity === 'high' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedRisk.status === 'resolved' ? 'Resolved' : `${selectedRisk.severity} Priority`}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{selectedRisk.risk_type.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>Detected {new Date(selectedRisk.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="prose max-w-none mb-8">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{selectedRisk.description}</p>
                
                {selectedRisk.impact_description && (
                  <>
                    <h3 className="text-lg font-semibold mt-6 mb-2">Impact Analysis</h3>
                    <p className="text-gray-700">{selectedRisk.impact_description}</p>
                  </>
                )}
              </div>
              
              <div className="mt-auto">
                {selectedRisk.status === 'resolved' ? (
                  <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900">
                    <div className="flex items-center space-x-2 font-bold text-base mb-1.5 text-emerald-800">
                      <ShieldCheck className="text-emerald-600" size={22} />
                      <span>Mitigation Enacted & Risk Resolved</span>
                    </div>
                    <p className="text-sm text-emerald-700 mb-2">
                      {selectedRisk.recommendation || "This risk has been successfully mitigated through approved operational procedures."}
                    </p>
                    {selectedRisk.resolved_at && (
                      <p className="text-xs text-emerald-600 font-medium">
                        Resolved timestamp: {new Date(selectedRisk.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : optionsLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl">
                    <RefreshCw className="animate-spin mb-2 text-blue-500" size={24} />
                    <span>Analyzing mitigation options...</span>
                  </div>
                ) : options.length > 0 ? (
                  <RecommendationCard 
                    options={options} 
                    riskTitle={selectedRisk.title} 
                    riskId={selectedRisk.id}
                    onApprove={handleOptionApproved}
                  />
                ) : (
                  <div className="p-6 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-center">
                    <p>No automated mitigation options are available for this specific risk pattern. Manual intervention is required.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col items-center justify-center text-gray-500">
              <AlertTriangle size={48} className="text-gray-300 mb-4" />
              <p className="text-lg">Select a risk alert from the list to view details and mitigation options.</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Confirmation Modal */}
      {executionModal && executionModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Mitigation Action Approved!</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">Automated operations dispatched to database</p>
                </div>
              </div>
              <button 
                onClick={() => setExecutionModal(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Executed Plan</span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{executionModal.title}</p>
              </div>

              {executionModal.details?.type === 'purchase_order' && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center">
                      <ShoppingCart size={14} className="mr-1.5" /> Purchase Order Placed
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-xs font-bold">
                      {executionModal.details.order_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-gray-500">Supplier:</span>
                      <p className="font-semibold text-gray-900">{executionModal.details.supplier_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Item & Quantity:</span>
                      <p className="font-semibold text-gray-900">
                        {executionModal.details.quantity?.toLocaleString()} {executionModal.details.unit || 'units'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Order Value:</span>
                      <p className="font-semibold text-emerald-700">${executionModal.details.total_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Expected Delivery:</span>
                      <p className="font-semibold text-gray-900 flex items-center">
                        <Calendar size={12} className="mr-1 text-gray-400" />
                        {executionModal.details.expected_delivery_date}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {executionModal.details?.type === 'sales_order_reschedule' && (
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center">
                    <Package size={14} className="mr-1.5" /> Production Rescheduled
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {executionModal.details.summary}
                  </p>
                  {executionModal.details.order_numbers?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {executionModal.details.order_numbers.map((so: string) => (
                        <span key={so} className="px-2 py-0.5 bg-amber-200/60 text-amber-900 font-mono text-[11px] rounded font-medium">
                          {so}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {executionModal.details?.summary && executionModal.details.type !== 'sales_order_reschedule' && (
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {executionModal.details.summary}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setExecutionModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
                >
                  Dismiss
                </button>
                {executionModal.details?.target_url && (
                  <button
                    onClick={() => {
                      const url = executionModal.details.target_url;
                      setExecutionModal(null);
                      navigate(url);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <span>
                      {executionModal.details.type === 'purchase_order' 
                        ? 'View in Purchase Orders' 
                        : executionModal.details.type === 'sales_order_reschedule' || executionModal.details.type === 'sales_order'
                        ? 'View in Sales Orders'
                        : 'View Details'}
                    </span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAlertsPage;
