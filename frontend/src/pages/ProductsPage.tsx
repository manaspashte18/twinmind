import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { ProductApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import KPICard from '../components/KPICard';
import { Box, Plus, X, Tag } from 'lucide-react';

const ProductsPage: React.FC = () => {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Auto Component');
  const [unitPrice, setUnitPrice] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await ProductApi.getProducts();
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !unitPrice) return;
    try {
      setSubmitting(true);
      await ProductApi.createProduct({
        name,
        sku,
        category,
        unit_price: parseFloat(unitPrice)
      });
      setShowModal(false);
      setName('');
      setSku('');
      setUnitPrice('');
      await fetchData();
    } catch (error) {
      console.error('Failed to create product', error);
      alert('Failed to create product. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgPrice = data.length > 0 
    ? (data.reduce((acc, curr) => acc + (curr.unit_price || 0), 0) / data.length).toFixed(2) 
    : '0';

  const columns: Column<Product>[] = [
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-blue-600 font-semibold">{r.sku}</span> },
    { key: 'name', label: 'Product Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'category', label: 'Category', render: (r) => <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">{r.category || 'General'}</span> },
    { key: 'unit_price', label: 'Unit Price', render: (r) => <span className="font-semibold">${(r.unit_price || 0).toLocaleString()}</span> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Products Catalog</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Products" value={data.length} icon={Box} />
        <KPICard title="Avg Product Price" value={`$${parseFloat(avgPrice).toLocaleString()}`} icon={Tag} color="green" />
        <KPICard title="Categories" value="Auto Components" icon={Box} color="blue" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading products...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={10} />
        )}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Product</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brake Caliper Assembly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRD-041"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2450.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
