import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  db, 
  doc, 
  setDoc, 
  getDoc 
} from '../firebase';
import { setUser } from '../store/auth-slice';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthSuccess = async (user: any) => {
    // Check if user exists in Firestore, if not create
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let role: 'customer' | 'restaurant' | 'delivery' | 'admin' = 'customer';
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || name,
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || name)}&background=random`,
        role: 'customer',
        createdAt: new Date().toISOString()
      });
    } else {
      role = userDoc.data().role;
    }

    dispatch(setUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || name,
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || name)}&background=random`,
      role
    }));

    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect') || '/';
    navigate(redirect);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleAuthSuccess(result.user);
    } catch (err: any) {
      console.error('Google Login error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (authMode === 'signin') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthSuccess(result.user);
      } else if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await handleAuthSuccess(result.user);
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset link sent to your email!');
        setTimeout(() => setAuthMode('signin'), 3000);
      }
    } catch (err: any) {
      console.error('Email Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f8f9fa] py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-20 w-20 bg-white rounded-[24px] shadow-xl shadow-swiggy-orange/10 flex items-center justify-center mx-auto mb-6 border border-gray-100"
          >
            <LogIn className="h-10 w-10 text-swiggy-orange" />
          </motion.div>
          <h1 className="text-3xl font-black text-swiggy-dark tracking-tight">Kolkata's Kitchen</h1>
          <p className="text-swiggy-gray font-bold mt-2 uppercase tracking-widest text-[10px]">Authentic Flavors, Delivered</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 p-10 border border-gray-50">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-swiggy-dark">
              {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
            <p className="text-swiggy-gray font-bold text-sm mt-1">
              {authMode === 'signin' ? 'Sign in to your account' : authMode === 'signup' ? 'Join our food community' : 'Enter your email to reset'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center space-x-3 text-red-600 border border-red-100"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-green-50 rounded-2xl flex items-center space-x-3 text-green-600 border border-green-100"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange transition-all"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest">Password</label>
                  {authMode === 'signin' && (
                    <button 
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-swiggy-dark focus:ring-2 focus:ring-swiggy-orange transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-swiggy-orange text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-swiggy-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white px-4 text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-4 bg-white border-2 border-gray-100 py-4 rounded-2xl font-black text-swiggy-dark hover:bg-gray-50 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
              <span>Google</span>
            </button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs font-bold text-swiggy-gray">
              {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="ml-2 text-swiggy-orange font-black uppercase tracking-widest hover:underline"
              >
                {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
