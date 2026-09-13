import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchApi } from '../services/api';
import { SearchItem } from '../types';
import { 
  LayoutDashboard, Package, Truck, BoxIcon, Users, 
  ShoppingCart, ClipboardList, AlertTriangle, FlaskConical, 
  FileText, Upload, Settings, Menu, Bell, Search, LogOut,
  X, Loader2, ArrowRight
} from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Inventory', path: '/inventory', icon: <Package size={20} /> },
    { name: 'Suppliers', path: '/suppliers', icon: <Truck size={20} /> },
    { name: 'Products', path: '/products', icon: <BoxIcon size={20} /> },
    { name: 'Customers', path: '/customers', icon: <Users size={20} /> },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingCart size={20} /> },
    { name: 'Sales Orders', path: '/sales-orders', icon: <ClipboardList size={20} /> },
    { name: 'Risk Alerts', path: '/risks', icon: <AlertTriangle size={20} /> },
    { name: 'Simulator', path: '/simulator', icon: <FlaskConical size={20} /> },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'Upload Data', path: '/upload', icon: <Upload size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Debounced Universal Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await SearchApi.search(searchQuery.trim());
        setSearchResults(res.data?.results || []);
      } catch (err) {
        console.error('Search failed', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard Shortcuts (Ctrl+K / Cmd+K to focus, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside to Dismiss Search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'material':
        return <Package size={16} className="text-emerald-600" />;
      case 'product':
        return <BoxIcon size={16} className="text-purple-600" />;
      case 'supplier':
        return <Truck size={16} className="text-blue-600" />;
      case 'customer':
        return <Users size={16} className="text-amber-600" />;
      case 'order':
        return <ShoppingCart size={16} className="text-indigo-600" />;
      case 'risk':
        return <AlertTriangle size={16} className="text-rose-600" />;
      default:
        return <Search size={16} className="text-gray-500" />;
    }
  };

  const getItemBadgeClass = (type: string) => {
    switch (type) {
      case 'material':
        return 'bg-emerald-50 border-emerald-200';
      case 'product':
        return 'bg-purple-50 border-purple-200';
      case 'supplier':
        return 'bg-blue-50 border-blue-200';
      case 'customer':
        return 'bg-amber-50 border-amber-200';
      case 'order':
        return 'bg-indigo-50 border-indigo-200';
      case 'risk':
        return 'bg-rose-50 border-rose-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleSelectResult = (url: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white transform transition-transform duration-200 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:flex-shrink-0`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <h1 className="text-2xl font-bold">TwinMind</h1>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center flex-1">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none md:hidden mr-2"
            >
              <Menu size={24} />
            </button>

            {/* Universal Search Bar */}
            <div ref={searchContainerRef} className="relative ml-2 sm:ml-4 flex-1 max-w-xs sm:max-w-md md:max-w-lg">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!searchOpen) setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search materials, orders, risks... (Ctrl+K)" 
                  className="w-full pl-10 pr-16 py-2 text-sm bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-gray-800 placeholder-gray-400"
                />
                <div className="absolute right-2.5 flex items-center space-x-1">
                  {isSearching && (
                    <Loader2 size={16} className="animate-spin text-blue-500 mr-1" />
                  )}
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded shadow-xs">
                    Ctrl+K
                  </kbd>
                </div>
              </div>

              {/* Floating Dropdown Results Panel */}
              {searchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 mt-2 w-80 sm:w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span>
                      {isSearching ? 'Searching...' : `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                    </span>
                    <span>Press ESC to dismiss</span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleSelectResult(item.url)}
                          className="p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center space-x-3 min-w-0 pr-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${getItemBadgeClass(item.type)}`}>
                              {getItemIcon(item.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {item.title}
                                </p>
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold bg-gray-100 text-gray-600 shrink-0">
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
                        </div>
                      ))
                    ) : !isSearching ? (
                      <div className="p-8 text-center">
                        <Search className="mx-auto text-gray-300 mb-2" size={28} />
                        <p className="text-sm font-medium text-gray-700">No matching records found</p>
                        <p className="text-xs text-gray-400 mt-1">Try searching by material, product, supplier, customer, order ID, or risk</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 relative ml-4">
            <button 
              onClick={() => navigate('/risks')}
              className="text-gray-500 hover:text-blue-600 relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="View Risk Alerts"
            >
              <Bell size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
