import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Smartphone } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { clearCart } from '../store/cart.ts';
import axios from 'axios';

export default function PaymentMock() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const outletId = searchParams.get('outletId');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handlePayment = async () => {
    if (!orderId || !outletId) return;
    setStatus('processing');

    // Simulate network delay
    setTimeout(async () => {
      try {
        // Call the server-side callback to confirm payment
        const response = await axios.post('/api/payments/callback', {
          orderId,
          outletId,
          status: 'SUCCESS',
          transactionId: `TXN_${Date.now()}`
        });

        if (response.data.status === 'ok') {
          setStatus('success');
          dispatch(clearCart());

          // Redirect to confirmation page after a short delay
          setTimeout(() => {
            navigate(`/order-confirmation/${outletId}/${orderId}`);
          }, 2000);
        } else {
          alert("Payment confirmation failed on server.");
          setStatus('idle');
        }
      } catch (error) {
        console.error("Error confirming payment:", error);
        alert("An error occurred during payment confirmation.");
        setStatus('idle');
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-purple-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-6 w-6" />
            <span className="font-bold text-lg">PhonePe</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-200">Amount to pay</p>
            <p className="text-xl font-bold">₹{amount}</p>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-gray-500 text-sm font-medium mb-4 uppercase tracking-wider">Payment Options</h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 border-2 border-purple-100 rounded-2xl bg-purple-50">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center mr-4 shadow-sm">
                  <CreditCard className="h-6 w-6 text-purple-700" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">UPI / Cards / NetBanking</p>
                  <p className="text-xs text-gray-500">Secure payment via PhonePe</p>
                </div>
                <div className="h-6 w-6 rounded-full border-4 border-purple-700" />
              </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={status !== 'idle'}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition-all ${
              status === 'success' ? 'bg-green-600' : 'bg-purple-700 hover:bg-purple-800'
            } disabled:opacity-70`}
          >
            {status === 'idle' && `Pay ₹${amount}`}
            {status === 'processing' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
          </button>

          <button
            onClick={() => navigate(`/cancellation?orderId=${orderId}`)}
            disabled={status !== 'idle'}
            className="w-full mt-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-all"
          >
            Cancel Payment
          </button>

          <div className="mt-8 flex items-center justify-center space-x-2 text-gray-400 text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>100% Safe & Secure Payments</span>
          </div>

          <div className="mt-4 text-center">
            <img
              src="https://www.phonepe.com/en/assets/images/phonepe-logo.svg"
              alt="PhonePe"
              className="h-4 mx-auto opacity-30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
