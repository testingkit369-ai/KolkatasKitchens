import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.ts';
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingBag, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MapPin,
  Star,
  DollarSign,
  Filter,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Image as ImageIcon,
  Loader2,
  Database,
  Sparkles,
  Download,
  FileText,
  ShieldAlert,
  Eye,
  UserCheck,
  Zap,
  Activity,
  History,
  Lock,
  UserMinus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  db, 
  OperationType, 
  handleFirestoreError, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  where, 
  collectionGroup,
  orderBy,
  limit
} from '../firebase';
import { useNavigate } from 'react-router-dom';
import { seedDatabase } from '../services/seedService';
import { fetchAdminAnalytics } from '../services/adminAnalytics';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../lib/utils';
import { Outlet, Order, MenuItem, AuditLog, AnalyticsMetrics } from '../types';

// --- Subcomponents ---

const KPICard = ({ label, value, trend, isUp, icon: Icon, color, bg, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className={cn(bg, color, "p-4 rounded-2xl group-hover:scale-110 transition-transform")}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn("flex items-center space-x-1 text-xs font-black", isUp ? 'text-green-600' : 'text-red-600')}>
          <span>{trend}</span>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        </div>
      </div>
      <h3 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-3xl font-black text-swiggy-dark">{value}</p>
    </div>
  </motion.div>
);

const SkeletonCard = () => (
  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
      <div className="w-12 h-4 bg-gray-100 rounded-full" />
    </div>
    <div className="w-24 h-4 bg-gray-100 rounded-full mb-2" />
    <div className="w-32 h-8 bg-gray-100 rounded-full" />
  </div>
);

// --- Main Component ---

