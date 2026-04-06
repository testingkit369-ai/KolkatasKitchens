import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  User, 
  ChevronRight, 
  Package, 
  Bike,
  Power,
  AlertCircle,
  History,
  TrendingUp,
  Zap,
  XCircle,
  ShieldAlert,
  Droplets,
  Award,
  BarChart3,
  Download,
  ShieldCheck,
  Moon,
  Camera,
  FileSignature,
  Hash,
  WifiOff,
  Map,
  Glasses
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, db, OperationType, handleFirestoreError, updateDoc, doc, where, collectionGroup } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  outlet_id?: string;
  items: any[];
  total: number;
  status: string;
  createdAt: any;
  address: string;
  customerName?: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantAddress?: string;
  isBatch?: boolean;
  batchOrders?: any[];
  earningsPreview?: number;
  timePreview?: number;
  userId?: string;
}

export default function Rider() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'active' | 'earnings' | 'profile'>('orders');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState<string | null>(null); // orderId

  // Safety & Wellness State
  const [pickupOtp, setPickupOtp] = useState('');
  const [waterCups, setWaterCups] = useState(0);
  const [sosActive, setSosActive] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  
  // Offline & Navigation State
  const [offlineMode, setOfflineMode] = useState(false);
  const [mapsDownloaded, setMapsDownloaded] = useState(false);
  const [arMode, setArMode] = useState(false);

  // POD State
  const [showPodModal, setShowPodModal] = useState(false);
  const [podPhoto, setPodPhoto] = useState(false);
  const [podSignature, setPodSignature] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [manualReason, setManualReason] = useState('Customer unreachable');
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  
  const currentHour = new Date().getHours();
  const isNightMode = currentHour >= 22 || currentHour < 6;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Listen for available orders (preparing or ready)
    const qAvailable = query(
      collectionGroup(db, 'orders'),
      where('status', 'in', ['preparing', 'ready'])
    );

    const unsubAvailable = onSnapshot(qAvailable, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show orders not assigned to anyone
        if (!data.riderId) {
          orders.push({ 
            id: doc.id, 
            ...data,
            earningsPreview: 65,
            timePreview: 15
          } as Order);
        }
      });

      // Mock Smart Batching Engine Logic
      // If there are multiple orders, bundle the first two into a batch
      if (orders.length >= 2) {
        const batchOrder: Order = {
          id: `batch_${orders[0].id}_${orders[1].id}`,
          userId: 'batch',
          items: [...orders[0].items, ...orders[1].items],
          total: orders[0].total + orders[1].total,
          status: 'preparing',
          createdAt: new Date(),
          address: 'Multiple Destinations (<500m apart)',
          restaurantId: orders[0].restaurantId,
          isBatch: true,
          batchOrders: [orders[0], orders[1]],
          earningsPreview: 180,
          timePreview: 28
        };
        // Replace the first two with the batch, but also keep them as singles for the toggle
        orders.unshift(batchOrder);
      }

      setAvailableOrders(orders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Listen for active order assigned to this rider
    const qActive = query(
      collectionGroup(db, 'orders'),
      where('riderId', '==', user.uid),
      where('status', 'in', ['out-for-delivery', 'preparing', 'ready'])
    );

    const unsubActive = onSnapshot(qActive, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setActiveOrder({ id: doc.id, ...doc.data() } as Order);
        setActiveTab('active');
      } else {
        setActiveOrder(null);
      }
    });

    // Listen for completed orders by this rider
    const qHistory = query(
      collectionGroup(db, 'orders'),
      where('riderId', '==', user.uid),
      where('status', '==', 'delivered')
    );

    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
      });
      setCompletedOrders(orders);
    });

    return () => {
      unsubAvailable();
      unsubActive();
      unsubHistory();
    };
  }, [user, navigate]);

  const acceptOrder = async (order: Order) => {
    if (!user) return;
    try {
      if (order.isBatch && order.batchOrders) {
        // Accept all orders in batch
        for (const bo of order.batchOrders) {
          await updateDoc(doc(db, 'outlets', bo.outlet_id, 'orders', bo.id), {
            riderId: user.uid,
            riderName: user.displayName || 'Rider',
            status: 'preparing',
            isBatch: true,
            batchId: order.id
          });
        }
      } else {
        await updateDoc(doc(db, 'outlets', order.outlet_id, 'orders', order.id), {
          riderId: user.uid,
          riderName: user.displayName || 'Rider',
          status: 'preparing'
        });
      }
    } catch (error) {
      console.error("Error accepting order:", error);
    }
  };

  const skipOrder = (orderId: string, reason: string) => {
    console.log(`Skipped order ${orderId} due to: ${reason}`);
    // In a real app, send this to the matching engine to improve future matches
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
    setShowSkipModal(null);
  };

  const updateStatus = async (status: string) => {
    if (!activeOrder) return;
    
    if (status === 'out-for-delivery' && pickupOtp !== '1234') {
      alert('Invalid Pickup OTP. Please ask the restaurant/customer for the 4-digit code.');
      return;
    }

    try {
      await updateDoc(doc(db, 'outlets', activeOrder.outlet_id, 'orders', activeOrder.id), { status });
      if (status === 'out-for-delivery') setPickupOtp('');
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const triggerSOS = () => {
    setSosActive(true);
    console.log("[SOS] Emergency Alert Triggered! Location sent to Admin & Trusted Contacts.");
    setTimeout(() => setSosActive(false), 3000);
  };

  const logWater = () => {
    setWaterCups(prev => prev + 1);
  };

  const handlePodCapture = (type: 'photo' | 'signature') => {
    if (type === 'photo') setPodPhoto(true);
    if (type === 'signature') setPodSignature(true);
    
    if ((type === 'photo' && podSignature) || (type === 'signature' && podPhoto)) {
      // Generate mock IPFS hash
      setIpfsHash('ipfs://Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    }
  };

  const completeDelivery = async () => {
    await updateStatus('delivered');
    setShowPodModal(false);
    setPodPhoto(false);
    setPodSignature(false);
    setIpfsHash(null);
    setShowManualOverride(false);
  };

  const totalEarnings = completedOrders.reduce((acc, o) => acc + 40, 0); // Assuming ₹40 per delivery
  const ordersToBonus = Math.max(0, 3 - completedOrders.length);
  const needsBreak = completedOrders.length > 0 && completedOrders.length % 5 === 0;

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto border-x border-gray-200 shadow-xl relative ${isNightMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-6 sticky top-0 z-30 border-b`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-swiggy-orange p-2 rounded-xl">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-black leading-tight ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>RIDER APP</h1>
              <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest">Kolkata's Kitchen</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setOfflineMode(!offlineMode)}
              className={`p-2 rounded-full transition-all ${offlineMode ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
              title="Toggle Offline Mode"
            >
              <WifiOff className="w-5 h-5" />
            </button>
            <button 
              onClick={triggerSOS}
              className="bg-red-100 text-red-600 p-2 rounded-full animate-pulse"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Power className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* SOS Modal */}
        {sosActive && (
          <div className="fixed inset-0 bg-red-600/90 z-50 flex flex-col items-center justify-center text-white p-6">
            <ShieldAlert className="w-24 h-24 mb-6 animate-bounce" />
            <h2 className="text-3xl font-black mb-2 text-center">SOS TRIGGERED</h2>
            <p className="text-center font-bold mb-8">Location sent to Admin and Trusted Contacts.</p>
            <p className="text-sm opacity-80">Help is on the way.</p>
          </div>
        )}

        {/* Dynamic Incentives & Alerts */}
        {isOnline && (
          <div className="mt-4 space-y-3">
            {isNightMode && (
              <div className="bg-indigo-900/50 border border-indigo-500/30 p-3 rounded-xl flex items-center space-x-2">
                <Moon className="w-4 h-4 text-indigo-300" />
                <span className="text-xs font-bold text-indigo-200">Night Mode Active. Stay safe!</span>
              </div>
            )}
            {needsBreak && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-orange-700">You've delivered 5 orders. Take a 10 min rest!</span>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Durga Puja Rush</span>
              </div>
              <span className="text-xs font-bold text-blue-700">+20% Earnings</span>
            </div>
            
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Bonus Progress</span>
                <span className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest">₹50 Reward</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className="bg-swiggy-orange h-1.5 rounded-full" style={{ width: `${((3 - ordersToBonus) / 3) * 100}%` }}></div>
              </div>
              <p className="text-xs font-bold text-swiggy-dark">Complete {ordersToBonus} more orders to unlock bonus</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto no-scrollbar pb-24">
        {!isOnline ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-100 p-8 rounded-full mb-6">
              <Power className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-black text-swiggy-dark mb-2">You are Offline</h2>
            <p className="text-swiggy-gray font-bold text-sm">Go online to start receiving delivery requests.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-swiggy-dark uppercase tracking-widest">Available Orders ({availableOrders.length})</h2>
                  <button className="text-swiggy-orange text-[10px] font-black uppercase tracking-widest">Refresh</button>
                </div>

                {availableOrders.length === 0 ? (
                  <div className="bg-white p-10 rounded-3xl border border-dashed border-gray-200 text-center">
                    <Clock className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                    <p className="text-swiggy-gray font-bold text-sm">Waiting for new orders...</p>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <div key={order.id} className={`bg-white p-6 rounded-3xl shadow-sm border ${order.isBatch ? 'border-swiggy-orange ring-1 ring-swiggy-orange' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest mb-1">
                            {order.isBatch ? '🔥 Smart Batch' : 'New Request'}
                          </p>
                          <h3 className="text-lg font-black text-swiggy-dark">₹{order.earningsPreview} <span className="text-xs text-swiggy-gray font-bold">in {order.timePreview} min</span></h3>
                        </div>
                        <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-black text-swiggy-gray uppercase tracking-widest">
                          {order.isBatch ? `${order.batchOrders?.length} Orders` : `${order.items.length} Items`}
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                          <div>
                            <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Pickup</p>
                            <p className="text-sm font-bold text-swiggy-dark">Kolkata's Kitchen - Karol Bagh</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-swiggy-orange mt-1.5" />
                          <div>
                            <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Drop</p>
                            <p className="text-sm font-bold text-swiggy-dark truncate w-64">{order.address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button 
                          onClick={() => acceptOrder(order)}
                          className="flex-1 bg-swiggy-orange text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-swiggy-orange/20 active:scale-95 transition-all"
                        >
                          {order.isBatch ? 'Accept Batch' : 'Accept Single'}
                        </button>
                        <button 
                          onClick={() => setShowSkipModal(order.id)}
                          className="px-4 bg-gray-100 text-swiggy-gray rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-all"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Skip Modal */}
                      {showSkipModal === order.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-xs font-black text-swiggy-dark uppercase tracking-widest mb-3">Reason for skipping?</p>
                          <div className="space-y-2">
                            {['Too far', 'Traffic is bad', 'Low earnings', 'Taking a break'].map(reason => (
                              <button 
                                key={reason}
                                onClick={() => skipOrder(order.id, reason)}
                                className="w-full text-left px-4 py-2 text-sm font-bold text-swiggy-gray hover:bg-white rounded-lg transition-all"
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!activeOrder ? (
                  <div className="text-center py-20">
                    <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-swiggy-gray font-bold">No active order. Go to 'Orders' to pick one.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-swiggy-dark text-white p-6 rounded-3xl">
                      <div className="flex justify-between items-center mb-6">
                        <span className="bg-swiggy-orange text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {activeOrder.status.replace('-', ' ')}
                        </span>
                        <span className="text-xs font-black">#{activeOrder.id.slice(-6).toUpperCase()}</span>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/10 p-3 rounded-2xl">
                              <MapPin className="w-6 h-6 text-swiggy-orange" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Restaurant</p>
                              <p className="text-sm font-bold">Kolkata's Kitchen</p>
                            </div>
                          </div>
                          <button className="bg-white/10 p-3 rounded-2xl">
                            <Phone className="w-5 h-5 text-white" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/10 p-3 rounded-2xl">
                              <User className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                              <p className="text-sm font-bold truncate w-40">{activeOrder.address}</p>
                            </div>
                          </div>
                          <button className="bg-white/10 p-3 rounded-2xl">
                            <Phone className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-3xl border shadow-sm ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Order Items</h3>
                      <div className="space-y-3">
                        {activeOrder.items.map((item, i) => (
                          <div key={i} className={`flex justify-between text-sm font-bold ${isNightMode ? 'text-gray-300' : 'text-swiggy-gray'}`}>
                            <span>{item.quantity}x {item.name}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeOrder.status === 'out-for-delivery' && (
                      <div className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl ${arMode ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {arMode ? <Glasses className="w-5 h-5 text-purple-600" /> : <Map className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>
                              {arMode ? 'AR Navigation Active' : '2D Map Navigation'}
                            </p>
                            <p className="text-[10px] text-swiggy-gray">{offlineMode ? 'Using cached offline maps' : 'Live GPS active'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setArMode(!arMode)}
                          className="text-xs font-black text-swiggy-orange uppercase tracking-widest"
                        >
                          {arMode ? 'Use 2D' : 'Use AR'}
                        </button>
                      </div>
                    )}

                    <div className="fixed bottom-24 left-6 right-6 max-w-[350px] mx-auto">
                      {activeOrder.status === 'preparing' && (
                        <div className={`p-4 rounded-3xl mb-4 shadow-lg ${isNightMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <p className="text-xs font-black text-swiggy-gray uppercase tracking-widest mb-2 text-center">Enter Pickup OTP (Mock: 1234)</p>
                          <input 
                            type="text" 
                            maxLength={4}
                            value={pickupOtp}
                            onChange={(e) => setPickupOtp(e.target.value)}
                            className="w-full text-center text-2xl font-black tracking-[0.5em] p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-swiggy-orange bg-transparent"
                            placeholder="••••"
                          />
                        </div>
                      )}
                      {activeOrder.status === 'preparing' && (
                        <button 
                          onClick={() => updateStatus('out-for-delivery')}
                          className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3"
                        >
                          <Package className="w-5 h-5" />
                          <span>Picked Up Order</span>
                        </button>
                      )}
                      {activeOrder.status === 'out-for-delivery' && (
                        <button 
                          onClick={() => setShowPodModal(true)}
                          className="w-full bg-green-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Complete Delivery (POD)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'earnings' && (
              <motion.div
                key="earnings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className={`p-8 rounded-[40px] shadow-sm border text-center ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-2">Total Earnings</h3>
                  <p className={`text-4xl font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>₹{totalEarnings.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Earnings Breakdown</h3>
                  <div className={`rounded-3xl border divide-y ${isNightMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-100 divide-gray-50'}`}>
                    <div className="p-6 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-50 p-3 rounded-2xl">
                          <Bike className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Delivery Pay</p>
                          <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">₹40 per order</p>
                        </div>
                      </div>
                      <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>₹{totalEarnings}</p>
                    </div>
                    <div className="p-6 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="bg-orange-50 p-3 rounded-2xl">
                          <TrendingUp className="w-5 h-5 text-swiggy-orange" />
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Incentives</p>
                          <p className="text-[10px] text-swiggy-gray font-bold uppercase tracking-widest">Daily targets</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-green-600">₹0</p>
                    </div>
                  </div>
                </div>

                {/* Analytics Dashboard */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Smart Analytics</h3>
                  
                  <div className={`p-5 rounded-2xl border ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start space-x-3">
                      <BarChart3 className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Heatmap Insight</p>
                        <p className="text-xs text-swiggy-gray mt-1">You earn 30% more in Salt Lake between 1-3 PM. Head there next!</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start space-x-3">
                      <DollarSign className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Tip Optimization</p>
                        <p className="text-xs text-swiggy-gray mt-1">Orders with polite notes get 22% higher tips. Keep smiling!</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-swiggy-dark py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all">
                    <Download className="w-4 h-4" />
                    <span>Export Tax CSV</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Career Growth */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Career Growth</h3>
                  
                  <div className={`p-6 rounded-3xl border flex items-center space-x-4 ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'}`}>
                    <div className="bg-yellow-400 p-3 rounded-full">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Current Tier</p>
                      <p className={`text-xl font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Gold Partner</p>
                      <p className="text-xs font-bold text-swiggy-gray mt-1">Priority access to high-value orders</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border text-center ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <MapPin className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className={`text-xs font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Kolkata Navigator</p>
                      <p className="text-[10px] text-swiggy-gray mt-1">100 on-time deliveries</p>
                    </div>
                    <div className={`p-4 rounded-2xl border text-center ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <ShieldCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className={`text-xs font-black ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Premium Handler</p>
                      <p className="text-[10px] text-swiggy-gray mt-1">50+ 4.9★ ratings</p>
                    </div>
                  </div>
                </div>

                {/* Health & Wellness */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Health & Wellness</h3>
                  
                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-50 p-2 rounded-xl">
                        <Droplets className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Hydration Tracker</p>
                        <p className="text-xs text-swiggy-gray">{waterCups} cups logged today</p>
                      </div>
                    </div>
                    <button 
                      onClick={logWater}
                      className="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      + Log
                    </button>
                  </div>
                </div>

                {/* Offline Maps */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Offline Navigation</h3>
                  
                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-50 p-2 rounded-xl">
                        <Map className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Kolkata Delivery Zones</p>
                        <p className="text-xs text-swiggy-gray">{mapsDownloaded ? 'Downloaded (142 MB)' : 'Not downloaded'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setMapsDownloaded(!mapsDownloaded)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all ${mapsDownloaded ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}
                    >
                      {mapsDownloaded ? 'Synced' : 'Download'}
                    </button>
                  </div>
                </div>

                {/* Data Privacy */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Data Privacy</h3>
                  
                  <div className={`p-5 rounded-2xl border ${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-swiggy-dark'}`}>Analytics Participation</p>
                        <p className="text-[10px] text-swiggy-gray mt-1">Help improve matching algorithms</p>
                      </div>
                      <button 
                        onClick={() => setAnalyticsConsent(!analyticsConsent)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${analyticsConsent ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${analyticsConsent ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-[10px] text-swiggy-gray border-t border-gray-100 pt-3">
                      Location history auto-deletes after 30 days. Earnings data is encrypted and only accessible by you and finance admins.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* POD Modal */}
        {showPodModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-end p-4">
            <div className={`w-full max-w-md p-6 rounded-3xl ${isNightMode ? 'bg-gray-800 text-white' : 'bg-white text-swiggy-dark'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Proof of Delivery</h2>
                <button onClick={() => setShowPodModal(false)}><XCircle className="w-6 h-6 text-gray-400" /></button>
              </div>

              {!showManualOverride ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => handlePodCapture('photo')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${podPhoto ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Camera className={`w-6 h-6 ${podPhoto ? 'text-green-500' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-bold ${podPhoto ? 'text-green-700' : ''}`}>1. Photo + Geotag</p>
                        {podPhoto && <p className="text-[10px] text-green-600">Captured at {new Date().toLocaleTimeString()}</p>}
                      </div>
                    </div>
                    {podPhoto && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </button>

                  <button 
                    onClick={() => handlePodCapture('signature')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${podSignature ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileSignature className={`w-6 h-6 ${podSignature ? 'text-green-500' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-bold ${podSignature ? 'text-green-700' : ''}`}>2. Customer Signature</p>
                        {podSignature && <p className="text-[10px] text-green-600">Signed securely</p>}
                      </div>
                    </div>
                    {podSignature && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </button>

                  {ipfsHash && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gray-100 p-3 rounded-xl flex items-center space-x-2 break-all"
                    >
                      <Hash className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-[10px] text-gray-500 font-mono">{ipfsHash}</p>
                    </motion.div>
                  )}

                  <button 
                    disabled={!podPhoto || !podSignature}
                    onClick={completeDelivery}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    Complete Delivery
                  </button>

                  <button 
                    onClick={() => setShowManualOverride(true)}
                    className="w-full text-center text-xs font-bold text-gray-400 mt-4 underline"
                  >
                    Having trouble? Manual Override
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-orange-500">Manual Override Mode</p>
                  <select 
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className={`w-full p-4 rounded-xl border-2 outline-none ${isNightMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-transparent border-gray-200'}`}
                  >
                    <option>Customer unreachable</option>
                    <option>Camera malfunction</option>
                    <option>Left at security gate</option>
                    <option>Network timeout</option>
                  </select>
                  <button 
                    onClick={completeDelivery}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all mt-4"
                  >
                    Force Complete Delivery
                  </button>
                  <button 
                    onClick={() => setShowManualOverride(false)}
                    className="w-full text-center text-xs font-bold text-gray-400 mt-4"
                  >
                    Back to Standard POD
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`${isNightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-t p-4 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around items-center z-40`}>
        {[
          { id: 'orders', label: 'Orders', icon: Package },
          { id: 'active', label: 'Active', icon: Navigation },
          { id: 'earnings', label: 'Earnings', icon: DollarSign },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === item.id ? 'text-swiggy-orange' : 'text-gray-400'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
