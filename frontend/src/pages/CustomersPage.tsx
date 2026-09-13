import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { CustomerApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import { Users, Plus, X, Award, ShieldAlert, Edit2, Check } from 'lucide-react';

const CustomersPage: React.FC = () => {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPriority, setEditPriority] = useState('normal');

  // Form state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priority, setPriority] = useState('normal');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await CustomerApi.getCustomers();
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      setSubmitting(true);
      await CustomerApi.createCustomer({
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        priority
      });
      setShowModal(false);
      setName('');
      setContactEmail('');
      setContactPhone('');
      setPriority('normal');
      await fetchData();
    } catch (error) {
      console.error('Failed to create customer', error);
      alert('Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditEmail(cust.contact_email || '');
    setEditPhone(cust.contact_phone || '');
    setEditPriority(cust.priority || 'normal');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      setSubmitting(true);
      await CustomerApi.updateCustomer(editingCustomer.id, {
        name: editName,
        contact_email: editEmail || null,
        contact_phone: editPhone || null,
        priority: editPriority
      });
      setEditingCustomer(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update customer', err);
      alert('Failed to update customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const criticalCount = data.filter(c => c.priority === 'critical').length;
  const highCount = data.filter(c => c.priority === 'high').length;

  const columns: Column<Customer>[] = [
    { key: 'name', label: 'Customer Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'contact_email', label: 'Email', render: (r) => r.contact_email || 'procurement@client.com' },
    { key: 'contact_phone', label: 'Phone', render: (r) => r.contact_phone || '+91 98200 12345' },
    { 
      key: 'priority', 
      label: 'Account Priority', 
      render: (r) => {
        const colors: Record<string, string> = {
          critical: 'bg-red-100 text-red-800 border-red-200',
          high: 'bg-orange-100 text-orange-800 border-orange-200',
          normal: 'bg-blue-100 text-blue-800 border-blue-200',
          low: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${colors[r.priority] || colors.normal}`}>
            {r.priority}
          </span>
        );
      }
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEdit(r);
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center space-x-1"
          title="Edit customer details & priority"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus size={18} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Accounts" value={data.length} icon={Users} />
        <KPICard title="Critical Tier-1 Accounts" value={criticalCount} icon={ShieldAlert} color="red" />
        <KPICard title="High Priority Accounts" value={highCount} icon={Award} color="orange" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading customers...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={10} />
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Customer</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Passenger Division"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="e.g. orders@tatamotors.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 20 6613 0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="critical">Critical (Tier-1 Partner)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low Priority</option>
                </select>
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
                  {submitting ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Customer Account</h3>
                <p className="text-xs text-gray-500 mt-0.5">Account ID: #{editingCustomer.id}</p>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Customer Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="critical">Critical (Tier-1 Partner)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Check size={16} />
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
