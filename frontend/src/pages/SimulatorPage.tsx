import React, { useState } from 'react';
import { SimulatorApi } from '../services/api';
import { ScenarioResult } from '../types';
import { FlaskConical, Play, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SimulatorPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState('demand_surge');
  const [params, setParams] = useState({ percentage: 20, supplier_id: '', delay_days: 14, material_id: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const payload = {
        scenario_type: scenarioType,
        parameters: params
      };
      const res = await SimulatorApi.runScenario(payload);
      setResult(res.data);
    } catch (error) {
      console.error('Simulation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <FlaskConical size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supply Chain Simulator</h1>
          <p className="text-gray-500">Test 'what-if' scenarios against your digital twin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Scenario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Type</label>
                <select 
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="demand_surge">Demand Change</option>
                  <option value="supplier_delay">Supplier Delay</option>
                  <option value="price_change">Material Price Change</option>
                </select>
              </div>

              {scenarioType === 'demand_surge' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Demand Change (%)</label>
                  <input 
                    type="range" 
                    min="-50" max="100" step="5"
                    value={params.percentage}
                    onChange={(e) => setParams({...params, percentage: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="text-center font-bold text-purple-600 mt-2">{params.percentage > 0 ? '+' : ''}{params.percentage}%</div>
                </div>
              )}

              {scenarioType === 'supplier_delay' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier ID</label>
                    <input 
                      type="number"
                      value={params.supplier_id}
                      onChange={(e) => setParams({...params, supplier_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delay (Days)</label>
                    <input 
                      type="number"
                      value={params.delay_days}
                      onChange={(e) => setParams({...params, delay_days: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {scenarioType === 'price_change' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material ID</label>
                    <input 
                      type="number"
                      value={params.material_id}
                      onChange={(e) => setParams({...params, material_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Change (%)</label>
                    <input 
                      type="range" 
                      min="-50" max="100" step="5"
                      value={params.percentage}
                      onChange={(e) => setParams({...params, percentage: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="text-center font-bold text-purple-600 mt-2">{params.percentage > 0 ? '+' : ''}{params.percentage}%</div>
                  </div>
                </>
              )}

              <button 
                onClick={runSimulation}
                disabled={loading}
                className="w-full py-3 mt-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex justify-center items-center disabled:opacity-70"
              >
                {loading ? <span className="animate-pulse">Simulating...</span> : <><Play size={18} className="mr-2"/> Run Simulation</>}
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Simulation Results</h3>
              <p className="text-gray-600 mb-6">{result.summary}</p>
              
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Impact Analysis</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {result.deltas.map((delta, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1 capitalize">{delta.metric.replace(/_/g, ' ')}</p>
                    <div className="flex items-end space-x-2">
                      <span className="text-2xl font-bold text-gray-900">{delta.simulated}</span>
                      <span className={`text-sm font-bold flex items-center ${delta.change > 0 ? 'text-red-500' : delta.change < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                        {delta.change > 0 ? <TrendingUp size={16} className="mr-1"/> : delta.change < 0 ? <TrendingDown size={16} className="mr-1"/> : <Minus size={16} className="mr-1"/>}
                        {Math.abs(delta.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Before / After Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Metric</th>
                      <th className="px-4 py-3">Original State</th>
                      <th className="px-4 py-3 rounded-tr-lg text-purple-700">Simulated State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.keys(result.original).map(key => (
                      <tr key={key}>
                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-gray-600">{result.original[key]}</td>
                        <td className="px-4 py-3 font-semibold text-purple-700 bg-purple-50">{result.simulated[key]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-12 h-full flex flex-col items-center justify-center text-center text-gray-500">
              <FlaskConical size={64} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Ready for Simulation</h3>
              <p className="max-w-md">Configure your parameters on the left and run the simulation to see how different scenarios affect your supply chain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;
