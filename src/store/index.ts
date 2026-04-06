import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth.ts';
import cartReducer from './cart.ts';
import restaurantReducer from './restaurant.ts';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    restaurant: restaurantReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
