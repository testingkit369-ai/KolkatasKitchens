import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/index';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Truck, ShieldCheck, User, CheckCircle2, ChevronRight, Ticket, MessageSquare, Sparkles } from 'lucide-react';
import axios from 'axios';
import { addDoc, collection, db, serverTimestamp, OperationType, handleFirestoreError, updateDoc } from '../firebase';
import { clearCart } from '../store/cart-slice';

export default function Checkout() {
  const { items, restaurantId } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [addressType, setAddressType] = useState<'Home' | 'Office'>('Home');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [geofenceError, setGeofenceError] = useState('');

  useEffect(() => {
    // Smart Default Address based on time of day
    const hour = new Date().getHours();
    if (hour >= 11 && hour <= 16) {
      setAddress('456, Business Park, Whitefield, Bangalore - 560066');
      setAddressType('Office');
    } else {
      setAddress(user?.address || '123, Tech Park, Silicon Valley, Bangalore - 560001');
      setAddressType('Home');
    }
  }, [user]);

  const validateGeofence = (newAddress: string) => {
    // Mock Geofence validation
    if (newAddress.toLowerCase().includes('delhi') || newAddress.toLowerCase().includes('mumbai')) {
      setGeofenceError('Address is outside our delivery zone. We currently serve Bangalore only.');
      return false;
    }
    setGeofenceError('');
    return true;
  };

  const handleSaveAddress = () => {
    if (validateGeofence(address)) {
      setIsEditingAddress(false);
    }
  };
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod' | 'pay_at_door'>('upi');
  const [isNewUser, setIsNewUser] = useState(false); // Mock new user state

  // Mock COD fraud prevention
  const canUseCOD = !isNewUser;
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [isGifting, setIsGifting] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [loyaltyTokens, setLoyaltyTokens] = useState(50); // Mock loyalty tokens
  const [serverPricing, setServerPricing] = useState<{
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    signature: string;
  } | null>(null);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchPricing = async () => {
      if (!items.length || !restaurantId) return;
      try {
        const response = await axios.post('/api/orders/calculate-total', {
          cartItems: items,
          outletId: restaurantId,
          promoCode: couponCode
        });
        if (response.data.success) {
          setServerPricing(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
      }
    };
    fetchPricing();
  }, [items, restaurantId, couponCode]);

  const subtotal = serverPricing?.subtotal || items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = serverPricing?.deliveryFee || 40;
  const taxes = serverPricing?.tax || 18;
  const total = serverPricing?.total || (subtotal + deliveryFee + taxes - discount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'KOLKATA50') {
      setDiscount(50);
      alert('Coupon Applied! ₹50 Discounted.');
    } else {
      alert('Invalid Coupon Code');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !restaurantId || !serverPricing) return;
    setLoading(true);

    try {
      // 1. Validate order placement on server
      const validationResponse = await axios.post('/api/orders/validate-placement', {
        userId: user.uid,
        cartItems: items,
        outletId: restaurantId
      });

      if (!validationResponse.data.success) {
        alert(validationResponse.data.message);
        return;
      }

      // 2. Create order in Firestore
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const orderRef = await addDoc(collection(db, 'outlets', restaurantId, 'orders'), {
        userId: user.uid,
        outlet_id: restaurantId,
        items,
        totalAmount: total,
        status: 'pending',
        deliveryOtp,
        customerLocation: { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore center
        paymentStatus: 'pending',
        paymentMethod,
        address,
        cookingInstructions,
        createdAt: serverTimestamp()
      });
      
      // Update with the generated ID for collectionGroup queries
      await updateDoc(orderRef, { id: orderRef.id });

      // Mock WhatsApp Notification
      console.log(`[WhatsApp] Order Confirmed! Track here: https://kolkata-kitchen.com/order-confirmation/${restaurantId}/${orderRef.id}`);
      if (isGifting) {
        console.log(`[WhatsApp] Gift sent to friend with note: "${giftNote}"`);
      }

      // 3. Initiate payment on server
      if (paymentMethod === 'cod' || paymentMethod === 'pay_at_door') {
        dispatch(clearCart());
        navigate(`/order-confirmation/${restaurantId}/${orderRef.id}`);
      } else {
        const paymentResponse = await axios.post('/api/payments/initiate', {
          amount: total,
          orderId: orderRef.id,
          userId: user.uid,
          signature: serverPricing.signature,
          outletId: restaurantId,
          idempotencyKey: `pay_${orderRef.id}_${Date.now()}` // Prevent duplicate charges
        });

        if (paymentResponse.data.success) {
          window.location.href = paymentResponse.data.data.instrumentResponse.redirectInfo.url;
        } else {
          alert("Payment initiation failed. Please try again.");
        }
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Account & Address */}
          <div className="flex-1 space-y-4">
            {/* Account Section */}
            <div className="bg-white p-8 shadow-sm">
              <div className="flex items-start space-x-6">
                <div className="bg-swiggy-dark p-3 rounded-sm">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-swiggy-dark">Logged in</h2>
                  <p className="text-sm font-bold text-swiggy-dark mt-1">{user?.displayName || 'Kolkata Foodie'} | {user?.email}</p>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-white p-8 shadow-sm">
              <div className="flex items-start space-x-6">
                <div className="bg-swiggy-dark p-3 rounded-sm">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-swiggy-dark">Delivery Address</h2>
                    <button 
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="text-swiggy-orange text-xs font-black uppercase tracking-widest"
                    >
                      {isEditingAddress ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  
                  {isEditingAddress ? (
                    <div className="space-y-4">
                      <textarea
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (geofenceError) validateGeofence(e.target.value);
                        }}
                        className={`w-full border-2 p-4 rounded-lg outline-none text-sm font-bold ${
                          geofenceError ? 'border-red-500 focus:border-red-500' : 'border-gray-100 focus:border-swiggy-orange'
                        }`}
                        rows={3}
                        placeholder="Enter your full address..."
                      />
                      {geofenceError && (
                        <p className="text-xs font-bold text-red-500">{geofenceError}</p>
                      )}
                      <button 
                        onClick={handleSaveAddress}
                        className="bg-swiggy-dark text-white px-6 py-2 text-xs font-black uppercase tracking-widest"
                      >
                        Save Address
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-swiggy-dark p-6 relative">
                      <div className="absolute top-4 right-4 text-swiggy-dark">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-swiggy-dark mb-1">{addressType}</h3>
                      <p className="text-sm text-swiggy-gray">{address}</p>
                      <p className="text-xs font-bold text-swiggy-dark mt-4 uppercase tracking-widest">35 MINS</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white p-8 shadow-sm">
              <div className="flex items-start space-x-6">
                <div className="bg-swiggy-dark p-3 rounded-sm">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-swiggy-dark mb-6">Choose Payment Method</h2>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'upi', label: 'PhonePe UPI (Fastest)', icon: '📱' },
                      { id: 'card', label: 'Saved Cards (Tokenized)', icon: '💳' },
                      { id: 'cod', label: 'Cash on Delivery (OTP Verified)', icon: '💵', disabled: !canUseCOD },
                      { id: 'pay_at_door', label: 'Pay at Door (Rider OTP)', icon: '🚪' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => !method.disabled && setPaymentMethod(method.id as any)}
                        disabled={method.disabled}
                        className={`w-full flex items-center justify-between p-4 border-2 transition-all ${
                          paymentMethod === method.id ? 'border-swiggy-orange bg-swiggy-orange/5' : 
                          method.disabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-2xl">{method.icon}</span>
                          <div className="text-left">
                            <span className="text-sm font-black text-swiggy-dark block">{method.label}</span>
                            {method.disabled && <span className="text-[10px] text-red-500 font-bold uppercase">Limit Reached</span>}
                          </div>
                        </div>
                        {paymentMethod === method.id && <CheckCircle2 className="w-5 h-5 text-swiggy-orange" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full lg:w-[380px]">
            <div className="bg-white p-6 shadow-sm sticky top-24">
              <div className="flex items-center space-x-4 mb-6">
                <img src="https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=50&q=80" className="w-12 h-12 rounded-sm object-cover" alt="Restaurant" />
                <div>
                  <h3 className="font-black text-swiggy-dark">Kolkata's Kitchen</h3>
                  <p className="text-xs text-swiggy-gray font-bold">Karol Bagh</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 border border-gray-300 flex items-center justify-center p-[1px]">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                      </div>
                      <span className="text-swiggy-gray font-bold">{item.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-swiggy-gray">x{item.quantity}</span>
                      <span className="font-bold text-swiggy-dark">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cooking Instructions */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2 text-swiggy-gray">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cooking Instructions</span>
                </div>
                <textarea
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  placeholder="e.g. Make it extra spicy, No onions..."
                  className="w-full border-2 border-gray-50 p-3 rounded-lg text-xs font-bold focus:border-swiggy-orange outline-none"
                  rows={2}
                />
              </div>

              {/* Share Your Meal */}
              <div className="mb-6">
                <label className="flex items-center space-x-2 cursor-pointer mb-2">
                  <input 
                    type="checkbox" 
                    checked={isGifting}
                    onChange={(e) => setIsGifting(e.target.checked)}
                    className="w-4 h-4 text-swiggy-orange focus:ring-swiggy-orange border-gray-300 rounded"
                  />
                  <span className="text-sm font-black text-swiggy-dark">🎁 Share Your Meal (Gift to a Friend)</span>
                </label>
                {isGifting && (
                  <textarea
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    placeholder="Write a personalized note..."
                    className="w-full border-2 border-gray-50 p-3 rounded-lg text-xs font-bold focus:border-swiggy-orange outline-none mt-2"
                    rows={2}
                  />
                )}
              </div>

              {/* Coupon Section */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3 text-swiggy-dark">
                  <Ticket className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Apply Coupon</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Try KOLKATA50"
                    className="flex-1 border-none bg-white px-3 py-2 rounded text-xs font-bold outline-none"
                  />
                  <button 
                    onClick={applyCoupon}
                    className="text-swiggy-orange text-xs font-black uppercase tracking-widest"
                  >
                    Apply
                  </button>
                </div>
                {discount > 0 && (
                  <p className="text-[10px] text-green-600 font-bold mt-2">✓ Coupon Applied Successfully!</p>
                )}
              </div>

              {/* Loyalty Auto-Apply */}
              {loyaltyTokens > 0 && (
                <div className="mb-6 bg-yellow-50 border border-yellow-100 p-4 rounded-lg flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-yellow-800">Loyalty Reward</p>
                    <p className="text-xs text-yellow-700 font-bold mt-1">You earned {loyaltyTokens} K-Tokens → Applied to next order automatically!</p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-xs font-bold text-swiggy-gray">
                  <span>Item Total</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-swiggy-gray">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-swiggy-gray">
                  <span>Taxes and Charges</span>
                  <span>₹{taxes}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-green-600">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="border-t-2 border-swiggy-dark pt-4 flex justify-between items-center">
                  <span className="font-black text-swiggy-dark uppercase tracking-wider">To Pay</span>
                  <span className="font-black text-swiggy-dark text-lg">₹{total}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-swiggy-orange text-white py-4 mt-6 font-black uppercase tracking-widest text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Proceed to Pay'}
              </button>

              <button
                onClick={() => navigate('/cancellation')}
                className="w-full text-swiggy-gray py-4 mt-2 font-bold uppercase tracking-widest text-[10px] hover:text-swiggy-dark transition-all"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
