import { db, collection, addDoc, auth, getDocs, deleteDoc, doc } from '../firebase';
import { useState } from 'react';

const OUTLETS = [
  {
    name: "Kolkata's Kitchen - Karol Bagh (Outlet 1)",
    description: "Authentic Kolkata Biryani & Chinese. Serving the heart of New Delhi.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    deliveryTime: "20-30 mins",
    cuisine: ["Biryani", "Kolkata Chinese", "Rolls"],
    ownerId: "system",
    location: "Karol Bagh, Delhi"
  },
  {
    name: "Kolkata's Kitchen - Karol Bagh (Outlet 2)",
    description: "Premium Kolkata delicacies. Authentic taste, affordable prices.",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    deliveryTime: "25-35 mins",
    cuisine: ["Biryani", "Mughlai", "Snacks"],
    ownerId: "system",
    location: "Karol Bagh, Delhi"
  }
];

const MENU_ITEMS = [
  // BIRYANI LINEUP
  {
    name: "Authentic Kolkata Mutton Biryani",
    description: "Slow-cooked fragrant basmati rice with tender mutton, iconic boiled potato, and egg. A royal treat.",
    price: 349,
    image: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani Lineup"
  },
  {
    name: "Kolkata Chicken Biryani (Special)",
    description: "Classic Kolkata style chicken biryani with the legendary potato and egg. Mildly spiced and aromatic.",
    price: 279,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani Lineup"
  },
  // CHINESE LINEUP
  {
    name: "Kolkata Style Chilli Chicken",
    description: "The iconic Tangra-style spicy chilli chicken. Perfect with Hakka noodles.",
    price: 249,
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Kolkata Chinese"
  },
  {
    name: "Chicken Hakka Noodles",
    description: "Street-style Kolkata noodles tossed with fresh veggies and chicken.",
    price: 189,
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Kolkata Chinese"
  },
  // SNACKS & MORE
  {
    name: "Kolkata Egg Chicken Roll",
    description: "Flaky paratha wrapped with spicy chicken and egg. The ultimate Kolkata street food.",
    price: 129,
    image: "https://images.unsplash.com/photo-1626777552726-4a6b547b4e5c?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Rolls & Wraps"
  },
  {
    name: "Steamed Chicken Momos (8 Pcs)",
    description: "Juicy chicken fillings in thin wrappers, served with spicy red chutney.",
    price: 149,
    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Momos"
  },
  {
    name: "Classic Chicken Burger",
    description: "Crispy chicken patty with fresh lettuce and premium mayo.",
    price: 159,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Burgers & Sandwiches"
  },
  {
    name: "Authentic Kolkata Rossogulla (2 Pcs)",
    description: "Soft, spongy, and juicy cottage cheese balls in light sugar syrup. The pride of Kolkata.",
    price: 79,
    image: "https://images.unsplash.com/photo-1589113103503-49673cbb910e?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Desserts"
  },
  {
    name: "Masala Cold Drink",
    description: "Refreshing cola with a special Kolkata spice twist.",
    price: 59,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Drinks"
  }
];

export default function SeedData() {
  const [loading, setLoading] = useState(false);

  const clearData = async () => {
    if (!auth.currentUser) {
      alert('Please sign in first.');
      return;
    }
    if (!confirm('This will delete all existing outlets and menu items. Are you sure?')) return;
    
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'outlets'));
      for (const resDoc of querySnapshot.docs) {
        const menuSnapshot = await getDocs(collection(db, 'outlets', resDoc.id, 'menu'));
        for (const menuItem of menuSnapshot.docs) {
          await deleteDoc(doc(db, 'outlets', resDoc.id, 'menu', menuItem.id));
        }
        await deleteDoc(doc(db, 'outlets', resDoc.id));
      }
      alert('Existing data cleared successfully!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const seed = async () => {
    if (!auth.currentUser) {
      alert('Please sign in first to seed data.');
      return;
    }
    setLoading(true);
    try {
      for (const outlet of OUTLETS) {
        const resRef = await addDoc(collection(db, 'outlets'), outlet);
        for (const item of MENU_ITEMS) {
          await addDoc(collection(db, 'outlets', resRef.id, 'menu'), {
            ...item,
            outlet_id: resRef.id
          });
        }
      }
      alert('Kolkata\'s Kitchen data seeded successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Error seeding data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-swiggy-orange/5 border-2 border-dashed border-swiggy-orange/20 rounded-2xl text-center my-8">
      <div className="flex items-center justify-center space-x-2 mb-4">
        <span className="bg-swiggy-dark text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Admin</span>
        <p className="text-swiggy-dark font-black text-lg">Initialize Kolkata's Kitchen Menu & Outlets</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={seed}
          disabled={loading}
          className="bg-swiggy-orange text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Setup Brand Data'}
        </button>
        <button
          onClick={clearData}
          disabled={loading}
          className="bg-white border-2 border-gray-200 text-swiggy-gray px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          {loading ? 'Clearing...' : 'Clear Existing Data'}
        </button>
      </div>
    </div>
  );
}
