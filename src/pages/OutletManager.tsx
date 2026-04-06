import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.ts';
import { 
  ChefHat, 
  Package, 
  LayoutDashboard, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  Filter,
  Bell,
  Settings,
  MoreVertical,
  Zap,
  ArrowRight,
  History,
  ShieldCheck,
  WifiOff,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  db, 
  OperationType, 
  handleFirestoreError, 
  updateDoc, 
  doc, 
  where, 
  collectionGroup,
  addDoc,
  serverTimestamp
} from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { OrderKanban } from '../components/Kitchen/OrderKanban';
import { InventoryAlerts } from '../components/Kitchen/InventoryAlerts';
import { StationCoordinator } from '../components/Kitchen/StationCoordinator';
import { cn } from '../lib/utils';
import { debounce } from 'lodash';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready';
}

interface Order {
  id: string;
  customerName: string;
  customerTier: 'gold' | 'silver' | 'regular';
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'picked-up' | 'delivered';
  createdAt: any;
  promiseTime: any;
  items: OrderItem[];
  station?: string;
  outlet_id: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  predictedDepletionTime?: number;
}

interface Station {
  id: string;
  name: string;
  backlog: number;
  avgPrepTime: number;
  estPrepTime: number;
  status: 'clear' | 'busy' | 'critical';
}

