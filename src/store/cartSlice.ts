import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
}

const initialState: CartState = {
  items: [],
  restaurantId: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      if (state.restaurantId && state.restaurantId !== action.payload.restaurantId) {
        // Clear cart if adding from a different restaurant
        state.items = [action.payload];
        state.restaurantId = action.payload.restaurantId;
      } else {
        const existingItem = state.items.find(item => item.id === action.payload.id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.items.push(action.payload);
        }
        state.restaurantId = action.payload.restaurantId;
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      if (state.items.length === 0) {
        state.restaurantId = null;
      }
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter(item => item.id !== action.payload.id);
      }
      if (state.items.length === 0) {
        state.restaurantId = null;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.restaurantId = null;
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
