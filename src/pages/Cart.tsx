import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateQuantity, removeFromCart, clearCart } from '../store/cart-slice';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, User, CheckCircle2, MapPin, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Cart() {
  const { items } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="swiggy-container py-20 text-center">
        <img
          src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/2xempty_cart_ybi09z"
          alt="Empty Cart"
          className="h-64 mx-auto mb-6"
        />
        <h2 className="text-xl font-bold text-swiggy-dark mb-2">Your cart is empty</h2>
        <p className="text-swiggy-gray mb-8">You can go to home page to view more restaurants</p>
        <Link
          to="/"
          className="inline-block bg-swiggy-orange text-white px-8 py-3 font-bold hover:shadow-lg transition-all uppercase"
        >
          See restaurants near you
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#e9eaee] min-h-screen py-8">
      <div className="swiggy-container max-w-[1000px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Checkout Steps (Simplified) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-swiggy-dark">Account</h2>
                {user && <CheckCircle2 className="w-6 h-6 text-green-600" />}
              </div>
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="bg-swiggy-dark text-white p-3 rounded-full">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-black text-swiggy-dark text-lg">{user.displayName || 'Kolkata Foodie'}</p>
                    <p className="text-sm text-swiggy-gray font-bold">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <p className="text-swiggy-gray font-bold max-w-md">To place your order now, log in to your existing account or sign up.</p>
                  <Link to="/login?redirect=/cart" className="border-2 border-swiggy-orange text-swiggy-orange px-8 py-3 font-black uppercase text-xs tracking-widest hover:bg-swiggy-orange hover:text-white transition-all">LOG IN</Link>
                </div>
              )}
            </div>

            <div className="bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black text-gray-300 mb-6">Delivery Address</h2>
              <div className="flex items-center space-x-4 text-gray-300">
                <MapPin className="w-8 h-8" />
                <p className="text-sm font-bold">Log in to select your delivery address</p>
              </div>
            </div>

            <div className="bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black text-gray-300 mb-6">Payment</h2>
              <div className="flex items-center space-x-4 text-gray-300">
                <CreditCard className="w-8 h-8" />
                <p className="text-sm font-bold">Payment methods will be available after address selection</p>
              </div>
            </div>
          </div>

          {/* Right Side: Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 shadow-sm sticky top-24">
              <div className="flex items-center space-x-4 mb-6 border-b pb-4">
                <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=100&q=80" className="h-12 w-12 object-cover rounded" alt="Restaurant" />
                <div>
                  <h3 className="font-bold text-swiggy-dark">Kolkata's Kitchen</h3>
                  <p className="text-xs text-swiggy-gray">Karol Bagh</p>
                  <Link to="/" className="text-[10px] text-swiggy-orange font-black uppercase tracking-widest hover:underline mt-1 inline-block">Add more items</Link>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-swiggy-dark">{item.name}</p>
                    </div>
                    <div className="flex items-center border px-2 py-1 space-x-3">
                      <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))} className="text-swiggy-gray hover:text-swiggy-dark"><Minus className="h-3 w-3" /></button>
                      <span className="text-green-600 font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))} className="text-swiggy-gray hover:text-swiggy-dark"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="w-16 text-right font-medium text-swiggy-gray">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4 text-sm">
                <div className="flex justify-between text-swiggy-dark">
                  <span>Item Total</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-swiggy-gray">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-swiggy-gray border-b pb-3">
                  <span>GST and Restaurant Charges</span>
                  <span>₹25</span>
                </div>
                <div className="flex justify-between font-bold text-swiggy-dark text-lg pt-2">
                  <span>TO PAY</span>
                  <span>₹{total + 25}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(user ? '/checkout' : '/login?redirect=/checkout')}
                className="w-full bg-green-600 text-white py-4 mt-6 font-bold uppercase tracking-wide hover:shadow-lg transition-all"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
