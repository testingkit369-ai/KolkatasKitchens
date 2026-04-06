/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { auth, onAuthStateChanged, db, doc, getDoc } from './firebase';
import { setUser, setLoading } from './store/auth';
import { RootState } from './store/index';

// Components
import Navbar from './components/Navbar';
import NotificationService from './components/NotificationService';

// Pages
import Home from './pages/Home';
import RestaurantDetails from './pages/RestaurantDetails';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import PaymentMock from './pages/PaymentMock';
import RiderDashboard from './pages/RiderDashboard';
import Profile from './pages/Profile';
import Cancellation from './pages/Cancellation';
import Offers from './pages/Offers';
import Help from './pages/Help';
import Admin from './pages/Admin';
import Rider from './pages/Rider';
import Kitchen from './pages/Kitchen';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <NotificationService />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const { loading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log("App.tsx: Setting up onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("App.tsx: onAuthStateChanged fired, user:", firebaseUser?.uid);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            dispatch(setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: userData.role || 'customer',
              outlet_id: userData.outlet_id
            }));
          } else {
            // Fallback if doc doesn't exist yet
            dispatch(setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'customer'
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          dispatch(setUser(null));
        }
      } else {
        dispatch(setUser(null));
      }
      console.log("App.tsx: Setting loading to false");
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-kolkata-red border-solid mx-auto mb-4"></div>
          <p className="text-kolkata-red font-serif font-bold text-2xl italic">Kolkata's Kitchen</p>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">Authentic Taste of Bengal</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/payment-mock" element={<PaymentMock />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/restaurant/:id" element={<RestaurantDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
                <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/login?redirect=/checkout" />} />
                <Route path="/order-confirmation/:outletId/:orderId" element={<OrderConfirmation />} />
                <Route path="/rider-dashboard/:id" element={<RiderDashboard />} />
                <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
                <Route path="/cancellation" element={<Cancellation />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/help" element={<Help />} />
                <Route path="/admin" element={user?.email === 'testingkit369@gmail.com' ? <Admin /> : <Navigate to="/" />} />
                <Route path="/kitchen" element={user?.role === 'outlet_manager' || user?.role === 'admin' || user?.email === 'testingkit369@gmail.com' ? <Kitchen /> : <Navigate to="/" />} />
                <Route path="/rider" element={<Rider />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

