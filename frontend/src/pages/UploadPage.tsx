import React, { useState } from 'react';
import { UploadApi } from '../services/api';
import { UploadPreview } from '../types';
import FileUploader from '../components/FileUploader';
import DataTable from '../components/DataTable';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const UploadPage: React.FC = () => {
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [entityType, setEntityType] = useState('materials');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: boolean, message: string} | null>(null);

  const handleUpload = async (file: File) => {
    try {
      const res = await UploadApi.uploadFile(file);
      setPreview(res.data);
      setImportResult(null);
    } catch (error) {
      console.error('Upload failed', error);
      throw error;
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      // Create a default mapping mapping uploaded columns exactly to themselves for this MVP
      const column_mapping = preview.columns.reduce((acc, col) => ({...acc, [col]: col}), {});
      
      const payload = {
        entity_type: entityType,
        filename: preview.filename,
        column_mapping,
        mappings: column_mapping,
        rows: preview.rows || preview.preview
      };

      const res = await UploadApi.confirmUpload(payload);
      const insertedCount = res.data?.inserted_count ?? preview.total_rows;
      setImportResult({ success: true, message: `Successfully imported ${insertedCount} ${entityType}` });
      setPreview(null);
    } catch (error: any) {
      setImportResult({ 
        success: false, 
        message: error.response?.data?.message || 'Import failed. Please check your data format.' 
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <p className="text-gray-500 mt-1">Upload CSV or Excel files to update your digital twin</p>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${importResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {importResult.success ? <CheckCircle size={20} className="text-green-600 mt-0.5" /> : <AlertTriangle size={20} className="text-red-600 mt-0.5" />}
          <div>
            <h4 className="font-medium">{importResult.success ? 'Import Successful' : 'Import Failed'}</h4>
            <p className="text-sm mt-1">{importResult.message}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Select Data Type</h3>
        <select 
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-8"
        >
          <option value="materials">Materials</option>
          <option value="products">Products</option>
          <option value="suppliers">Suppliers</option>
          <option value="customers">Customers</option>
          <option value="inventory">Inventory Records</option>
          <option value="purchase_orders">Purchase Orders</option>
          <option value="sales_orders">Sales Orders</option>
        </select>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Upload File</h3>
        <FileUploader onUpload={handleUpload} />
      </div>

      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">3. Preview & Import</h3>
              <p className="text-sm text-gray-500">Found {preview.total_rows} rows in {preview.filename}</p>
            </div>
            <button 
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {importing ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Data Preview (First 5 rows)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                  <tr>
                    {preview.columns.map((col, i) => (
                      <th key={i} className="px-4 py-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {preview.columns.map((col, j) => (
                        <td key={j} className="px-4 py-3 text-gray-600">{String(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
