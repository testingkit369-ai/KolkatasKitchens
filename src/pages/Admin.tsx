import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, db, OperationType, handleFirestoreError, addDoc, updateDoc, deleteDoc, doc, getDocs, where, collectionGroup } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { seedDatabase } from '../services/seedService';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  category: string;
}

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: string;
  createdAt: any;
  address: string;
  paymentMethod: string;
  outlet_id?: string;
  outletId?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location: string;
  rating: number;
  deliveryTime: string;
  image: string;
  cuisines: string[];
  costForTwo: string;
}

export default function Admin() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const isAdmin = user?.email === 'testingkit369@gmail.com';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Restaurant | null>(null);

  // Form States
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 0,
    image: '',
    isVeg: true,
    category: 'Kolkata Biryani'
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'outlets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const restaurantData: Restaurant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        restaurantData.push({ id: doc.id, ...data } as Restaurant);
      });
      setRestaurants(restaurantData);
      if (restaurantData.length > 0 && !selectedOutlet) {
        setSelectedOutlet(restaurantData[0]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outlets');
    });

    return () => unsubscribe();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!selectedOutlet) return;

    const q = query(collection(db, 'outlets', selectedOutlet.id, 'menu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ id: doc.id, ...data } as MenuItem);
      });
      setMenuItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${selectedOutlet.id}/menu`);
    });

    return () => unsubscribe();
  }, [selectedOutlet]);

  useEffect(() => {
    const q = query(collectionGroup(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderData: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orderData.push({ id: doc.id, ...data } as Order);
      });
      setOrders(orderData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;

    try {
      const menuRef = collection(db, 'outlets', selectedOutlet.id, 'menu');
      if (editingItem) {
        await updateDoc(doc(db, 'outlets', selectedOutlet.id, 'menu', editingItem.id), menuForm);
      } else {
        await addDoc(menuRef, menuForm);
      }
      setIsMenuModalOpen(false);
      setEditingItem(null);
      setMenuForm({ name: '', description: '', price: 0, image: '', isVeg: true, category: 'Kolkata Biryani' });
    } catch (error) {
      console.error("Error saving menu item:", error);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!selectedOutlet || !window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'outlets', selectedOutlet.id, 'menu', id));
    } catch (error) {
      console.error("Error deleting menu item:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, outletId?: string) => {
    try {
      if (!outletId) {
        // Find the order to get its outletId if not provided
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // @ts-ignore
          outletId = order.outlet_id || order.outletId;
        }
      }
      if (outletId) {
        await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), { status: newStatus });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);

    try {
      const compressedImage = await compressAndConvertToWebP(file);
      setMenuForm({ ...menuForm, image: compressedImage });
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("Failed to compress image. Please try again.");
    } finally {
      setIsCompressing(false);
    }
  };

  const compressAndConvertToWebP = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions for web display (e.g., 1200px)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP with 0.8 quality
          const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
          resolve(webpDataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  const [seedError, setSeedError] = useState<string>('');

  const handleSeedDatabase = async () => {
    setSeedStatus('seeding');
    setSeedError('');
    try {
      const result = await seedDatabase();
      if (result.success) {
        setSeedStatus('success');
      } else {
        setSeedError(result.message);
        setSeedStatus('error');
      }
      setTimeout(() => setSeedStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error seeding database:', error);
      setSeedError(error.message || 'Unknown error');
      setSeedStatus('error');
      setTimeout(() => setSeedStatus('idle'), 5000);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <div className="w-72 bg-swiggy-dark text-white flex flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="bg-swiggy-orange p-2 rounded-xl">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">KOLKATA'S</h1>
              <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-[0.2em]">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'menu', label: 'Menu Management', icon: Utensils },
            { id: 'orders', label: 'Order History', icon: ShoppingBag },
            { id: 'outlets', label: 'Outlet Settings', icon: MapPin },
            { id: 'users', label: 'Customers', icon: Users },
            { id: 'settings', label: 'App Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-swiggy-orange text-white shadow-lg shadow-swiggy-orange/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-swiggy-orange flex items-center justify-center font-black text-white">
              {user?.displayName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">{user?.displayName || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-10 py-6 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h2 className="text-2xl font-black text-swiggy-dark capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Manage your restaurant ecosystem</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-gray-50 border-none rounded-xl py-3 px-12 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange w-64"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray w-4 h-4" />
            </div>
            <button className="bg-white border border-gray-100 p-3 rounded-xl hover:shadow-md transition-all relative">
              <ShoppingBag className="w-5 h-5 text-swiggy-dark" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-swiggy-orange rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: 'Total Revenue', value: `₹${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}`, icon: DollarSign, trend: '+12.5%', isUp: true, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Active Orders', value: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, icon: ShoppingBag, trend: '+5.2%', isUp: true, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Customers', value: '1,284', icon: Users, trend: '+18.7%', isUp: true, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Avg. Rating', value: '4.8', icon: Star, trend: '-0.4%', isUp: false, color: 'text-swiggy-orange', bg: 'bg-orange-50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div className={`flex items-center space-x-1 text-xs font-black ${stat.isUp ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{stat.trend}</span>
                          {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        </div>
                      </div>
                      <h3 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-1">{stat.label}</h3>
                      <p className="text-3xl font-black text-swiggy-dark">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Recent Orders */}
                  <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="text-xl font-black text-swiggy-dark">Recent Orders</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-swiggy-orange text-xs font-black uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
                            <th className="px-8 py-4">Order ID</th>
                            <th className="px-8 py-4">Customer</th>
                            <th className="px-8 py-4">Status</th>
                            <th className="px-8 py-4">Amount</th>
                            <th className="px-8 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-8 py-6 font-black text-swiggy-dark text-sm">#{order.id.slice(-6).toUpperCase()}</td>
                              <td className="px-8 py-6">
                                <p className="text-sm font-bold text-swiggy-dark">Customer</p>
                                <p className="text-[10px] text-swiggy-gray font-bold">{order.paymentMethod}</p>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                  'bg-orange-100 text-swiggy-orange'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-8 py-6 font-black text-swiggy-dark text-sm">₹{order.total}</td>
                              <td className="px-8 py-6">
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                  <MoreVertical className="w-4 h-4 text-swiggy-gray" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Selling Items */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h3 className="text-xl font-black text-swiggy-dark mb-8">Top Selling Items</h3>
                    <div className="space-y-8">
                      {menuItems.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-swiggy-dark">{item.name}</p>
                              <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-swiggy-dark">₹{item.price}</p>
                            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Popular</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('menu')} className="w-full mt-10 py-4 border-2 border-dashed border-gray-100 rounded-2xl text-swiggy-gray font-black uppercase text-xs tracking-widest hover:border-swiggy-orange hover:text-swiggy-orange transition-all">
                      Manage Full Menu
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white border border-gray-100 rounded-2xl px-6 py-3 flex items-center space-x-4 shadow-sm">
                      <Filter className="w-4 h-4 text-swiggy-gray" />
                      <select 
                        className="bg-transparent border-none text-sm font-black text-swiggy-dark focus:ring-0 outline-none cursor-pointer"
                        onChange={(e) => {
                          const outlet = restaurants.find(r => r.id === e.target.value);
                          if (outlet) setSelectedOutlet(outlet);
                        }}
                        value={selectedOutlet?.id}
                      >
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name} - {r.location}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-swiggy-gray font-bold uppercase tracking-widest">
                      {menuItems.length} items in menu
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingItem(null);
                      setMenuForm({ name: '', description: '', price: 0, image: '', isVeg: true, category: 'Kolkata Biryani' });
                      setIsMenuModalOpen(true);
                    }}
                    className="bg-swiggy-orange text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-swiggy-orange/20 hover:scale-105 transition-all flex items-center space-x-3"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Dish</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="relative h-48">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                          {item.isVeg ? (
                            <div className="bg-white p-1 rounded border-2 border-green-600">
                              <div className="w-2 h-2 bg-green-600 rounded-full" />
                            </div>
                          ) : (
                            <div className="bg-white p-1 rounded border-2 border-red-600">
                              <div className="w-2 h-2 bg-red-600 rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setMenuForm({ ...item });
                              setIsMenuModalOpen(true);
                            }}
                            className="bg-white p-3 rounded-xl text-swiggy-dark hover:bg-swiggy-orange hover:text-white transition-all shadow-xl"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="bg-white p-3 rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-xl"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-black text-swiggy-dark truncate pr-4">{item.name}</h4>
                          <span className="text-sm font-black text-swiggy-orange">₹{item.price}</span>
                        </div>
                        <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mb-4">{item.category}</p>
                        <p className="text-xs text-swiggy-gray line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                      <h3 className="text-xl font-black text-swiggy-dark">Order Management</h3>
                      <div className="flex space-x-2">
                        {['all', 'pending', 'preparing', 'out-for-delivery', 'delivered'].map(s => (
                          <button key={s} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-50 text-swiggy-gray hover:bg-swiggy-orange hover:text-white transition-all">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-swiggy-gray font-bold uppercase tracking-widest">
                      Total Orders: {orders.length}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
                          <th className="px-8 py-4">Order ID</th>
                          <th className="px-8 py-4">Items</th>
                          <th className="px-8 py-4">Total</th>
                          <th className="px-8 py-4">Status</th>
                          <th className="px-8 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-swiggy-dark">#{order.id.slice(-6).toUpperCase()}</p>
                              <p className="text-[10px] text-swiggy-gray font-bold mt-1">{new Date(order.createdAt?.seconds * 1000).toLocaleString()}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-wrap gap-2">
                                {order.items.map((item: any, idx: number) => (
                                  <span key={idx} className="bg-gray-100 text-[10px] font-bold text-swiggy-dark px-2 py-1 rounded">
                                    {item.quantity}x {item.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-8 py-6 font-black text-swiggy-dark text-sm">₹{order.total}</td>
                            <td className="px-8 py-6">
                              <select 
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none focus:ring-2 focus:ring-swiggy-orange cursor-pointer ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                  'bg-orange-100 text-swiggy-orange'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="preparing">Preparing</option>
                                <option value="out-for-delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center space-x-2">
                                <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all" title="View Details">
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all" title="Cancel Order">
                                  <XCircle className="w-4 h-4" />
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

            {['outlets', 'users'].includes(activeTab) && (
              <div className="text-center py-40 bg-white rounded-3xl shadow-sm border border-gray-100">
                <Settings className="w-20 h-20 text-swiggy-orange/20 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-swiggy-dark mb-2 uppercase tracking-widest">{activeTab} coming soon</h3>
                <p className="text-swiggy-gray font-bold">We are building this functionality to give you full control.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-xl font-black text-swiggy-dark mb-6">Database Management</h3>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between p-6 border border-gray-100 rounded-2xl bg-gray-50">
                      <div>
                        <h4 className="font-bold text-swiggy-dark">Seed Demo Data</h4>
                        <p className="text-sm text-swiggy-gray mt-1">Populate the database with sample outlets and menu items.</p>
                      </div>
                      <button
                        onClick={handleSeedDatabase}
                        disabled={seedStatus === 'seeding'}
                        className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center space-x-2 disabled:opacity-50 ${
                          seedStatus === 'success' ? 'bg-green-600 text-white' :
                          seedStatus === 'error' ? 'bg-red-600 text-white' :
                          'bg-swiggy-dark text-white hover:bg-swiggy-orange'
                        }`}
                      >
                        <Database className="w-4 h-4" />
                        <span>
                          {seedStatus === 'seeding' ? 'Seeding...' : 
                           seedStatus === 'success' ? 'Seeded!' :
                           seedStatus === 'error' ? 'Failed' :
                           'Seed Database'}
                        </span>
                      </button>
                    </div>
                    {seedError && (
                      <div className="text-xs text-red-600 font-bold px-2">
                        Error: {seedError}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Menu Item Modal */}
      <AnimatePresence>
        {isMenuModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuModalOpen(false)}
              className="absolute inset-0 bg-swiggy-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-swiggy-dark">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
                    <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mt-1">Fill in the details below</p>
                  </div>
                  <button onClick={() => setIsMenuModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                    <XCircle className="w-6 h-6 text-swiggy-gray" />
                  </button>
                </div>

                <form onSubmit={handleSaveMenuItem} className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Dish Name</label>
                      <input 
                        type="text" 
                        required
                        value={menuForm.name}
                        onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                        placeholder="e.g. Kolkata Mutton Biryani"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Price (₹)</label>
                      <input 
                        type="number" 
                        required
                        value={menuForm.price}
                        onChange={(e) => setMenuForm({...menuForm, price: Number(e.target.value)})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                        placeholder="299"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      required
                      value={menuForm.description}
                      onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange h-32 resize-none"
                      placeholder="Describe the dish, ingredients, and taste..."
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Dish Image</label>
                      <div className="flex items-start space-x-6">
                        <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                          {menuForm.image ? (
                            <>
                              <img src={menuForm.image} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  type="button"
                                  onClick={() => setMenuForm({ ...menuForm, image: '' })}
                                  className="bg-white p-2 rounded-lg text-red-600 shadow-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="dish-image-upload"
                            />
                            <label 
                              htmlFor="dish-image-upload"
                              className={`flex items-center justify-center space-x-3 bg-gray-50 border-2 border-dashed border-gray-200 py-4 rounded-2xl cursor-pointer hover:border-swiggy-orange hover:bg-orange-50 transition-all group ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isCompressing ? (
                                <>
                                  <Loader2 className="w-5 h-5 text-swiggy-orange animate-spin" />
                                  <span className="text-xs font-black text-swiggy-orange uppercase tracking-widest">Compressing...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-swiggy-orange" />
                                  <span className="text-xs font-black text-swiggy-gray group-hover:text-swiggy-orange uppercase tracking-widest">Upload Image</span>
                                </>
                              )}
                            </label>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
                              <span className="bg-white px-3 text-gray-300">Or use URL</span>
                            </div>
                          </div>
                          <input 
                            type="text" 
                            value={menuForm.image}
                            onChange={(e) => setMenuForm({...menuForm, image: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-2xl py-3 px-6 text-xs font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-swiggy-gray font-bold mt-2 italic">* Max file size: 800KB (for optimal performance)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={menuForm.category}
                        onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange cursor-pointer"
                      >
                        <option value="Kolkata Biryani">Kolkata Biryani</option>
                        <option value="Kolkata Chinese">Kolkata Chinese</option>
                        <option value="Momos">Momos</option>
                        <option value="Rolls">Rolls</option>
                        <option value="Burgers">Burgers</option>
                        <option value="Sandwiches">Sandwiches</option>
                        <option value="Wraps">Wraps</option>
                        <option value="Drinks">Drinks</option>
                        <option value="Desserts">Desserts</option>
                      </select>
                    </div>

                    <div className="flex items-end pb-1">
                      <button
                        type="button"
                        onClick={() => setMenuForm({...menuForm, isVeg: !menuForm.isVeg})}
                        className={`flex items-center space-x-3 px-6 py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest w-full ${
                          menuForm.isVeg 
                            ? 'border-green-600 bg-green-50 text-green-600' 
                            : 'border-red-600 bg-red-50 text-red-600'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${menuForm.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        <span>{menuForm.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 flex space-x-4">
                    <button 
                      type="button"
                      onClick={() => setIsMenuModalOpen(false)}
                      className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-swiggy-gray bg-gray-100 hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white bg-swiggy-orange shadow-lg shadow-swiggy-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {editingItem ? 'Save Changes' : 'Add to Menu'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
