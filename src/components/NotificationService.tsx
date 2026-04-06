import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { collectionGroup, query, where, onSnapshot, db, OperationType, handleFirestoreError } from '../firebase';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Sound URLs
const NOTIFICATION_SOUNDS = {
  confirmed: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  preparing: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  'out-for-delivery': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  delivered: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
};

export default function NotificationService() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
  const prevOrdersStatus = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    const q = query(collectionGroup(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const order = change.doc.data();
        const orderId = change.doc.id;
        const status = order.status;

        if (change.type === 'modified') {
          const oldStatus = prevOrdersStatus.current[orderId];
          if (oldStatus !== status) {
            handleStatusChange(status, orderId);
          }
        }
        prevOrdersStatus.current[orderId] = status;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = (status: string, orderId: string) => {
    let title = '';
    let message = '';

    switch (status) {
      case 'confirmed':
        title = 'Order Confirmed!';
        message = `Your order #${orderId.slice(-6).toUpperCase()} has been accepted by the restaurant.`;
        break;
      case 'preparing':
        title = 'Preparing Food';
        message = 'The chef is working their magic on your meal!';
        break;
      case 'out-for-delivery':
        title = 'Out for Delivery!';
        message = 'Your rider is on the way with your hot meal.';
        break;
      case 'delivered':
        title = 'Order Delivered!';
        message = 'Enjoy your meal! Please rate your experience.';
        break;
    }

    if (title) {
      playSound(status);
      showNotification(title, message);
    }
  };

  const playSound = (status: string) => {
    const soundUrl = NOTIFICATION_SOUNDS[status as keyof typeof NOTIFICATION_SOUNDS];
    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const showNotification = (title: string, message: string) => {
    setNotification({ title, message });
    
    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed top-20 right-4 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-orange-100 p-4 flex items-start space-x-4"
        >
          <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="h-6 w-6 text-kolkata-red" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900">{notification.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
