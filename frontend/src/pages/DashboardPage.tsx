import React, { useEffect, useState } from 'react';
import { 
  Package, DollarSign, AlertTriangle, Truck, 
  ShoppingCart, RefreshCw, BarChart3, Database
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

import { DashboardSummary, RiskAlert, InventoryRecord } from '../types';
import { DashboardApi, RiskApi, InventoryApi, SeedApi } from '../services/api';

import KPICard from '../components/KPICard';
import HealthScoreCard from '../components/HealthScoreCard';
import RiskAlertCard from '../components/RiskAlertCard';

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentRisks, setRecentRisks] = useState<RiskAlert[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, riskRes, invRes] = await Promise.all([
        DashboardApi.getDashboardSummary(),
        RiskApi.getRisks(),
        InventoryApi.getInventory()
      ]);
      setSummary(sumRes.data);
      setRecentRisks(riskRes.data.filter(r => r.status === 'active').slice(0, 5));
      setInventory(invRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await SeedApi.seedDatabase();
      await fetchData();
    } catch (error) {
      console.error('Failed to seed DB', error);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const needsSeeding = summary && summary.total_materials === 0 && summary.total_products === 0;

  if (needsSeeding) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-6">
        <div className="p-6 bg-blue-50 rounded-full text-blue-600 mb-4">
          <Database size={64} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Welcome to TwinMind</h2>
        <p className="text-lg text-gray-600">
          Your organization currently has no data. You can either manually upload your supply chain data or generate demo data to explore the platform's capabilities.
        </p>
        <div className="flex gap-4 mt-8">
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm disabled:opacity-70"
          >
            {seeding ? <RefreshCw className="animate-spin mr-2" size={20} /> : <Database className="mr-2" size={20} />}
            Generate Demo Data
          </button>
        </div>
      </div>
    );
  }

  // Chart Data preparation
  const inventoryChartData = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(item => ({
      name: item.material?.name || `Material ${item.material_id}`,
      quantity: item.quantity,
      status: item.quantity <= (item.material?.min_stock_level || 0) ? 'Critical' : 'Healthy'
    }));

  const riskPieData = [
    { name: 'Critical', value: recentRisks.filter(r => r.severity === 'critical').length, color: '#dc2626' },
    { name: 'High', value: recentRisks.filter(r => r.severity === 'high').length, color: '#ea580c' },
    { name: 'Medium', value: recentRisks.filter(r => r.severity === 'medium').length, color: '#eab308' },
    { name: 'Low', value: recentRisks.filter(r => r.severity === 'low').length, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Supply Chain Dashboard</h1>
        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      {summary && summary.health_score && (
        <HealthScoreCard {...summary.health_score} />
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Total Inventory Value" 
            value={`$${summary.total_inventory_value.toLocaleString()}`} 
            icon={DollarSign} 
            color="blue"
            trend="up"
            trendValue="+5.2%"
          />
          <KPICard 
            title="Low Stock Items" 
            value={summary.low_stock_count} 
            icon={Package} 
            color={summary.low_stock_count > 0 ? 'red' : 'green'}
            trend={summary.low_stock_count > 0 ? 'up' : 'stable'}
            trendValue="Needs attention"
          />
          <KPICard 
            title="Open Purchase Orders" 
            value={summary.open_purchase_orders} 
            icon={ShoppingCart} 
            color="orange"
          />
          <KPICard 
            title="Active Risk Alerts" 
            value={summary.active_risks} 
            icon={AlertTriangle} 
            color={summary.active_risks > 0 ? 'red' : 'gray'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 size={20} className="mr-2 text-blue-600" />
                Top Inventory Levels
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                    {inventoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === 'Critical' ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Distribution</h3>
            {riskPieData.length > 0 ? (
              <div className="h-64 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4 text-green-500">
                  <CheckCircle size={32} />
                </div>
                <p>No active risks detected</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Priority Risks</h3>
              <a href="/risks" className="text-sm font-medium text-blue-600 hover:text-blue-800">View All</a>
            </div>
            
            {recentRisks.length > 0 ? (
              <div className="space-y-4">
                {recentRisks.map(alert => (
                  <RiskAlertCard key={alert.id} alert={alert} onUpdate={fetchData} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No active risks require your attention.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Also defining CheckCircle since it wasn't imported initially
import { CheckCircle } from 'lucide-react';

export default DashboardPage;
