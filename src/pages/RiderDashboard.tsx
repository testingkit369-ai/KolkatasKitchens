import { useState, useEffect } from 'react';
import { doc, updateDoc, db, OperationType, handleFirestoreError, onSnapshot, collectionGroup, query, where, auth } from '../firebase';
import { useParams } from 'react-router-dom';
import { Truck, MapPin, CheckCircle, Navigation } from 'lucide-react';
import { riderLocationService } from '../services/riderLocation';
import LiveRiderMap from '../components/Tracking/LiveRiderMap';

export default function RiderDashboard() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (!id) return;
    const q = query(collectionGroup(db, 'orders'), where('id', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setOrder({ id: docSnap.id, ref: docSnap.ref, ...data });
        
        // Auto-start/stop tracking based on status
        if (data.status === 'out-for-delivery' && auth.currentUser) {
          riderLocationService.startTracking(auth.currentUser.uid, data.status);
          setIsTracking(true);
        } else {
          riderLocationService.stopTracking();
          setIsTracking(false);
        }
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      riderLocationService.stopTracking();
    };
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!order?.ref) return;
    
    if (status === 'delivered') {
      if (otp !== order.deliveryOtp) {
        setOtpError('Invalid OTP. Please ask the customer for the correct 4-digit code.');
        return;
      }
      setOtpError('');
    }

    try {
      const updateData: any = { status };
      if (status === 'out-for-delivery' && auth.currentUser) {
        updateData.riderId = auth.currentUser.uid;
        updateData.riderName = auth.currentUser.displayName || 'Rider';
      }
      if (status === 'delivered') {
        updateData.deliveredAt = new Date().toISOString();
      }
      await updateDoc(order.ref, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, order.ref.path);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;
  if (!order) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Order not found</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rider Dashboard</h1>
            <p className="text-zinc-500 text-sm font-mono">Order #{id?.slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
            }`}>
              {order.status.replace(/-/g, ' ')}
            </div>
            {isTracking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Map Section */}
            <div className="h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
              <LiveRiderMap 
                outletId={order.outlet_id} 
                orderId={order.id} 
                isRiderView={true} 
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-500" />
                Delivery Actions
              </h3>
              
              {order.status === 'out-for-delivery' && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Delivery Confirmation</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength={4}
                      placeholder="Enter 4-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                  {otpError && <p className="text-[10px] text-red-500 font-bold">{otpError}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => updateStatus('preparing')}
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-sm transition-all"
                >
                  Preparing
                </button>
                <button
                  onClick={() => updateStatus('out-for-delivery')}
                  disabled={order.status === 'out-for-delivery'}
                  className="py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Start Delivery
                </button>
                <button
                  onClick={() => updateStatus('delivered')}
                  disabled={order.status === 'delivered'}
                  className="py-3 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Delivered
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-widest">Customer Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500">Address</p>
                  <p className="text-sm font-medium leading-relaxed">{order.address}</p>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">Order Items</p>
                  <div className="mt-2 space-y-2">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-bold uppercase">Proximity Alert</p>
                  <p className="text-sm text-white font-medium">Automatic geofencing active</p>
                </div>
              </div>
              <p className="text-xs text-blue-300/70 leading-relaxed">
                The "Mark Delivered" button will highlight when you are within 50 meters of the customer's location.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
