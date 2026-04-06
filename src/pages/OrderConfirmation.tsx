import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, db, OperationType, handleFirestoreError } from '../firebase';
import { CheckCircle, Package, Clock, MapPin, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LiveRiderMap from '../components/Tracking/LiveRiderMap';
import axios from 'axios';

function DynamicETA({ outletId, orderStatus }: { outletId: string, orderStatus: string }) {
  const [etaData, setEtaData] = useState<any>(null);

  useEffect(() => {
    if (orderStatus === 'delivered' || orderStatus === 'cancelled') return;

    const fetchETA = async () => {
      try {
        const res = await axios.get(`/api/outlets/${outletId}/eta`);
        if (res.data.success) {
          setEtaData(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch ETA", error);
      }
    };

    fetchETA();
    const interval = setInterval(fetchETA, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [outletId, orderStatus]);

  if (!etaData) return null;

  return (
    <div className="mb-8 space-y-4">
      {/* Live Progress Bar */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-swiggy-dark uppercase tracking-widest">Kitchen Capacity</span>
          <span className="text-xs font-bold text-swiggy-orange">{etaData.capacity.preparing_slots} slots available</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="bg-swiggy-orange h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(etaData.capacity.active_orders / 20) * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-xs text-swiggy-gray mt-2 font-bold flex items-center">
          <Info className="w-3 h-3 mr-1" />
          {etaData.message}
        </p>
      </div>

      {/* Dynamic Alerts */}
      <AnimatePresence>
        {etaData.capacity.is_raining && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3"
          >
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-blue-900">Weather Alert</p>
              <p className="text-xs text-blue-700 font-bold mt-1">Heavy rain detected near the outlet. Delivery might take an extra 8-10 minutes. Rider safety is our priority.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderConfirmation() {
  const { outletId, orderId } = useParams<{ outletId: string; orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !outletId) return;

    const unsubscribe = onSnapshot(doc(db, 'outlets', outletId, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `outlets/${outletId}/orders/${orderId}`);
    });

    return () => unsubscribe();
  }, [orderId, outletId]);

  useEffect(() => {
    if (!orderId || !outletId || !order) return;

    // Simulate order progress if it's still pending or preparing
    if (order.status === 'pending') {
      const timer = setTimeout(async () => {
        try {
          const { updateDoc, doc, db } = await import('../firebase');
          await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), { status: 'preparing' });
        } catch (e) { console.error(e); }
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (order.status === 'preparing') {
      const timer = setTimeout(async () => {
        try {
          const { updateDoc, doc, db } = await import('../firebase');
          await updateDoc(doc(db, 'outlets', outletId, 'orders', orderId), { status: 'out-for-delivery' });
        } catch (e) { console.error(e); }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [orderId, outletId, order?.status]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading...</div>;
  if (!order) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Order not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-swiggy-dark p-12 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none flex items-center justify-center">
             <span className="text-[200px] font-black italic">KK</span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black mb-2 relative z-10">Order Confirmed!</h1>
          <p className="text-swiggy-gray font-bold relative z-10">Your authentic Kolkata meal is being prepared.</p>
        </div>

        <div className="p-8">
          {/* Live Tracking Section */}
          <div className="mb-10">
            <h2 className="text-xl font-black text-swiggy-dark mb-6 flex items-center">
              <MapPin className="h-5 w-5 mr-3 text-swiggy-orange" />
              Track Your Order
            </h2>
            
            {/* Hyperlocal Live Availability & Dynamic ETA */}
            <DynamicETA outletId={outletId!} orderStatus={order.status} />

            <div className="h-[400px] rounded-3xl overflow-hidden border border-gray-100 shadow-inner">
              <LiveRiderMap 
                outletId={outletId!} 
                orderId={orderId!} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-start space-x-4">
              <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="h-6 w-6 text-swiggy-orange" />
              </div>
              <div>
                <p className="text-[10px] text-swiggy-gray font-black uppercase tracking-widest">Order Status</p>
                <p className="text-lg font-black text-swiggy-dark capitalize">{order.status.replace(/-/g, ' ')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-swiggy-orange" />
              </div>
              <div>
                <p className="text-[10px] text-swiggy-gray font-black uppercase tracking-widest">Estimated Arrival</p>
                <p className="text-lg font-black text-swiggy-dark">35 - 45 mins</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-swiggy-orange" />
              </div>
              <div>
                <p className="text-[10px] text-swiggy-gray font-black uppercase tracking-widest">Delivery OTP</p>
                <p className="text-xl font-black text-swiggy-orange tracking-widest">{order.deliveryOtp || '----'}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-black text-swiggy-dark mb-6">Order Summary</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <span className="font-bold text-swiggy-dark mr-2">{item.quantity} x</span>
                    <span className="text-swiggy-gray font-bold">{item.name}</span>
                  </div>
                  <span className="font-black text-swiggy-dark">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-swiggy-dark uppercase tracking-wider">Total Paid</span>
              <span className="text-xl font-black text-swiggy-dark">₹{order.totalAmount}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/"
              className="flex-1 bg-white border-2 border-swiggy-orange text-swiggy-orange py-4 rounded-xl font-black text-center uppercase tracking-widest text-xs hover:bg-swiggy-orange/5 transition-all"
            >
              Order More
            </Link>
            <Link
              to="/profile"
              className="flex-1 bg-swiggy-orange text-white py-4 rounded-xl font-black text-center uppercase tracking-widest text-xs hover:shadow-lg transition-all"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