export default function Admin() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  
  // RBAC Check
  const isSuperAdmin = user?.role === 'super_admin' || user?.email === 'testingkit369@gmail.com';
  const isAdmin = isSuperAdmin || user?.role === 'admin';
  const isOutletManager = user?.role === 'outlet_manager';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Virtualization for large tables
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  useEffect(() => {
    if (!isAdmin && !isOutletManager) {
      navigate('/');
      return;
    }

    // Real-time Outlets
    const outletsQuery = isSuperAdmin 
      ? query(collection(db, 'outlets'))
      : query(collection(db, 'outlets'), where('id', '==', user?.outlet_id));

    const unsubscribeOutlets = onSnapshot(outletsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outlet));
      setOutlets(data);
    });

    // Real-time Orders
    const ordersQuery = isSuperAdmin
      ? query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))
      : query(collectionGroup(db, 'orders'), where('outlet_id', '==', user?.outlet_id), orderBy('createdAt', 'desc'), limit(100));

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
    });

    // Audit Logs (Super Admin only)
    if (isSuperAdmin) {
      const auditQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
      onSnapshot(auditQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        setAuditLogs(data);
      });

      // Users (Super Admin only)
      const usersQuery = query(collection(db, 'users'), limit(100));
      onSnapshot(usersQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(data);
      });

      // System Config
      onSnapshot(doc(db, 'config', 'system'), (doc) => {
        if (doc.exists()) setSystemConfig(doc.data());
      });
    }

    return () => {
      unsubscribeOutlets();
      unsubscribeOrders();
    };
  }, [isAdmin, isOutletManager, isSuperAdmin, navigate, user?.outlet_id]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await fetchAdminAnalytics(timeRange, isSuperAdmin ? undefined : user?.outlet_id);
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error("Analytics load error:", error);
      }
    };
    loadMetrics();
  }, [timeRange, isSuperAdmin, user?.outlet_id]);

  const handleExport = async (type: 'orders' | 'revenue' | 'audit') => {
    setIsExporting(true);
    try {
      const data = type === 'orders' ? orders : type === 'audit' ? auditLogs : [];
      exportToCSV(data, `kolkata_kitchen_${type}_${Date.now()}.csv`);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      // Log the action
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: Date.now(),
        userEmail: user?.email,
        action: 'UPDATE_ROLE',
        targetType: 'user',
        targetId: userId,
        details: `Changed role to ${newRole}`
      });
    } catch (error) {
      console.error("Role update error:", error);
    }
  };

  const handleUpdateConfig = async (key: string, value: any) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'config', 'system'), { [key]: value });
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: Date.now(),
        userEmail: user?.email,
        action: 'UPDATE_CONFIG',
        targetType: 'system',
        targetId: 'config',
        details: `Updated ${key} to ${value}`
      });
    } catch (error) {
      console.error("Config update error:", error);
    }
  };

  const [isAddingOutlet, setIsAddingOutlet] = useState(false);
  const [newOutlet, setNewOutlet] = useState({
    name: '',
    address: '',
    cuisine: '',
    rating: 4.5,
    deliveryTime: '30-40 min',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    isOpen: true,
    isPromoted: false
  });

  const handleImpersonate = async (targetUserId: string) => {
    if (!isSuperAdmin) return;
    // Mock impersonation for now - in a real app this would involve a secure token swap
    localStorage.setItem('impersonated_user_id', targetUserId);
    alert(`Impersonation mode active for user ${targetUserId}. Refresh to see changes (mock).`);
  };

  const handleAddOutlet = async () => {
    if (!isSuperAdmin) return;
    try {
      await addDoc(collection(db, 'outlets'), {
        ...newOutlet,
        createdAt: Date.now()
      });
      setIsAddingOutlet(false);
      // Log action
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: Date.now(),
        userEmail: user?.email,
        action: 'CREATE_OUTLET',
        targetType: 'outlet',
        targetId: 'new',
        details: `Created outlet: ${newOutlet.name}`
      });
    } catch (error) {
      console.error("Error adding outlet:", error);
    }
  };

  if (!isAdmin && !isOutletManager) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <div className="w-80 bg-swiggy-dark text-white flex flex-col sticky top-0 h-screen z-50">
        <div className="p-10 border-b border-white/5">
          <div className="flex items-center space-x-4">
            <div className="bg-swiggy-orange p-3 rounded-2xl shadow-lg shadow-swiggy-orange/20">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">KOLKATA'S</h1>
              <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-[0.3em]">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-8 space-y-3 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Analytics Pulse', icon: Activity, roles: ['super_admin', 'admin', 'outlet_manager'] },
            { id: 'outlets', label: 'Outlet Network', icon: MapPin, roles: ['super_admin', 'admin'] },
            { id: 'orders', label: 'Live Logistics', icon: ShoppingBag, roles: ['super_admin', 'admin', 'outlet_manager'] },
            { id: 'pricing', label: 'Pricing Oversight', icon: Zap, roles: ['super_admin', 'admin'] },
            { id: 'users', label: 'Access Control', icon: Lock, roles: ['super_admin'] },
            { id: 'audit', label: 'Audit Trail', icon: History, roles: ['super_admin'] },
            { id: 'settings', label: 'System Config', icon: Settings, roles: ['super_admin'] },
          ].filter(item => item.roles.includes(user?.role || 'customer')).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group",
                activeTab === item.id 
                  ? 'bg-swiggy-orange text-white shadow-xl shadow-swiggy-orange/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? 'text-white' : 'text-gray-500')} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <div className="bg-white/5 rounded-[24px] p-5 flex items-center space-x-4 border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-swiggy-orange flex items-center justify-center font-black text-white shadow-lg">
              {user?.displayName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{user?.displayName || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-12 py-8 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h2 className="text-3xl font-black text-swiggy-dark capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs text-swiggy-gray font-bold uppercase tracking-[0.2em] mt-1">Enterprise Management Layer</p>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Time Range Selector */}
            <div className="bg-gray-50 p-1.5 rounded-2xl flex space-x-1 border border-gray-100">
              {(['24h', '7d', '30d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    timeRange === range ? 'bg-white text-swiggy-dark shadow-sm' : 'text-swiggy-gray hover:text-swiggy-dark'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="h-10 w-px bg-gray-100" />

            <button 
              onClick={() => handleExport('orders')}
              disabled={isExporting}
              className="flex items-center space-x-3 bg-swiggy-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-swiggy-orange transition-all shadow-lg shadow-swiggy-dark/10 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Export Report</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                    <>
                      <KPICard 
                        label="Orders / Min" 
                        value={metrics?.ordersPerMin.toFixed(2)} 
                        trend="+14.2%" 
                        isUp={true} 
                        icon={Zap} 
                        color="text-orange-600" 
                        bg="bg-orange-50" 
                        delay={0.1}
                      />
                      <KPICard 
                        label="Avg. Order Value" 
                        value={`₹${metrics?.avgOrderValue.toFixed(0)}`} 
                        trend="+5.8%" 
                        isUp={true} 
                        icon={DollarSign} 
                        color="text-green-600" 
                        bg="bg-green-50" 
                        delay={0.2}
                      />
                      <KPICard 
                        label="Rider Utilization" 
                        value={`${metrics?.riderUtilization.toFixed(1)}%`} 
                        trend="-2.4%" 
                        isUp={false} 
                        icon={Activity} 
                        color="text-blue-600" 
                        bg="bg-blue-50" 
                        delay={0.3}
                      />
                      <KPICard 
                        label="Outlet Health" 
                        value={`${metrics?.outletHealth.toFixed(0)}/100`} 
                        trend="+1.2%" 
                        isUp={true} 
                        icon={ShieldAlert} 
                        color="text-purple-600" 
                        bg="bg-purple-50" 
                        delay={0.4}
                      />
                    </>
                  )}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-xl font-black text-swiggy-dark">Revenue Velocity</h3>
                        <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Real-time financial flow</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-swiggy-orange rounded-full" />
                        <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Gross Revenue</span>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics?.revenueTrend}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fc8019" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#fc8019" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="timestamp" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#93959f', fontSize: 10, fontWeight: 700 }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#93959f', fontSize: 10, fontWeight: 700 }} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px' }}
                            itemStyle={{ fontWeight: 900, color: '#fc8019' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#fc8019" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorRev)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100">
                    <h3 className="text-xl font-black text-swiggy-dark mb-10">Outlet Performance</h3>
                    <div className="space-y-8">
                      {outlets.slice(0, 5).map((outlet, i) => (
                        <div key={outlet.id} className="group cursor-pointer">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                                <img src={outlet.image} alt={outlet.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-swiggy-dark">{outlet.name}</p>
                                <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">{outlet.location}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-swiggy-dark">₹{(Math.random() * 50000).toFixed(0)}</p>
                              <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Top 5%</p>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${80 + Math.random() * 20}%` }}
                              className="h-full bg-swiggy-orange"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('outlets')} className="w-full mt-12 py-5 border-2 border-dashed border-gray-100 rounded-[24px] text-swiggy-gray font-black uppercase text-[10px] tracking-widest hover:border-swiggy-orange hover:text-swiggy-orange transition-all">
                      View Network Map
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'outlets' && (
              <motion.div
                key="outlets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-swiggy-dark">Network Nodes</h3>
                      <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Manage active outlet performance & status</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingOutlet(true)}
                      className="bg-swiggy-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-swiggy-dark/10 hover:bg-swiggy-orange transition-all flex items-center space-x-3"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Onboard New Outlet</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">Outlet</th>
                          <th className="px-10 py-6">Status</th>
                          <th className="px-10 py-6">Performance</th>
                          <th className="px-10 py-6">Revenue (24h)</th>
                          <th className="px-10 py-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {outlets.map((outlet) => (
                          <tr key={outlet.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                                  <img src={outlet.image} alt={outlet.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-swiggy-dark">{outlet.name}</p>
                                  <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">{outlet.cuisines?.join(', ') || 'Cuisine'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-2">
                                <div className={cn("w-2 h-2 rounded-full", (outlet.isOpen || outlet.status === 'active') ? 'bg-green-500' : 'bg-red-500')} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-swiggy-dark">{(outlet.isOpen || outlet.status === 'active') ? 'Active' : 'Closed'}</span>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-1 text-swiggy-orange">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="text-xs font-black">{outlet.rating}</span>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-black text-swiggy-dark">₹{(Math.random() * 50000 + 10000).toFixed(0)}</p>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-3">
                                <button className="p-3 bg-gray-50 rounded-xl text-swiggy-dark hover:bg-swiggy-orange hover:text-white transition-all">
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button className="p-3 bg-gray-50 rounded-xl text-swiggy-dark hover:bg-blue-500 hover:text-white transition-all">
                                  <TrendingUp className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'audit' && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-2xl font-black text-swiggy-dark">System Audit Trail</h3>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search logs..." 
                          className="bg-gray-50 border-none rounded-2xl py-3 px-12 text-xs font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-64"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">Timestamp</th>
                          <th className="px-10 py-6">Admin</th>
                          <th className="px-10 py-6">Action</th>
                          <th className="px-10 py-6">Target</th>
                          <th className="px-10 py-6">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-8">
                              <p className="text-xs font-black text-swiggy-dark">{new Date(log.timestamp).toLocaleString()}</p>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-swiggy-dark flex items-center justify-center text-[10px] font-black text-white">
                                  {log.userEmail[0].toUpperCase()}
                                </div>
                                <p className="text-xs font-bold text-swiggy-dark">{log.userEmail}</p>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-swiggy-dark">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-bold text-swiggy-gray uppercase tracking-widest">{log.targetType}: {log.targetId.slice(0, 8)}</p>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs text-swiggy-dark font-medium max-w-xs truncate">{log.details}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-swiggy-dark">Live Logistics</h3>
                      <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Global order flow across network</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search Order ID..." 
                          className="bg-gray-50 border-none rounded-2xl py-3 px-12 text-xs font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-64"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray w-4 h-4" />
                      </div>
                      <button className="p-4 bg-gray-50 rounded-2xl text-swiggy-dark hover:bg-gray-100 transition-all">
                        <Filter className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">Order ID</th>
                          <th className="px-10 py-6">Customer</th>
                          <th className="px-10 py-6">Status</th>
                          <th className="px-10 py-6">Total</th>
                          <th className="px-10 py-6">Time</th>
                          <th className="px-10 py-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-8">
                              <p className="text-xs font-black text-swiggy-dark">#{order.id.slice(-8).toUpperCase()}</p>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-bold text-swiggy-dark">{order.customerName || 'Guest'}</p>
                            </td>
                            <td className="px-10 py-8">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-orange-100 text-orange-600'
                              )}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-black text-swiggy-dark">₹{order.total}</p>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-bold text-swiggy-gray">{new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleTimeString()}</p>
                            </td>
                            <td className="px-10 py-8">
                              <button className="p-3 bg-gray-50 rounded-xl text-swiggy-dark hover:bg-swiggy-orange hover:text-white transition-all">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-swiggy-dark">Access Governance</h3>
                      <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Manage system roles & permissions</p>
                    </div>
                    <button className="bg-swiggy-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-swiggy-dark/10 hover:bg-swiggy-orange transition-all">
                      Invite System Admin
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">User</th>
                          <th className="px-10 py-6">Role</th>
                          <th className="px-10 py-6">Outlet ID</th>
                          <th className="px-10 py-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-swiggy-dark">
                                  {u.displayName?.[0] || u.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-swiggy-dark">{u.displayName || 'Unnamed User'}</p>
                                  <p className="text-[10px] text-swiggy-gray font-bold">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <select 
                                value={u.role || 'customer'}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                className="bg-gray-50 border-none rounded-xl py-2 px-4 text-[10px] font-black uppercase tracking-widest text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="outlet_manager">Manager</option>
                                <option value="rider">Rider</option>
                                <option value="customer">Customer</option>
                              </select>
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-xs font-bold text-swiggy-gray">{u.outlet_id || 'N/A'}</p>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => handleImpersonate(u.id)}
                                  className="p-3 bg-gray-50 rounded-xl text-swiggy-dark hover:bg-blue-500 hover:text-white transition-all"
                                  title="Impersonate User"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button className="p-3 bg-gray-50 rounded-xl text-swiggy-dark hover:bg-red-500 hover:text-white transition-all">
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pricing' && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-black text-swiggy-dark">Dynamic Pricing Oversight</h3>
                      <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Global price overrides & surge control</p>
                    </div>
                    <div className="bg-orange-50 text-swiggy-orange px-6 py-3 rounded-2xl flex items-center space-x-3">
                      <Zap className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Surge Active: {systemConfig?.globalSurge || '1.0'}x</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                        <Zap className="w-6 h-6 text-swiggy-orange" />
                      </div>
                      <h4 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-4">Global Surge Multiplier</h4>
                      <div className="flex items-center space-x-4">
                        <input 
                          type="range" 
                          min="1" 
                          max="3" 
                          step="0.1" 
                          value={systemConfig?.globalSurge || 1}
                          onChange={(e) => handleUpdateConfig('globalSurge', parseFloat(e.target.value))}
                          className="flex-1 accent-swiggy-orange"
                        />
                        <span className="text-xl font-black text-swiggy-dark">{systemConfig?.globalSurge || '1.0'}x</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-1">Price Overrides</h4>
                      <p className="text-3xl font-black text-swiggy-dark mb-2">0</p>
                      <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">Pending approval</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-1">Avg. Markup</h4>
                      <p className="text-3xl font-black text-swiggy-dark mb-2">15%</p>
                      <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">Across network</p>
                    </div>
                  </div>

                  <div className="p-10 border-2 border-dashed border-gray-100 rounded-[32px] text-center">
                    <p className="text-swiggy-gray font-bold mb-6">No pending price overrides require your approval.</p>
                    <button className="text-swiggy-orange font-black uppercase text-[10px] tracking-widest hover:underline">
                      View Pricing History
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10">
                  <h3 className="text-2xl font-black text-swiggy-dark mb-10">System Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <div>
                          <p className="text-sm font-black text-swiggy-dark">Maintenance Mode</p>
                          <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">Disable all orders globally</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateConfig('maintenanceMode', !systemConfig?.maintenanceMode)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            systemConfig?.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                          )}
                        >
                          <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", systemConfig?.maintenanceMode ? 'left-7' : 'left-1')} />
                        </button>
                      </div>

                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-sm font-black text-swiggy-dark mb-4">Base Delivery Fee (₹)</p>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="number" 
                            value={systemConfig?.baseDeliveryFee || 40}
                            onChange={(e) => handleUpdateConfig('baseDeliveryFee', parseInt(e.target.value))}
                            className="bg-white border-none rounded-xl py-3 px-6 text-sm font-black text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-sm font-black text-swiggy-dark mb-4">Surge Threshold (Orders/Min)</p>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="number" 
                            value={systemConfig?.surgeThreshold || 10}
                            onChange={(e) => handleUpdateConfig('surgeThreshold', parseInt(e.target.value))}
                            className="bg-white border-none rounded-xl py-3 px-6 text-sm font-black text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-full"
                          />
                        </div>
                      </div>

                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-sm font-black text-swiggy-dark mb-4">Default Delivery Radius (km)</p>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="number" 
                            value={systemConfig?.deliveryRadius || 5}
                            onChange={(e) => handleUpdateConfig('deliveryRadius', parseInt(e.target.value))}
                            className="bg-white border-none rounded-xl py-3 px-6 text-sm font-black text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-gray-50">
                    <button className="bg-swiggy-dark text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-swiggy-dark/20 hover:bg-swiggy-orange transition-all">
                      Save All Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Add Outlet Modal */}
      <AnimatePresence>
        {isAddingOutlet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingOutlet(false)}
              className="absolute inset-0 bg-swiggy-dark/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-2xl font-black text-swiggy-dark uppercase tracking-widest">Onboard New Outlet</h3>
                <button onClick={() => setIsAddingOutlet(false)} className="p-2 hover:bg-gray-50 rounded-full transition-all">
                  <X className="w-6 h-6 text-swiggy-gray" />
                </button>
              </div>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Outlet Name</label>
                    <input 
                      type="text" 
                      value={newOutlet.name}
                      onChange={(e) => setNewOutlet({...newOutlet, name: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                      placeholder="e.g. Biryani By Kilo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Cuisine Type</label>
                    <input 
                      type="text" 
                      value={newOutlet.cuisine}
                      onChange={(e) => setNewOutlet({...newOutlet, cuisine: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                      placeholder="e.g. North Indian, Biryani"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Full Address</label>
                  <textarea 
                    value={newOutlet.address}
                    onChange={(e) => setNewOutlet({...newOutlet, address: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange min-h-[100px]"
                    placeholder="Enter complete outlet address..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Cover Image URL</label>
                  <input 
                    type="text" 
                    value={newOutlet.image}
                    onChange={(e) => setNewOutlet({...newOutlet, image: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                  />
                </div>
              </div>
              <div className="p-10 bg-gray-50 flex items-center justify-end space-x-4">
                <button 
                  onClick={() => setIsAddingOutlet(false)}
                  className="px-8 py-4 text-[10px] font-black text-swiggy-gray uppercase tracking-widest hover:text-swiggy-dark transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddOutlet}
                  className="bg-swiggy-orange text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-swiggy-orange/20 hover:scale-105 transition-all"
                >
                  Confirm Onboarding
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
