import { HelpCircle, MessageSquare, Phone, Mail, ChevronDown, ShieldCheck, Truck, CreditCard, User, Search, MapPin } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Help() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do I track my order?",
      answer: "Once your order is placed, you can track it in real-time on the Order Confirmation page or through your Profile > Orders section. You'll see updates as the restaurant prepares your food and the rider picks it up.",
      icon: Truck
    },
    {
      question: "What if I have an issue with my order?",
      answer: "If you have any issues with the quality of food, missing items, or delivery delays, please contact our support team immediately through the 'Contact Support' button below or call us at +91 98765 43210.",
      icon: HelpCircle
    },
    {
      question: "How can I cancel my order?",
      answer: "Orders can be cancelled within 60 seconds of placement for a full refund. After that, cancellation depends on whether the restaurant has started preparing your food. You can find the cancel option on the Checkout or Payment pages.",
      icon: ShieldCheck
    },
    {
      question: "What are the available payment methods?",
      answer: "We support multiple payment methods including UPI (PhonePe, Google Pay), Credit/Debit Cards, NetBanking, and Cash on Delivery (COD) for most locations.",
      icon: CreditCard
    },
    {
      question: "How do I update my delivery address?",
      answer: "You can update your delivery address in the Profile > Addresses section or directly on the Checkout page by clicking 'Change' next to the address section.",
      icon: MapPin
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="swiggy-container max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-swiggy-dark mb-4">Help & Support</h1>
          <p className="text-swiggy-gray font-bold uppercase tracking-widest text-sm">We're here to help you 24/7</p>
        </div>

        {/* Search Help */}
        <div className="relative mb-16 max-w-2xl mx-auto">
          <input 
            type="text" 
            placeholder="Search for help..."
            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-6 px-16 text-lg font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange outline-none shadow-sm transition-all"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-swiggy-gray w-6 h-6" />
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 mb-16">
          <h2 className="text-2xl font-black text-swiggy-dark mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-50 last:border-b-0 pb-6 last:pb-0">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-swiggy-orange/10 p-3 rounded-xl text-swiggy-orange group-hover:bg-swiggy-orange group-hover:text-white transition-all">
                      <faq.icon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-black text-swiggy-dark group-hover:text-swiggy-orange transition-colors">{faq.question}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-swiggy-gray transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-4 text-swiggy-gray font-bold leading-relaxed pl-14">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: "Chat with us", icon: MessageSquare, value: "Live Chat Support", color: "text-blue-500" },
            { label: "Call us", icon: Phone, value: "+91 98765 43210", color: "text-green-600" },
            { label: "Email us", icon: Mail, value: "support@kolkatas.kitchen", color: "text-purple-600" }
          ].map((contact, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center hover:shadow-xl transition-all group">
              <div className={`${contact.color} bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                <contact.icon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-black text-swiggy-gray uppercase tracking-widest mb-2">{contact.label}</h3>
              <p className="text-lg font-black text-swiggy-dark">{contact.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
