import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart2, CheckCircle2, AlertCircle, Loader2, Sparkles, TrendingUp, ShieldAlert, Package, ShoppingCart } from 'lucide-react';
import { ReportApi } from '../services/api';

interface DailyReportData {
  generated_at?: string;
  inventory?: string;
  suppliers?: string;
  orders?: string;
  risks?: string;
  metrics?: {
    materials_count: number;
    suppliers_count: number;
    products_count: number;
    customers_count: number;
    inventory_valuation: number;
    low_stock_items: number;
    open_purchase_orders: number;
    open_sales_orders: number;
    active_risks: number;
  };
}

const ReportsPage: React.FC = () => {
  const [downloadingEntity, setDownloadingEntity] = useState<string | null>(null);
  const [successEntity, setSuccessEntity] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyReportData | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);

  useEffect(() => {
    fetchDailySummary();
  }, []);

  const fetchDailySummary = async () => {
    try {
      const res = await ReportApi.getDailyReport();
      setDailyData(res.data);
    } catch (err) {
      console.error('Failed to fetch daily summary', err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const handleExport = async (entity: string, filenamePrefix?: string) => {
    try {
      setDownloadingEntity(entity);
      setSuccessEntity(null);

      const res = await ReportApi.exportData(entity);
      
      // Ensure data is treated as text/csv blob
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      // CRITICAL: Must be an anchor ('a') element, not a 'link' element
      const anchor = document.createElement('a');
      anchor.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const prefix = filenamePrefix || entity;
      anchor.setAttribute('download', `${prefix}_${dateStr}.csv`);
      
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      setSuccessEntity(entity);
      setTimeout(() => setSuccessEntity(null), 3000);
    } catch (error: any) {
      console.error(`Failed to export ${entity}`, error);
      alert(`Failed to download report for "${entity}". Please try again.`);
    } finally {
      setDownloadingEntity(null);
    }
  };

  const standardReports = [
    { 
      id: 'inventory', 
      name: 'Inventory Status & Valuation Report', 
      description: 'Material stock levels, safety thresholds, stock status, and total valuation.', 
      type: 'Daily',
      icon: Package
    },
    { 
      id: 'purchase_orders', 
      name: 'Supplier Purchase Orders Report', 
      description: 'Historical and open purchase orders with supplier names and delivery dates.', 
      type: 'Weekly',
      icon: ShoppingCart
    },
    { 
      id: 'sales_orders', 
      name: 'Sales Fulfillment & Backlog Report', 
      description: 'Customer commitments, promised shipping dates, and fulfillment progress.', 
      type: 'Weekly',
      icon: TrendingUp
    },
    { 
      id: 'risks', 
      name: 'Supply Chain Risk Assessment Summary', 
      description: 'Active stockout risks, supplier delay probabilities, and revenue impacts.', 
      type: 'Live Audit',
      icon: ShieldAlert
    }
  ];

  const rawDataExports = [
    { id: 'materials', name: 'Raw Materials List', desc: 'Codes, unit costs, safety limits' },
    { id: 'products', name: 'Finished Products Catalog', desc: 'SKUs, categories, prices' },
    { id: 'suppliers', name: 'Suppliers Directory', desc: 'Lead times, on-time rates' },
    { id: 'customers', name: 'Customer Accounts', desc: 'Contact info, priority status' },
    { id: 'inventory', name: 'Inventory Ledger', desc: 'Warehouse quantities & valuation' },
    { id: 'purchase_orders', name: 'Purchase Orders', desc: 'All PO records & statuses' },
    { id: 'sales_orders', name: 'Sales Orders', desc: 'All SO records & commitments' },
    { id: 'risks', name: 'Risk Alert Registry', desc: 'Historical & active risk scores' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Data Exports</h1>
          <p className="text-gray-500 mt-1">Download enriched operational reports and export full platform datasets in CSV format</p>
        </div>
        <button
          onClick={() => handleExport('daily_summary', 'Executive_Daily_Summary')}
          disabled={downloadingEntity === 'daily_summary'}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all disabled:opacity-50"
        >
          {downloadingEntity === 'daily_summary' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Sparkles size={18} />
          )}
          <span>{downloadingEntity === 'daily_summary' ? 'Generating Report...' : 'Download Executive Daily Report'}</span>
        </button>
      </div>

      {/* Live Operational Health Summary Banner */}
      {dailyData && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
              <FileText size={18} className="text-blue-400" />
              <span>Today's Operations Briefing</span>
            </h3>
            {dailyData.generated_at && (
              <span className="text-xs text-slate-400">Updated: {new Date(dailyData.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-xs mb-1">Tracked Materials</span>
              <span className="font-semibold text-slate-100">{dailyData.metrics?.materials_count ?? 25} Materials</span>
              <span className="text-xs text-amber-400 block mt-0.5">{dailyData.metrics?.low_stock_items ?? 0} low stock</span>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-xs mb-1">Inventory Valuation</span>
              <span className="font-semibold text-emerald-400">${(dailyData.metrics?.inventory_valuation ?? 0).toLocaleString()}</span>
              <span className="text-xs text-slate-400 block mt-0.5">Physical assets</span>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-xs mb-1">Open Purchase Orders</span>
              <span className="font-semibold text-blue-400">{dailyData.metrics?.open_purchase_orders ?? 0} in pipeline</span>
              <span className="text-xs text-slate-400 block mt-0.5">{dailyData.metrics?.suppliers_count ?? 8} suppliers</span>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-xs mb-1">Active Risk Alerts</span>
              <span className="font-semibold text-red-400">{dailyData.metrics?.active_risks ?? 0} Alerts</span>
              <span className="text-xs text-slate-400 block mt-0.5">Require mitigation</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Standard Reports & Raw Data Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standard Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Standard Operational Reports</h2>
                <p className="text-xs text-gray-500">Structured reports enriched with relations, status indicators, and calculations</p>
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              {standardReports.map(report => {
                const isDownloading = downloadingEntity === report.id;
                const isSuccess = successEntity === report.id;
                const IconComponent = report.icon;

                return (
                  <div 
                    key={report.id} 
                    className="p-4 border border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all flex justify-between items-center bg-gray-50/50 hover:bg-white"
                  >
                    <div className="pr-4 flex items-start space-x-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-100 text-blue-600 mt-0.5">
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 text-sm">{report.name}</h3>
                          <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/50">
                            {report.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{report.description}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleExport(report.id, report.name.replace(/\s+/g, '_'))}
                      disabled={isDownloading}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSuccess
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : isDownloading
                          ? 'bg-gray-100 text-gray-500 border border-gray-200'
                          : 'bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs hover:border-blue-300'
                      }`}
                      title="Download CSV"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Exporting...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Raw Data Exports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Complete Database Exports</h2>
                <p className="text-xs text-gray-500">Download raw table records directly for audits, backups, or external BI tools</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {rawDataExports.map(entity => {
                const isDownloading = downloadingEntity === entity.id;
                const isSuccess = successEntity === entity.id;

                return (
                  <button 
                    key={entity.id}
                    onClick={() => handleExport(entity.id)}
                    disabled={isDownloading}
                    className={`flex items-center justify-between p-3.5 border rounded-xl text-left transition-all group ${
                      isSuccess
                        ? 'border-green-300 bg-green-50/50'
                        : isDownloading
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/20 bg-gray-50/30'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 block">
                        {entity.name}
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">
                        {entity.desc}
                      </span>
                    </div>

                    <div className="ml-2">
                      {isDownloading ? (
                        <Loader2 size={16} className="animate-spin text-gray-500" />
                      ) : isSuccess ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <div className="p-1.5 rounded-md bg-white border border-gray-200 group-hover:border-emerald-300 text-gray-400 group-hover:text-emerald-600 shadow-2xs">
                          <Download size={14} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center space-x-2 text-xs text-gray-500">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>Files are formatted with UTF-8 CSV headers and compatible with Excel, Google Sheets, and Power BI.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
