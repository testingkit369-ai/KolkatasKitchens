import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { User, ShoppingBag, MapPin, LogOut, ChevronRight, Clock, Star, Edit2, X, CheckCircle2, Smartphone, CreditCard, HelpCircle, Settings, Bike } from 'lucide-react';
import { auth, signOut, collection, query, where, onSnapshot, db, OperationType, handleFirestoreError, updateDoc, doc, collectionGroup } from '../firebase';
import { setUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  restaurantId: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  items: any[];
}

export default function Profile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAdmin = user?.email === 'testingkit369@gmail.com';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'payments' | 'help'>('orders');
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editAddress, setEditAddress] = useState(user?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collectionGroup(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderData: Order[] = [];
      snapshot.forEach((doc) => {
        orderData.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort by date descending
      orderData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(orderData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // In a real app, we'd update Firebase Auth and a 'users' collection
      // For this demo, we'll just update the local state and pretend it's saved
      dispatch(setUser({
        ...user,
        displayName: editName,
        address: editAddress
      }));
      setIsEditingProfile(false);
      alert('Profile Updated Successfully!');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(setUser(null));
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-swiggy-dark text-white py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          <div className="w-24 h-24 bg-swiggy-orange rounded-full flex items-center justify-center text-3xl font-black shadow-xl">
            {user.displayName?.[0] || user.email?.[0].toUpperCase()}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-black mb-1">{user.displayName || 'Kolkata Foodie'}</h1>
            <p className="text-swiggy-gray font-bold">{user.email}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                Edit Profile
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="bg-swiggy-orange text-white px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center shadow-lg shadow-swiggy-orange/20 hover:scale-105"
                >
                  <Settings className="w-4 h-4 mr-2" /> Admin Panel
                </button>
              )}
              <button 
                onClick={() => navigate('/rider')}
                className="bg-swiggy-dark text-white px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center shadow-lg shadow-swiggy-dark/20 hover:scale-105"
              >
                <Bike className="w-4 h-4 mr-2" /> Rider App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black text-swiggy-dark mb-6">Edit Profile</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-swiggy-gray uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-swiggy-orange outline-none"
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-swiggy-gray uppercase tracking-widest mb-2">Default Address</label>
                  <textarea 
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-swiggy-orange outline-none"
                    placeholder="Your Address"
                    rows={3}
                  />
                </div>
                <button 
                  onClick={handleUpdateProfile}
                  disabled={savingProfile}
                  className="w-full bg-swiggy-orange text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-2">
            {[
              { id: 'orders', label: 'Orders', icon: ShoppingBag },
              { id: 'addresses', label: 'Addresses', icon: MapPin },
              { id: 'payments', label: 'Payments', icon: Star },
              { id: 'help', label: 'Help', icon: Clock },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between p-4 rounded-xl font-bold text-sm transition-all ${
                  activeTab === item.id ? 'bg-swiggy-orange/10 text-swiggy-orange' : 'text-swiggy-gray hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {activeTab === 'orders' && (
              <>
                <h2 className="text-2xl font-black text-swiggy-dark mb-8">Past Orders</h2>
                
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-swiggy-orange"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                    <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-swiggy-gray font-bold">No orders yet</p>
                    <button 
                      onClick={() => navigate('/')}
                      className="mt-4 text-swiggy-orange font-black uppercase text-sm"
                    >
                      Start Ordering
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={order.id} 
                        className="border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs text-swiggy-gray font-bold uppercase tracking-widest mb-1">Order #{order.id.slice(-6)}</p>
                            <h3 className="text-lg font-black text-swiggy-dark">Kolkata's Kitchen</h3>
                            <p className="text-xs text-swiggy-gray">{order.createdAt?.toDate().toLocaleDateString()}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-swiggy-orange/10 text-swiggy-orange'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="border-t border-dashed border-gray-100 pt-4 mt-4">
                          <p className="text-sm text-swiggy-gray mb-2">
                            {order.items.map(i => `${i.name} x ${i.quantity}`).join(', ')}
                          </p>
                          <div className="flex justify-between items-center">
                            <p className="font-black text-swiggy-dark">Total: ₹{order.totalAmount}</p>
                            <div className="flex space-x-4">
                              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                <button 
                                  onClick={() => navigate(`/order-confirmation/${order.id}`)}
                                  className="bg-swiggy-orange text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:shadow-md transition-all"
                                >
                                  Track Order
                                </button>
                              )}
                              <button 
                                onClick={() => navigate(`/order-confirmation/${order.id}`)}
                                className="text-swiggy-orange font-black text-xs uppercase tracking-widest hover:underline"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'addresses' && (
              <>
                <h2 className="text-2xl font-black text-swiggy-dark mb-8">My Addresses</h2>
                <div className="border-2 border-swiggy-dark p-8 rounded-2xl relative">
                  <div className="absolute top-6 right-6 text-swiggy-dark">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-swiggy-dark mb-2">Home</h3>
                  <p className="text-swiggy-gray font-bold max-w-sm">{user.address || '123, Tech Park, Silicon Valley, Bangalore - 560001'}</p>
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-6 text-swiggy-orange font-black uppercase text-xs tracking-widest flex items-center"
                  >
                    <Edit2 className="w-3 h-3 mr-2" /> Edit Address
                  </button>
                </div>
              </>
            )}

            {activeTab === 'payments' && (
              <>
                <h2 className="text-2xl font-black text-swiggy-dark mb-8">Payment Methods</h2>
                <div className="space-y-4">
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-50 p-3 rounded-xl">
                        <Smartphone className="w-6 h-6 text-purple-700" />
                      </div>
                      <div>
                        <p className="font-black text-swiggy-dark">PhonePe UPI</p>
                        <p className="text-xs text-swiggy-gray font-bold">internetmoney@ybl</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-black uppercase tracking-widest">Primary</span>
                  </div>
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl flex items-center justify-between shadow-sm opacity-60">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-swiggy-dark">HDFC Bank Debit Card</p>
                        <p className="text-xs text-swiggy-gray font-bold">XXXX XXXX XXXX 4321</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full border-2 border-dashed border-gray-200 p-4 rounded-2xl text-swiggy-gray font-black uppercase text-xs tracking-widest hover:border-swiggy-orange hover:text-swiggy-orange transition-all">
                    + Add New Payment Method
                  </button>
                </div>
              </>
            )}

            {activeTab === 'help' && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl">
                <HelpCircle className="w-16 h-16 text-swiggy-orange/20 mx-auto mb-4" />
                <h3 className="text-xl font-black text-swiggy-dark mb-2">Need assistance?</h3>
                <p className="text-swiggy-gray font-bold mb-8">Our support team is available 24/7 to help you with your orders.</p>
                <button 
                  onClick={() => navigate('/help')}
                  className="bg-swiggy-orange text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:shadow-lg transition-all"
                >
                  Go to Help Center
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
