import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, db, OperationType, handleFirestoreError } from '../firebase';
import { Restaurant } from '../store/restaurantSlice';
import { Star, Clock, Plus, Minus, ShoppingBag, MapPin, ChevronRight, Percent, Utensils } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../store/cartSlice';
import { RootState } from '../store';
import { motion, AnimatePresence } from 'motion/react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  category: string;
}

const CATEGORY_THEMES: Record<string, { color: string, bg: string, border: string, icon: any }> = {
  "Biryani Lineup": { color: "text-kolkata-red", bg: "bg-kolkata-red/5", border: "border-kolkata-red", icon: Utensils },
  "Kolkata Chinese": { color: "text-red-600", bg: "bg-red-50", border: "border-red-600", icon: Utensils },
  "Rolls & Wraps": { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-600", icon: Utensils },
  "Momos": { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-600", icon: Utensils },
  "Burgers & Sandwiches": { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-600", icon: Utensils },
  "Drinks": { color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-600", icon: Utensils },
};

export default function RestaurantDetails() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  useEffect(() => {
    if (!id) return;

    const fetchRestaurant = async () => {
      try {
        const docRef = doc(db, 'outlets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRestaurant({ id: docSnap.id, ...docSnap.data() } as Restaurant);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `outlets/${id}`);
      }
    };

    const q = query(collection(db, 'outlets', id, 'menu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setMenuItems(items);
      setLoading(false);

      // Handle category scroll from URL
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category');
      if (category) {
        setTimeout(() => {
          const element = document.getElementById(`category-${category}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${id}/menu`);
    });

    fetchRestaurant();
    return () => unsubscribe();
  }, [id]);

  const handleAddToCart = (item: MenuItem) => {
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurantId: id!,
      image: item.image
    }));
  };

  const getItemQuantity = (itemId: string) => {
    return cartItems.find(item => item.id === itemId)?.quantity || 0;
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  if (loading) return (
    <div className="swiggy-container py-20 flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-swiggy-orange mb-4"></div>
    </div>
  );
  
  if (!restaurant) return <div className="swiggy-container py-8">Restaurant not found</div>;

  return (
    <div className="bg-white min-h-screen">
      <div className="swiggy-container max-w-[800px] py-8">
        {/* Breadcrumbs */}
        <div className="text-[10px] text-swiggy-gray mb-8">
          <Link to="/" className="hover:text-swiggy-dark">Home</Link> / <Link to="/" className="hover:text-swiggy-dark">Delhi</Link> / <span className="text-swiggy-dark font-medium">{restaurant.name}</span>
        </div>

        {/* Restaurant Header */}
        <div className="mb-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-swiggy-dark mb-1">{restaurant.name}</h1>
              <p className="text-sm text-swiggy-gray">{restaurant.cuisine.join(', ')}</p>
              <p className="text-sm text-swiggy-gray">{restaurant.location}</p>
            </div>
            <div className="border rounded-lg p-2 text-center shadow-sm">
              <div className="flex items-center justify-center text-green-600 font-bold border-b pb-1 mb-1">
                <Star className="h-4 w-4 fill-current mr-1" />
                {restaurant.rating}
              </div>
              <div className="text-[10px] font-bold text-swiggy-gray">10K+ ratings</div>
            </div>
          </div>
          <div className="flex items-center space-x-6 py-4 border-t border-dashed">
            <div className="flex items-center font-bold text-swiggy-dark">
              <Clock className="h-5 w-5 mr-2" />
              {restaurant.deliveryTime}
            </div>
            <div className="flex items-center font-bold text-swiggy-dark">
              <span className="mr-2">₹</span>
              ₹400 for two
            </div>
          </div>
        </div>

        {/* Offers */}
        <div className="flex overflow-x-auto no-scrollbar space-x-4 mb-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 border rounded-xl p-3 flex items-center space-x-3 w-52">
              <Percent className="h-6 w-6 text-swiggy-orange" />
              <div>
                <p className="text-xs font-bold text-swiggy-dark">50% OFF UPTO ₹100</p>
                <p className="text-[10px] text-swiggy-gray font-bold">USE SWIGGY50</p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="space-y-8">
          {categories.map(category => (
            <section key={category} id={`category-${category}`} className="border-b-8 border-gray-100 pb-8 last:border-b-0">
              <button className="w-full flex justify-between items-center py-4 text-left">
                <h2 className="text-lg font-black text-swiggy-dark">{category} ({menuItems.filter(i => i.category === category).length})</h2>
                <ChevronRight className="h-6 w-6 rotate-90" />
              </button>

              <div className="divide-y">
                {menuItems.filter(item => item.category === category).map(item => (
                  <div key={item.id} className="py-8 flex justify-between gap-8">
                    <div className="flex-1">
                      <div className="mb-1">
                        {item.isVeg ? (
                          <div className="h-4 w-4 border-2 border-green-600 flex items-center justify-center">
                            <div className="h-2 w-2 bg-green-600 rounded-full" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 border-2 border-red-600 flex items-center justify-center">
                            <div className="h-2 w-2 bg-red-600 rounded-full" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-swiggy-dark mb-1">{item.name}</h3>
                      <p className="text-sm font-bold text-swiggy-dark mb-2">₹{item.price}</p>
                      <p className="text-sm text-swiggy-gray leading-relaxed">{item.description}</p>
                    </div>

                    <div className="relative w-32 h-32 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl shadow-md" />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24">
                        {getItemQuantity(item.id) > 0 ? (
                          <div className="bg-white border shadow-lg rounded-lg flex items-center justify-between p-1">
                            <button
                              onClick={() => dispatch(updateQuantity({ id: item.id, quantity: getItemQuantity(item.id) - 1 }))}
                              className="p-1 text-green-600 hover:bg-gray-100 rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-bold text-green-600">{getItemQuantity(item.id)}</span>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="p-1 text-green-600 hover:bg-gray-100 rounded"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-full bg-white border shadow-lg text-green-600 py-2 rounded-lg font-bold hover:bg-gray-50 transition-all uppercase text-xs"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full bg-green-600 text-white p-4 z-50 flex justify-between items-center"
          >
            <div className="swiggy-container w-full flex justify-between items-center">
              <div className="font-bold">
                {cartItems.length} Items | ₹{cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
              </div>
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center font-bold uppercase tracking-wide"
              >
                VIEW CART
                <ShoppingBag className="ml-2 h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
