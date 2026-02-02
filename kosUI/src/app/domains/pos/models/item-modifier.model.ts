export interface Addon {
  name: string;
  price: number;
}

export interface ItemModifier {
  portion: 'Half' | 'Full';
  addons: Addon[];
}
