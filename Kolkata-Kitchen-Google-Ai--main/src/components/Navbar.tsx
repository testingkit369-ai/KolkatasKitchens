import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { ShoppingCart, User, Search, LogOut, Percent, LifeBuoy, MapPin, ChevronDown, Navigation } from 'lucide-react';
import { auth, signOut } from '../firebase';
import { setUser } from '../store/authSlice';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { items } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [location, setLocation] = useState('Karol Bagh, Delhi');
  const [isLocating, setIsLocating] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(setUser(null));
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, we'd reverse geocode here. For now, we'll mock it.
        setLocation(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
        alert('Unable to retrieve your location. Please check permissions.');
      }
    );
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-[100] h-20 flex items-center">
      <div className="swiggy-container w-full flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex-shrink-0 transition-transform hover:scale-110">
            <svg className="h-12 w-12 text-swiggy-orange fill-current" viewBox="0 0 512 512">
              <path d="M336.7 185.3c-1.3-1.3-3.4-1.3-4.7 0l-12.6 12.6c-1.3 1.3-1.3 3.4 0 4.7l12.6 12.6c1.3 1.3 3.4 1.3 4.7 0l12.6-12.6c1.3-1.3 1.3-3.4 0-4.7l-12.6-12.6zM256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 472c-119.3 0-216-96.7-216-216S136.7 40 256 40s216 96.7 216 216-96.7 216-216 216z"/>
              <path d="M352 256c0-53-43-96-96-96s-96 43-96 96 43 96 96 96 96-43 96-96zm-96 56c-30.9 0-56-25.1-56-56s25.1-56 56-56 56 25.1 56 56-25.1 56-56 56z"/>
            </svg>
          </Link>
          <div 
            className="hidden md:flex items-center space-x-2 text-sm font-bold text-swiggy-dark border-b-2 border-swiggy-dark pb-1 cursor-pointer hover:text-swiggy-orange hover:border-swiggy-orange transition-all group relative"
          >
            <div 
              onClick={handleGetLocation}
              className="flex items-center"
            >
              <span className="flex items-center">
                {isLocating ? 'Locating...' : 'Other'}
                <ChevronDown className="h-4 w-4 ml-1 text-swiggy-orange" />
              </span>
              <span className="text-swiggy-gray font-normal truncate max-w-[200px] ml-2">{location}</span>
            </div>
            
            {/* Tooltip for GPS */}
            <div className="absolute top-full left-0 mt-2 bg-white shadow-2xl border border-gray-100 p-4 rounded-xl w-64 hidden group-hover:block z-50">
              <button 
                onClick={handleGetLocation}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <Navigation className="w-5 h-5 text-swiggy-orange" />
                <div>
                  <p className="text-sm font-black text-swiggy-dark">Get Live Location</p>
                  <p className="text-[10px] text-swiggy-gray font-bold">Using GPS</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-12">
          <div className="hidden lg:flex items-center space-x-12">
            <button 
              onClick={() => {
                if (window.location.pathname === '/') {
                  document.getElementById('main-search-input')?.focus();
                  document.getElementById('main-search-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                  navigate('/?focusSearch=true');
                }
              }}
              className="swiggy-nav-link"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
            <Link to="/offers" className="swiggy-nav-link">
              <Percent className="h-5 w-5" />
              <span>Offers</span>
            </Link>
            <Link to="/help" className="swiggy-nav-link">
              <LifeBuoy className="h-5 w-5" />
              <span>Help</span>
            </Link>
          </div>

          <div className="flex items-center space-x-12">
            {user ? (
              <div className="flex items-center space-x-8">
                {(user.role === 'outlet_manager' || user.role === 'admin' || user.email === 'internetmoneyyy369@gmail.com') && (
                  <Link to="/kitchen" className="swiggy-nav-link">
                    <span className="font-bold text-swiggy-orange">Kitchen</span>
                  </Link>
                )}
                <Link to="/profile" className="swiggy-nav-link">
                  <User className="h-5 w-5" />
                  <span>{user.displayName?.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="swiggy-nav-link">
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="swiggy-nav-link">
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}

            <Link to="/cart" className="swiggy-nav-link relative">
              <ShoppingCart className={`h-5 w-5 ${cartCount > 0 ? 'text-green-600' : ''}`} />
              <span className={cartCount > 0 ? 'text-green-600 font-bold' : ''}>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-4 bg-green-600 text-white text-[10px] font-bold rounded-sm px-1">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
