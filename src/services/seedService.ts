import { db, collection, addDoc, getDocs, query, limit, doc, setDoc, serverTimestamp } from '../firebase';

const OUTLETS = [
  {
    id: 'karol-bagh-01',
    name: "Kolkata's Kitchen - Karol Bagh",
    description: "The heart of authentic Kolkata street food in Central Delhi. Famous for our Mutton Biryani and Egg Rolls.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    deliveryTime: "25-35",
    cuisine: ["Biryani", "Kolkata Chinese", "Rolls"],
    ownerId: "system_admin",
    location: "12A/34, WEA, Karol Bagh, New Delhi - 110005"
  },
  {
    id: 'cr-park-02',
    name: "Kolkata's Kitchen - CR Park",
    description: "Mini Kolkata in Delhi. Serving the most authentic Fish Fry and Luchi Alur Dom.",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    deliveryTime: "30-40",
    cuisine: ["Bengali Thali", "Fish Fry", "Sweets"],
    ownerId: "system_admin",
    location: "Market 1, Chittaranjan Park, New Delhi - 110019"
  },
  {
    id: 'dwarka-03',
    name: "Kolkata's Kitchen - Dwarka",
    description: "Bringing the flavors of Park Street to West Delhi. Best known for our Chelo Kababs.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    deliveryTime: "20-30",
    cuisine: ["Kababs", "Continental", "Biryani"],
    ownerId: "system_admin",
    location: "Sector 12, Dwarka, New Delhi - 110075"
  }
];

const MENU_ITEMS = [
  {
    outlet_id: 'karol-bagh-01',
    name: "Kolkata Mutton Biryani",
    description: "Fragrant long-grain rice cooked with tender mutton, a boiled egg, and the signature Kolkata potato.",
    price: 450,
    image: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani Lineup"
  },
  {
    outlet_id: 'karol-bagh-01',
    name: "Double Chicken Egg Roll",
    description: "Classic Kolkata street style roll with double chicken filling and a crispy paratha.",
    price: 180,
    image: "https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Rolls & Wraps"
  },
  {
    outlet_id: 'karol-bagh-01',
    name: "Vegetable Chop (2 pcs)",
    description: "Deep-fried beetroot and vegetable croquettes, served with Kasundi.",
    price: 120,
    image: "https://images.unsplash.com/photo-1601050690597-df056fb01793?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    category: "Kolkata Chinese"
  },
  {
    outlet_id: 'cr-park-02',
    name: "Bhetki Fish Fry",
    description: "Pure Bhetki fillet crumb-fried to perfection. Served with mustard sauce (Kasundi).",
    price: 280,
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani Lineup"
  },
  {
    outlet_id: 'cr-park-02',
    name: "Kosha Mangsho with Luchi",
    description: "Slow-cooked spicy mutton curry served with 4 fluffy deep-fried Luchis.",
    price: 550,
    image: "https://images.unsplash.com/photo-1606491956689-2ea8c5119c85?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    category: "Biryani Lineup"
  }
];

export async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // 1. Seed Outlets
    for (const outlet of OUTLETS) {
      const outletRef = doc(db, 'outlets', outlet.id);
      await setDoc(outletRef, outlet);
      console.log(`Seeded outlet: ${outlet.name}`);
    }

    // 2. Seed Menu Items
    for (const item of MENU_ITEMS) {
      const menuRef = collection(db, 'outlets', item.outlet_id, 'menu');
      // Check if item already exists to avoid duplicates
      const q = query(menuRef, limit(1));
      const snapshot = await getDocs(q);
      
      // For simplicity in this script, we'll just add them
      // In a real app, you'd check for existing IDs
      await addDoc(menuRef, item);
      console.log(`Seeded menu item: ${item.name} for ${item.outlet_id}`);
    }

    // 3. Seed Initial Users (Roles)
    const INITIAL_USERS = [
      {
        uid: 'rider-01',
        email: 'rider@kolkatas-kitchen.com',
        displayName: 'Rider One',
        role: 'rider',
        outlet_id: 'karol-bagh-01',
        createdAt: serverTimestamp()
      },
      {
        uid: 'manager-01',
        email: 'manager@kolkatas-kitchen.com',
        displayName: 'Outlet Manager',
        role: 'outlet_manager',
        outlet_id: 'karol-bagh-01',
        createdAt: serverTimestamp()
      }
    ];

    for (const user of INITIAL_USERS) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, user);
      console.log(`Seeded user: ${user.displayName} (${user.role})`);
    }

    console.log("Database seeding completed successfully!");
    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Error seeding database:", error);
    return { success: false, message: "Error seeding database: " + (error as Error).message };
  }
}
