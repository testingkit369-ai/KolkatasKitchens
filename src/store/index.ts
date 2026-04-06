import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth-slice';
import cartReducer from './cartSlice';
import restaurantReducer from './restaurantSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    restaurant: restaurantReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
