export type Category = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

export type Group = 'Veg' | 'Non-Veg';

export interface Item {

  // Core fields used by Manage Inventory
  id: number | null;
  name: string;

  from: string;     // maybe supplier or source
  to: string;       // maybe destination / location

  // Classification
  category: string[];
  group: 'Veg' | 'Non-Veg';

  // Stock & Pricing
  price: number;
  qty: number;
  // UI related
  image?: string;

  enabled: boolean;
  addedToCartStatus?: boolean;
}


