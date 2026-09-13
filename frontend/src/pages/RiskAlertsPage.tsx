import React, { useEffect, useState } from 'react';
import { RiskAlert, RecommendationOption } from '../types';
import { RiskApi, RecommendationApi } from '../services/api';
import RiskAlertCard from '../components/RiskAlertCard';
import RecommendationCard from '../components/RecommendationCard';
import { AlertCircle, AlertTriangle, Info, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';

const RiskAlertsPage: React.FC = () => {
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskAlert | null>(null);
  const [options, setOptions] = useState<RecommendationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [filter, setFilter] = useState('active');

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

  const handleOptionApproved = async (option: RecommendationOption) => {
    await fetchRisks();
    setRecalcSuccess(`✓ Mitigation Action Approved: "${option.title}". Risk successfully marked as resolved.`);
    setTimeout(() => setRecalcSuccess(null), 5000);
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
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 flex items-center shadow-2xs disabled:opacity-60 transition-all"
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
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center space-x-2">
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
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">No {filter} risks found.</div>
          ) : (
            filteredRisks.map(alert => (
              <div key={alert.id} onClick={() => handleRiskSelect(alert)} className={`cursor-pointer transition-transform ${selectedRisk?.id === alert.id ? 'transform scale-[1.02] ring-2 ring-blue-500 rounded-xl' : ''}`}>
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
                  <div className="flex space-x-3 text-sm text-gray-500">
                    <span className="capitalize px-2.5 py-0.5 rounded-full bg-gray-100">{selectedRisk.severity} Priority</span>
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
                {optionsLoading ? (
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
                ) : selectedRisk.status === 'active' ? (
                  <div className="p-6 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-center">
                    <p>No automated mitigation options are available for this specific risk pattern. Manual intervention is required.</p>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 text-center">
                    <p>This risk is currently {selectedRisk.status}. Mitigation options are only available for active risks.</p>
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
    </div>
  );
};

export default RiskAlertsPage;
