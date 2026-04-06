import { Percent, Clock, Tag, ChevronRight, Gift } from 'lucide-react';
import { motion } from 'motion/react';

export default function OffersPage() {
  const offers = [
    {
      title: "60% OFF UPTO ₹120",
      code: "WELCOME60",
      description: "Valid on orders above ₹159",
      icon: Percent,
      color: "bg-swiggy-orange"
    },
    {
      title: "FREE DELIVERY",
      code: "FREEDEL",
      description: "On orders above ₹199",
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "FLAT ₹50 OFF",
      code: "KOLKATA50",
      description: "Special offer for Kolkata's Kitchen",
      icon: Tag,
      color: "bg-green-600"
    },
    {
      title: "BUY 1 GET 1 FREE",
      code: "BOGO",
      description: "Valid on selected Biryani items",
      icon: Gift,
      color: "bg-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="swiggy-container max-w-4xl">
        <div className="mb-12">
          <h1 className="text-3xl font-black text-swiggy-dark mb-2">Offers for you</h1>
          <p className="text-swiggy-gray font-bold uppercase tracking-widest text-xs">Explore top deals and coupons</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`${offer.color} p-4 rounded-2xl text-white shadow-lg`}>
                  <offer.icon className="w-8 h-8" />
                </div>
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 px-4 py-2 rounded-xl">
                  <p className="text-xs font-black text-swiggy-dark tracking-widest">{offer.code}</p>
                </div>
              </div>

              <h3 className="text-xl font-black text-swiggy-dark mb-2 group-hover:text-swiggy-orange transition-colors">{offer.title}</h3>
              <p className="text-sm text-swiggy-gray font-bold mb-6">{offer.description}</p>

              <button className="w-full flex items-center justify-between text-swiggy-orange font-black uppercase text-xs tracking-widest group-hover:translate-x-2 transition-transform">
                <span>Copy Code</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 bg-swiggy-dark rounded-3xl p-12 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-4">Refer & Earn ₹100</h2>
            <p className="text-swiggy-gray font-bold mb-8 max-w-md mx-auto">Invite your friends to Kolkata's Kitchen and get ₹100 off on your next order when they place their first order.</p>
            <button className="bg-swiggy-orange text-white px-12 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:shadow-2xl transition-all">
              Invite Friends
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-swiggy-orange/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-swiggy-orange/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        </div>
      </div>
    </div>
  );
}
