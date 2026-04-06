import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, HelpCircle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function Cancellation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <XCircle className="w-12 h-12 text-red-500" />
        </motion.div>

        <h1 className="text-3xl font-black text-swiggy-dark mb-4">Order Cancelled</h1>
        <p className="text-swiggy-gray font-bold mb-8">
          {orderId ? `Your order #${orderId.slice(-6)} has been successfully cancelled.` : 'Your order has been cancelled.'}
        </p>

        <div className="bg-gray-50 rounded-3xl p-8 mb-8 text-left">
          <h3 className="font-black text-swiggy-dark mb-4">What happens next?</h3>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <ArrowLeft className="w-4 h-4 text-swiggy-orange" />
              </div>
              <div>
                <p className="text-sm font-black text-swiggy-dark">Refund Processed</p>
                <p className="text-xs text-swiggy-gray font-bold">If you paid online, the refund will be credited to your original payment method within 5-7 business days.</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <HelpCircle className="w-4 h-4 text-swiggy-orange" />
              </div>
              <div>
                <p className="text-sm font-black text-swiggy-dark">Need Help?</p>
                <p className="text-xs text-swiggy-gray font-bold">Our support team is available 24/7 for any queries regarding your cancellation.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-swiggy-orange text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:shadow-lg transition-all"
          >
            Go to Homepage
          </button>
          <button
            onClick={() => navigate('/help')}
            className="w-full flex items-center justify-center space-x-2 text-swiggy-gray font-bold text-xs uppercase tracking-widest hover:text-swiggy-dark transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
