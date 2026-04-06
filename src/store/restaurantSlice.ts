import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  deliveryTime: string;
  cuisine: string[];
  ownerId: string;
  location: string;
}

interface RestaurantState {
  restaurants: Restaurant[];
  loading: boolean;
}

const initialState: RestaurantState = {
  restaurants: [],
  loading: false,
};

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {
    setRestaurants: (state, action: PayloadAction<Restaurant[]>) => {
      state.restaurants = action.payload;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setRestaurants, setLoading } = restaurantSlice.actions;
export default restaurantSlice.reducer;
