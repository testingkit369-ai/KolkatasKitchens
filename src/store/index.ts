import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth';
import cartReducer from './cart';
import restaurantReducer from './restaurant';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    restaurant: restaurantReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
