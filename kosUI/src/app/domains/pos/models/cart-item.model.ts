export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  portion?: 'Half' | 'Full';
  addons?: { name: string; price: number }[];
  notes?: string;
  image?: string;
  category?: string;
}