export default function OutletManager() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { outletId } = useParams<{ outletId: string }>();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [activeRole, setActiveRole] = useState<'chef' | 'packer' | 'manager'>('manager');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedUpdates, setQueuedUpdates] = useState<any[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastOrderCount = useRef(0);

  // Debounced order update to prevent UI flickering during peak load
  const debouncedSetOrders = useCallback(
    debounce((newOrders: Order[]) => {
      setOrders(newOrders);
      if (newOrders.length > lastOrderCount.current) {
        // Play sound alert for new orders
        audioRef.current?.play().catch(() => {});
      }
      lastOrderCount.current = newOrders.length;
    }, 500),
    []
  );

  useEffect(() => {
    if (!user || !outletId) {
      navigate('/login');
      return;
    }

    // Role check
    const isAuthorized = user.role === 'outlet_manager' || user.role === 'admin' || user.role === 'super_admin';
    if (!isAuthorized) {
      navigate('/');
      return;
    }

    // Listen for orders
    const qOrders = query(
      collection(db, 'outlets', outletId, 'orders'),
      where('status', 'in', ['new', 'preparing', 'ready', 'picked-up'])
    );

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const newOrders: Order[] = [];
      snapshot.forEach((doc) => {
        newOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      debouncedSetOrders(newOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${outletId}/orders`);
    });

    // Listen for inventory
    const qInventory = query(collection(db, 'outlets', outletId, 'inventory'));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      const newInventory: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        newInventory.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setInventory(newInventory);
    });

    // Mock stations data (in real app, this would be from Firestore)
    setStations([
      { id: '1', name: 'Biryani Station', backlog: 8, avgPrepTime: 18, estPrepTime: 15, status: 'busy' },
      { id: '2', name: 'Momo Station', backlog: 2, avgPrepTime: 8, estPrepTime: 10, status: 'clear' },
      { id: '3', name: 'Tandoor Station', backlog: 12, avgPrepTime: 25, estPrepTime: 20, status: 'critical' },
      { id: '4', name: 'Packing Station', backlog: 5, avgPrepTime: 4, estPrepTime: 5, status: 'clear' },
    ]);

    // Offline handling
    const handleOnline = () => {
      setIsOffline(false);
      // Sync queued updates
      if (queuedUpdates.length > 0) {
        queuedUpdates.forEach(async (update) => {
          try {
            await updateDoc(doc(db, update.path), update.data);
          } catch (e) {
            console.error('Failed to sync offline update:', e);
          }
        });
        setQueuedUpdates([]);
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubOrders();
      unsubInventory();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, outletId, navigate, debouncedSetOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!outletId) return;

    const orderPath = `outlets/${outletId}/orders/${orderId}`;
    const updateData = { 
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid
    };

    // Audit log for manual override
    const auditData = {
      type: 'STATUS_CHANGE',
      orderId,
      oldStatus: orders.find(o => o.id === orderId)?.status,
      newStatus,
      userId: user?.uid,
      userName: user?.displayName,
      timestamp: serverTimestamp()
    };

    if (isOffline) {
      setQueuedUpdates(prev => [...prev, { path: orderPath, data: updateData }]);
      // Optimistic UI update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } else {
      try {
        await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), updateData);
        await addDoc(collection(db, 'outlets', outletId, 'audit_logs'), auditData);
      } catch (error) {
        console.error('Failed to update order status:', error);
      }
    }
  };

  const handleMarkOutOfStock = async (itemId: string) => {
    if (!outletId) return;
    try {
      await updateDoc(doc(db, 'outlets', outletId, 'inventory', itemId), { stock: 0 });
      await addDoc(collection(db, 'outlets', outletId, 'audit_logs'), {
        type: 'INVENTORY_OVERRIDE',
        itemId,
        action: 'MARK_OUT_OF_STOCK',
        userId: user?.uid,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to mark item out of stock:', error);
    }
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => o.status !== 'delivered');
    const delayed = active.filter(o => {
      const now = new Date().getTime();
      const promise = new Date(o.promiseTime?.toDate?.() || o.promiseTime).getTime();
      return promise < now;
    });
    return {
      activeCount: active.length,
      delayedCount: delayed.length,
      avgPrepTime: 14, // Mock
      efficiency: 94
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-swiggy-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-swiggy-dark uppercase tracking-widest">Initializing Kitchen Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sound Alert */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-6 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-swiggy-orange p-2 rounded-2xl">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-swiggy-dark leading-tight">KITCHEN COMMAND</h1>
              <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest">Outlet ID: {outletId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isOffline && (
              <div className="flex items-center space-x-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100">
                <WifiOff className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Offline Mode ({queuedUpdates.length} pending)</span>
              </div>
            )}
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-2xl">
              <button className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                <Bell className="w-5 h-5 text-swiggy-gray" />
              </button>
              <button className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                <Settings className="w-5 h-5 text-swiggy-gray" />
              </button>
            </div>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-100">
              <div className="text-right">
                <p className="text-xs font-black text-swiggy-dark">{user?.displayName}</p>
                <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest">{activeRole}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-swiggy-orange flex items-center justify-center text-white font-black text-sm">
                {user?.displayName?.[0]}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Active Orders</p>
              <p className="text-2xl font-black text-blue-900">{stats.activeCount}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-200" />
          </div>
          <div className="bg-red-50 p-4 rounded-3xl border border-red-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Delayed Orders</p>
              <p className="text-2xl font-black text-red-900">{stats.delayedCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-200" />
          </div>
          <div className="bg-green-50 p-4 rounded-3xl border border-green-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Avg Prep Time</p>
              <p className="text-2xl font-black text-green-900">{stats.avgPrepTime}m</p>
            </div>
            <Clock className="w-8 h-8 text-green-200" />
          </div>
          <div className="bg-purple-50 p-4 rounded-3xl border border-purple-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Efficiency</p>
              <p className="text-2xl font-black text-purple-900">{stats.efficiency}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
        {/* Station Coordinator */}
        <section>
          <StationCoordinator 
            stations={stations} 
            activeRole={activeRole} 
            onRoleChange={setActiveRole} 
          />
        </section>

        {/* Order Board */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-swiggy-dark uppercase tracking-widest">Live Order Board</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiggy-gray" />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-swiggy-orange w-64"
                />
              </div>
              <button className="flex items-center space-x-2 bg-white border border-gray-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>
          <OrderKanban orders={orders} onStatusChange={handleStatusChange} />
        </section>

        {/* Inventory & Alerts */}
        <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <InventoryAlerts 
            items={inventory} 
            onMarkOutOfStock={handleMarkOutOfStock} 
          />
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="bg-swiggy-dark text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">System Status: Operational</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sync Latency: 42ms</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-swiggy-orange transition-colors">
            <History className="w-3 h-3" />
            <span>Audit Logs</span>
          </button>
          <button className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:text-swiggy-orange transition-colors">
            <ShieldCheck className="w-3 h-3" />
            <span>Compliance Report</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
