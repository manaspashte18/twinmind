import React, { useState, useEffect } from 'react';
import { SimulatorApi, SupplierApi, MaterialApi } from '../services/api';
import { ScenarioResult, Supplier, Material } from '../types';
import { 
  FlaskConical, Play, TrendingUp, TrendingDown, Minus, 
  Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert,
  Clock, DollarSign, Package, Truck
} from 'lucide-react';

const SimulatorPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState('demand_change');
  const [params, setParams] = useState({ 
    percentage: 25, 
    supplier_id: '', 
    delay_days: 10, 
    material_id: '' 
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    loadOptions();
    // Run an initial default simulation on mount so user sees immediate results
    runSimulationWith('demand_change', { percentage: 25, supplier_id: '', delay_days: 10, material_id: '' });
  }, []);

  const loadOptions = async () => {
    try {
      const [supRes, matRes] = await Promise.all([
        SupplierApi.getSuppliers(),
        MaterialApi.getMaterials()
      ]);
      setSuppliers(supRes.data);
      setMaterials(matRes.data);
    } catch (err) {
      console.error('Failed to load simulator options', err);
    }
  };

  const runSimulationWith = async (type: string, currentParams: typeof params) => {
    setLoading(true);
    try {
      const payload = {
        scenario_type: type,
        parameters: currentParams
      };
      const res = await SimulatorApi.runScenario(payload);
      setResult(res.data);
    } catch (error: any) {
      console.error('Simulation failed', error);
      window.alert(`Simulation failed: ${error?.response?.data?.detail || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => {
    runSimulationWith(scenarioType, params);
  };

  const applyPreset = (type: string, presetParams: Partial<typeof params>) => {
    const updated = { ...params, ...presetParams };
    setScenarioType(type);
    setParams(updated);
    runSimulationWith(type, updated);
  };

  const formatDeltaValue = (metric: string, val: number) => {
    if (metric.includes('($)') || metric.toLowerCase().includes('exposure') || metric.toLowerCase().includes('cost') || metric.toLowerCase().includes('revenue')) {
      return `$${Math.abs(val).toLocaleString()}`;
    }
    if (metric.includes('(%)') || metric.toLowerCase().includes('margin')) {
      return `${Math.abs(val)}%`;
    }
    return Math.abs(val).toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <FlaskConical size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supply Chain Scenario Simulator</h1>
            <p className="text-gray-500 text-sm">Stress-test your operational digital twin under simulated demand, supplier, and pricing shocks</p>
          </div>
        </div>
      </div>

      {/* Quick Scenario Presets */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-purple-800">
        <div className="flex items-center space-x-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Quick Scenario Presets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => applyPreset('demand_change', { percentage: 25 })}
            className="px-3 py-2 bg-purple-800/60 hover:bg-purple-700 border border-purple-600/50 rounded-lg text-xs font-medium transition-all text-left"
          >
            <span className="font-semibold text-white block">+25% Demand Surge</span>
            <span className="text-purple-300 text-[11px]">Holiday order peak</span>
          </button>
          <button
            onClick={() => applyPreset('demand_change', { percentage: -20 })}
            className="px-3 py-2 bg-purple-800/60 hover:bg-purple-700 border border-purple-600/50 rounded-lg text-xs font-medium transition-all text-left"
          >
            <span className="font-semibold text-white block">-20% Demand Slump</span>
            <span className="text-purple-300 text-[11px]">Off-season cooling</span>
          </button>
          <button
            onClick={() => applyPreset('supplier_delay', { delay_days: 14, supplier_id: suppliers[0]?.id?.toString() || '' })}
            className="px-3 py-2 bg-purple-800/60 hover:bg-purple-700 border border-purple-600/50 rounded-lg text-xs font-medium transition-all text-left"
          >
            <span className="font-semibold text-white block">14-Day Lead Time Delay</span>
            <span className="text-purple-300 text-[11px]">Port / logistics disruption</span>
          </button>
          <button
            onClick={() => applyPreset('price_change', { percentage: 15, material_id: '' })}
            className="px-3 py-2 bg-purple-800/60 hover:bg-purple-700 border border-purple-600/50 rounded-lg text-xs font-medium transition-all text-left"
          >
            <span className="font-semibold text-white block">+15% Material Inflation</span>
            <span className="text-purple-300 text-[11px]">Raw material cost spike</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <span>Scenario Parameters</span>
            </h3>
            
            <div className="space-y-5">
              {/* Scenario Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Simulation Model
                </label>
                <select 
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-colors"
                >
                  <option value="demand_change">Demand Shock (Surge / Decline)</option>
                  <option value="supplier_delay">Supplier Lead Time Disruption</option>
                  <option value="price_change">Raw Material Cost Shock</option>
                </select>
              </div>

              {/* Dynamic Inputs: Demand Change */}
              {scenarioType === 'demand_change' && (
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-purple-900 uppercase">Demand Fluctuation</label>
                    <span className="text-sm font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-md border border-purple-200">
                      {params.percentage > 0 ? '+' : ''}{params.percentage}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" max="100" step="5"
                    value={params.percentage}
                    onChange={(e) => setParams({ ...params, percentage: parseInt(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>-50% (Slump)</span>
                    <span>Baseline (0%)</span>
                    <span>+100% (Surge)</span>
                  </div>
                  <p className="text-xs text-purple-700/80 leading-relaxed pt-1">
                    Simulates accelerated daily consumption across all 25 materials and predicts which components run out first.
                  </p>
                </div>
              )}

              {/* Dynamic Inputs: Supplier Delay */}
              {scenarioType === 'supplier_delay' && (
                <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-orange-900 uppercase mb-1">Target Supplier</label>
                    <select
                      value={params.supplier_id}
                      onChange={(e) => setParams({ ...params, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-gray-800"
                    >
                      <option value="">All Primary Suppliers (System-wide)</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Avg Lead: {s.avg_delivery_days}d)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-orange-900 uppercase">Expected Delay (Days)</label>
                      <span className="text-sm font-bold text-orange-700 bg-white px-2 py-0.5 rounded border border-orange-200">
                        +{params.delay_days} Days
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="3" max="30" step="1"
                      value={params.delay_days}
                      onChange={(e) => setParams({ ...params, delay_days: parseInt(e.target.value) })}
                      className="w-full accent-orange-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-orange-700/80 leading-relaxed">
                    Evaluates cascading delays onto customer sales orders and calculates contractual penalty exposures.
                  </p>
                </div>
              )}

              {/* Dynamic Inputs: Price Change */}
              {scenarioType === 'price_change' && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 uppercase mb-1">Impacted Material</label>
                    <select
                      value={params.material_id}
                      onChange={(e) => setParams({ ...params, material_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-gray-800"
                    >
                      <option value="">All Materials (General Commodity Inflation)</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code} - ${m.unit_cost}/{m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-blue-900 uppercase">Price Variance</label>
                      <span className="text-sm font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {params.percentage > 0 ? '+' : ''}{params.percentage}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="-30" max="60" step="5"
                      value={params.percentage}
                      onChange={(e) => setParams({ ...params, percentage: parseInt(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Projects impact on procurement pipeline costs and calculates gross margin contraction.
                  </p>
                </div>
              )}

              {/* Run Simulation Button */}
              <button 
                onClick={handleRun}
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-all flex justify-center items-center space-x-2 shadow-sm disabled:opacity-50"
              >
                <Play size={18} />
                <span>{loading ? 'Simulating Operational Twin...' : 'Run Simulation'}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Right Column: Simulation Output & Analysis */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <span>Digital Twin Simulation Results</span>
                  </h3>
                  <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100">
                    Live Model Verified
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-800 leading-relaxed">
                  {result.summary}
                </div>
              </div>
              
              {/* Delta Impact Cards */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Projected Impact Deltas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.deltas.map((delta, i) => {
                    const isAdverse = delta.change > 0;
                    return (
                      <div key={i} className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 flex flex-col justify-between">
                        <p className="text-xs text-gray-500 font-medium mb-1.5">{delta.metric}</p>
                        <div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatDeltaValue(delta.metric, delta.simulated)}
                          </div>
                          <div className={`text-xs font-semibold flex items-center mt-1 ${
                            isAdverse ? 'text-red-600' : delta.change < 0 ? 'text-emerald-600' : 'text-gray-500'
                          }`}>
                            {delta.change > 0 ? (
                              <TrendingUp size={14} className="mr-1 shrink-0" />
                            ) : delta.change < 0 ? (
                              <TrendingDown size={14} className="mr-1 shrink-0" />
                            ) : (
                              <Minus size={14} className="mr-1 shrink-0" />
                            )}
                            <span>
                              {delta.change > 0 ? '+' : ''}{formatDeltaValue(delta.metric, delta.change)} vs baseline
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Detailed Before vs After Comparison */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Before vs. After State Breakdown</h4>
                <div className="overflow-hidden border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3">Operating Dimension</th>
                        <th className="px-4 py-3">Baseline (Current)</th>
                        <th className="px-4 py-3 text-purple-700 bg-purple-50/50">Simulated Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.keys(result.original).map(key => (
                        <tr key={key} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-800 capitalize">
                            {key.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {result.original[key]}
                          </td>
                          <td className="px-4 py-3 font-semibold text-purple-700 bg-purple-50/30">
                            {result.simulated[key]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Next Step Box */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start space-x-3 text-xs text-blue-900">
                <ShieldAlert size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Recommended Mitigation Strategy</span>
                  <p className="text-blue-800/90 leading-relaxed">
                    Navigate to <span className="font-semibold">Risk Alerts</span> to review AI-generated mitigation proposals, or adjust safety stock thresholds in <span className="font-semibold">Inventory</span> to prepare for demand volatility.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-12 h-full flex flex-col items-center justify-center text-center text-gray-500">
              <FlaskConical size={54} className="text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">Ready for Simulation</h3>
              <p className="max-w-md text-xs text-gray-500">
                Configure your parameters on the left or select a quick preset to model your supply chain's response in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;
