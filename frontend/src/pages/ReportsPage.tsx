import React from 'react';
import { Download, FileText, BarChart2 } from 'lucide-react';
import { ReportApi } from '../services/api';

const ReportsPage: React.FC = () => {
  const handleExport = async (entity: string) => {
    try {
      const res = await ReportApi.exportData(entity);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('link');
      link.href = url;
      link.setAttribute('download', `${entity}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Failed to export ${entity}`, error);
    }
  };

  const reports = [
    { id: 'inventory', name: 'Inventory Status Report', description: 'Current stock levels, valuation, and low stock alerts', type: 'Daily' },
    { id: 'purchase_orders', name: 'Supplier Orders Report', description: 'All open and recently completed purchase orders', type: 'Weekly' },
    { id: 'sales_orders', name: 'Sales Fulfillment Report', description: 'Customer orders and fulfillment status', type: 'Weekly' },
    { id: 'risks', name: 'Risk Assessment Summary', description: 'Active supply chain risks and historical incidents', type: 'Monthly' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
        <p className="text-gray-500 mt-1">Generate standard reports or export your raw data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={20} /></div>
            <h2 className="text-lg font-semibold text-gray-900">Standard Reports</h2>
          </div>
          
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="p-4 border border-gray-100 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all flex justify-between items-center group">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">{report.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{report.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                </div>
                <button className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-blue-50 rounded-full">
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><BarChart2 size={20} /></div>
            <h2 className="text-lg font-semibold text-gray-900">Raw Data Exports</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">Export your complete datasets as CSV files for external analysis or backup.</p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'materials', name: 'Materials' },
              { id: 'products', name: 'Products' },
              { id: 'suppliers', name: 'Suppliers' },
              { id: 'customers', name: 'Customers' },
              { id: 'inventory', name: 'Inventory' },
              { id: 'purchase_orders', name: 'Purchase Orders' },
              { id: 'sales_orders', name: 'Sales Orders' }
            ].map(entity => (
              <button 
                key={entity.id}
                onClick={() => handleExport(entity.id)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{entity.name}</span>
                <Download size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
