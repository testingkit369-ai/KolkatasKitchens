import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, query, db, OperationType, handleFirestoreError, auth, doc, getDoc, getDocs, where, orderBy, limit, collectionGroup } from '../firebase';
import { setRestaurants, setLoading, Restaurant } from '../store/restaurantSlice';
import { RootState } from '../store';
import { Star, Clock, MapPin, ChevronRight, UtensilsCrossed, Plus, Minus, ShoppingBag, Percent, Sparkles, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { addToCart, updateQuantity, clearCart } from '../store/cartSlice';
import axios from 'axios';

interface Recommendation {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  category: string;
  reason: string;
  tag: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  category: string;
}

const KolkataElements = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
    {/* Howrah Bridge Silhouette */}
    <motion.svg 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 0.1 }}
      className="absolute -top-10 -left-20 w-[600px] h-auto text-swiggy-orange" viewBox="0 0 800 200"
    >
      <path fill="currentColor" d="M0,150 L800,150 L800,160 L0,160 Z M100,150 L100,50 L120,50 L120,150 Z M680,150 L680,50 L700,50 L700,150 Z M120,70 L680,70 L680,80 L120,80 Z M120,100 L680,100 L680,110 L120,110 Z" />
    </motion.svg>
    {/* Yellow Taxi */}
    <motion.svg 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 0.1 }}
      transition={{ delay: 0.5 }}
      className="absolute bottom-20 -right-10 w-48 h-auto text-yellow-500" viewBox="0 0 200 100"
    >
      <path fill="currentColor" d="M20,60 L180,60 L170,30 L30,30 Z M40,60 L40,80 L60,80 L60,60 Z M140,60 L140,80 L160,80 L160,60 Z" />
    </motion.svg>
    {/* Rossogulla Bowl */}
    <motion.svg 
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.1 }}
      transition={{ delay: 1 }}
      className="absolute top-1/2 -left-10 w-32 h-auto text-swiggy-gray" viewBox="0 0 100 100"
    >
      <circle cx="50" cy="70" r="30" fill="currentColor" />
      <circle cx="40" cy="50" r="15" fill="white" />
      <circle cx="60" cy="50" r="15" fill="white" />
      <circle cx="50" cy="40" r="15" fill="white" />
    </motion.svg>
    {/* Biryani Pot */}
    <motion.svg 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 0.1 }}
      transition={{ delay: 1.5 }}
      className="absolute top-20 -right-20 w-40 h-auto text-swiggy-orange" viewBox="0 0 100 100"
    >
      <path fill="currentColor" d="M20,80 L80,80 L90,40 L10,40 Z M30,40 L30,30 L70,30 L70,40 Z" />
    </motion.svg>
  </div>
);

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurants, loading } = useSelector((state: RootState) => state.restaurant);
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.email === 'internetmoneyyy369@gmail.com';

  const [selectedOutlet, setSelectedOutlet] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    if (user && selectedOutlet) {
      const fetchAI = async () => {
        try {
          // Fetch order history
          const qHistory = query(collectionGroup(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
          const historySnap = await getDocs(qHistory);
          const historyItems = historySnap.docs.flatMap(doc => doc.data().items || []);
          const lastOrderedCategory = historyItems.length > 0 ? historyItems[0].category : null;

          // Fetch menu
          const menuSnap = await getDocs(collection(db, 'outlets', selectedOutlet.id, 'menu'));
          const allDishes = menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

          const now = new Date();
          const hour = now.getHours();
          const weather = 'Sunny'; // Mock weather

          const FESTIVALS = [
            { name: "Durga Puja", start: "2026-10-15", end: "2026-10-20", dish: "Bhoger Khichuri" },
            { name: "Poila Baisakh", start: "2026-04-14", end: "2026-04-15", dish: "Luchi + Cholar Dal" },
          ];

          const recommendationsList = allDishes.map((dish: any) => {
            let score = 0;
            let reason = "";
            let tag = "";

            if (lastOrderedCategory && dish.category === lastOrderedCategory) {
              score += 0.3;
              reason = `Because you love ${lastOrderedCategory}`;
              tag = "Based on your history";
            }

            if (hour < 11 && dish.category === "Rolls & Wraps") {
              score += 0.2;
              reason = "Perfect for a quick breakfast";
              tag = "Morning Special";
            } else if (hour > 18 && dish.category === "Biryani Lineup") {
              score += 0.4;
              reason = "Kolkata's favorite dinner choice";
              tag = "Dinner Recommendation";
            }

            if (weather === "Rainy" && dish.name.toLowerCase().includes("luchi")) {
              score += 0.5;
              reason = "Rainy day? Try hot Luchi + Cholar Dal combo";
              tag = "Weather Special";
            }

            const currentFestival = FESTIVALS.find(f => {
              const start = new Date(f.start);
              const end = new Date(f.end);
              return now >= start && now <= end;
            });

            if (currentFestival && dish.name.includes(currentFestival.dish)) {
              score += 1.0;
              reason = `${currentFestival.name} Special: ${currentFestival.dish} available now`;
              tag = "Festival Special";
            }

            return { ...dish, score, reason, tag };
          });

          const ranked = recommendationsList
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          setRecommendations(ranked);
        } catch (error) {
          console.error("AI fetch error:", error);
        }
      };
      fetchAI();

      // Fetch last order for "Reorder" button
      const q = query(collectionGroup(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setLastOrder({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      });
      return () => unsubscribe();
    }
  }, [user, selectedOutlet]);

  const handleReorder = () => {
    if (!lastOrder) return;
    dispatch(clearCart());
    lastOrder.items.forEach((item: any) => {
      dispatch(addToCart({
        ...item,
        restaurantId: lastOrder.restaurantId
      }));
    });
    navigate('/cart');
  };

  useEffect(() => {
    dispatch(setLoading(true));
    const q = query(collection(db, 'outlets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const restaurantData: Restaurant[] = [];
      snapshot.forEach((doc) => {
        restaurantData.push({ id: doc.id, ...doc.data() } as Restaurant);
      });
      dispatch(setRestaurants(restaurantData));
      
      // Auto-select the first outlet (Karol Bagh)
      if (restaurantData.length > 0) {
        setSelectedOutlet(restaurantData[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'outlets');
    });

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    if (!selectedOutlet) {
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    const q = query(collection(db, 'outlets', selectedOutlet.id, 'menu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setMenuItems(items);
      setMenuLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `outlets/${selectedOutlet.id}/menu`);
    });

    return () => unsubscribe();
  }, [selectedOutlet]);

  const handleAddToCart = (item: MenuItem) => {
    if (!selectedOutlet) return;
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurantId: selectedOutlet.id,
      image: item.image
    }));
  };

  const getItemQuantity = (itemId: string) => {
    return cartItems.find(item => item.id === itemId)?.quantity || 0;
  };

  // Grouping categories into sections as requested
  const cuisineSections = [
    {
      title: "Kolkata Biryani",
      categories: ["Kolkata Biryani"],
      description: "Authentic Kolkata-style Biryani with the iconic potato and egg.",
      image: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Kolkata Authentic Chinese",
      categories: ["Kolkata Chinese"],
      description: "Tangra-style Indo-Chinese delicacies from the heart of Kolkata.",
      image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Snacks & Momos",
      categories: ["Sandwiches", "Burgers", "Wraps", "Momos", "Rolls"],
      description: "Quick bites: Sandwiches, Burgers, Wraps, and the famous Kolkata Momos.",
      image: "https://images.unsplash.com/photo-1626777552726-4a6b547b4e5c?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Drinks & Desserts",
      categories: ["Drinks", "Desserts"],
      description: "Refreshing beverages and sweet endings.",
      image: "https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&w=400&q=80"
    }
  ];

  const allGroupedCategories = cuisineSections.flatMap(s => s.categories);
  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const otherItems = filteredMenuItems.filter(item => !allGroupedCategories.includes(item.category));

  if (loading && !selectedOutlet) return (
    <div className="swiggy-container py-20 flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-swiggy-orange mb-4"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative">
      <KolkataElements />
      
      <div className="swiggy-container max-w-[800px] py-8 relative z-10">
        {/* Brand Header */}
        <div className="mb-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4"
          >
            <span className="bg-swiggy-orange/10 text-swiggy-orange px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
              Authentic Kolkata Taste in Delhi
            </span>
          </motion.div>
          <h1 className="text-4xl font-black text-swiggy-dark mb-2">Kolkata's Kitchen</h1>
          <p className="text-swiggy-gray max-w-md mx-auto">Bringing the iconic flavors of Tangra and Park Street directly to your doorstep in Karol Bagh.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-10 sticky top-20 z-20 bg-white/80 backdrop-blur-md py-2">
          <div className="relative">
            <input
              id="main-search-input"
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-xl py-4 px-12 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-swiggy-gray hover:text-swiggy-dark"
              >
                <UtensilsCrossed className="h-4 w-4 rotate-45" />
              </button>
            )}
          </div>
        </div>

        {/* AI Recommendations "For You" */}
        {recommendations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-swiggy-orange" />
                <h2 className="text-xl font-black text-swiggy-dark">Kolkata Cravings: For You</h2>
              </div>
              {lastOrder && (
                <button 
                  onClick={handleReorder}
                  className="flex items-center space-x-2 text-swiggy-orange text-xs font-black uppercase tracking-widest bg-swiggy-orange/5 px-4 py-2 rounded-full hover:bg-swiggy-orange/10 transition-all"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reorder My Usual</span>
                </button>
              )}
            </div>
            <div className="flex overflow-x-auto no-scrollbar space-x-6 pb-4">
              {recommendations.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-64 group cursor-pointer" onClick={() => handleAddToCart(item as any)}>
                  <div className="relative h-40 w-full mb-3 overflow-hidden rounded-2xl">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-swiggy-dark/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                      {item.tag}
                    </div>
                  </div>
                  <h3 className="font-bold text-swiggy-dark text-sm mb-1">{item.name}</h3>
                  <p className="text-[10px] text-swiggy-orange font-bold uppercase tracking-widest mb-1 italic">"{item.reason}"</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-swiggy-dark">₹{item.price}</span>
                    <button className="text-swiggy-orange text-[10px] font-black uppercase tracking-widest border border-swiggy-orange px-3 py-1 rounded hover:bg-swiggy-orange hover:text-white transition-all">
                      Quick Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's on your mind? (Cuisine Navigation) */}
        <div className="mb-12">
          <h2 className="text-xl font-black text-swiggy-dark mb-6">What's on your mind?</h2>
          <div className="flex overflow-x-auto no-scrollbar space-x-6 pb-4">
            {cuisineSections.map((section, i) => (
              <button 
                key={i}
                onClick={() => document.getElementById(`section-${section.title}`)?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-shrink-0 text-center group"
              >
                <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-2 group-hover:shadow-xl transition-all border border-gray-100 overflow-hidden">
                  <img 
                    src={section.image} 
                    alt={section.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-bold text-swiggy-gray group-hover:text-swiggy-dark transition-colors">{section.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Outlet Info (Auto-selected) */}
        {selectedOutlet && (
          <div className="bg-white border rounded-2xl p-6 mb-10 shadow-sm flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 text-swiggy-orange font-bold mb-1">
                <MapPin className="h-4 w-4" />
                <span>Serving from: {selectedOutlet.location}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-swiggy-gray font-bold">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-green-600 fill-current mr-1" />
                  <span className="text-swiggy-dark">{selectedOutlet.rating}</span>
                </div>
                <span>•</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{selectedOutlet.deliveryTime}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <img src="https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=100&q=80" className="h-16 w-16 rounded-xl object-cover shadow-md" alt="Biryani" />
            </div>
          </div>
        )}

        {/* Offers Carousel */}
        {selectedOutlet && (
          <div className="flex overflow-x-auto no-scrollbar space-x-4 mb-10">
            {[
              { title: "60% OFF UPTO ₹120", code: "USE WELCOME60", icon: Percent },
              { title: "FREE DELIVERY", code: "ON ORDERS ABOVE ₹199", icon: Clock },
              { title: "KOLKATA SPECIAL", code: "FLAT ₹50 OFF", icon: Percent },
            ].map((offer, i) => (
              <div key={i} className="flex-shrink-0 border rounded-xl p-4 flex items-center space-x-4 w-64 bg-gradient-to-br from-white to-gray-50">
                <offer.icon className="h-8 w-8 text-swiggy-orange" />
                <div>
                  <p className="text-sm font-black text-swiggy-dark">{offer.title}</p>
                  <p className="text-[10px] text-swiggy-gray font-bold">{offer.code}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Menu Sections */}
        {!selectedOutlet ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-swiggy-dark mb-2">No Outlets Available</h2>
            <p className="text-swiggy-gray font-bold">Please check back later or contact support.</p>
          </div>
        ) : menuLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-swiggy-orange"></div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-swiggy-dark mb-2">No Menu Items Found</h2>
            <p className="text-swiggy-gray font-bold">This outlet hasn't added any dishes yet.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {cuisineSections.map(section => {
              const sectionItems = filteredMenuItems.filter(item => section.categories.includes(item.category));
              if (sectionItems.length === 0) return null;

              return (
                <section key={section.title} id={`section-${section.title}`} className="border-b-8 border-gray-50 pb-12 last:border-b-0 scroll-mt-24">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-swiggy-dark uppercase tracking-wider">{section.title}</h2>
                    <p className="text-xs text-swiggy-gray font-bold mt-1 uppercase tracking-widest">{section.description}</p>
                    <div className="h-1 w-12 bg-swiggy-orange mt-2"></div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {sectionItems.map(item => (
                      <div key={item.id} className="py-8 flex justify-between gap-8 group">
                        <div className="flex-1">
                          <div className="mb-2">
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
                          <h3 className="text-lg font-bold text-swiggy-dark mb-1 group-hover:text-swiggy-orange transition-colors">{item.name}</h3>
                          <p className="text-sm font-bold text-swiggy-dark mb-3">₹{item.price}</p>
                          <p className="text-sm text-swiggy-gray leading-relaxed line-clamp-2">{item.description}</p>
                        </div>

                        <div className="relative w-32 h-32 flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-500" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24">
                            {getItemQuantity(item.id) > 0 ? (
                              <div className="bg-white border shadow-xl rounded-lg flex items-center justify-between p-1">
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
                                className="w-full bg-white border shadow-xl text-green-600 py-2 rounded-lg font-bold hover:bg-gray-50 transition-all uppercase text-xs tracking-wider"
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
              );
            })}

            {otherItems.length > 0 && (
              <section className="border-b-8 border-gray-50 pb-12 last:border-b-0">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-swiggy-dark uppercase tracking-wider">Other Delicacies</h2>
                  <p className="text-xs text-swiggy-gray font-bold mt-1 uppercase tracking-widest">More authentic flavors from Kolkata.</p>
                  <div className="h-1 w-12 bg-swiggy-orange mt-2"></div>
                </div>

                <div className="divide-y divide-gray-100">
                  {otherItems.map(item => (
                    <div key={item.id} className="py-8 flex justify-between gap-8 group">
                      <div className="flex-1">
                        <div className="mb-2">
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
                        <h3 className="text-lg font-bold text-swiggy-dark mb-1 group-hover:text-swiggy-orange transition-colors">{item.name}</h3>
                        <p className="text-sm font-bold text-swiggy-dark mb-3">₹{item.price}</p>
                        <p className="text-sm text-swiggy-gray leading-relaxed line-clamp-2">{item.description}</p>
                      </div>

                      <div className="relative w-32 h-32 flex-shrink-0">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24">
                          {getItemQuantity(item.id) > 0 ? (
                            <div className="bg-white border shadow-xl rounded-lg flex items-center justify-between p-1">
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
                              className="w-full bg-white border shadow-xl text-green-600 py-2 rounded-lg font-bold hover:bg-gray-50 transition-all uppercase text-xs tracking-wider"
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
            )}

            {menuItems.length === 0 && !menuLoading && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-swiggy-dark">No menu items found</h3>
                <p className="text-swiggy-gray mt-2">Please check back later for our delicious menu.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full bg-green-600 text-white p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
          >
            <div className="swiggy-container w-full flex justify-between items-center">
              <div className="font-bold">
                {cartItems.length} Items | ₹{cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
              </div>
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center font-bold uppercase tracking-widest text-sm"
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
