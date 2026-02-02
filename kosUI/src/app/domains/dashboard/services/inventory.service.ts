import { Injectable } from '@angular/core';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

    private items: Item[] = [
  {
    id: 1,
    code: 'ITEM001',
    name: 'Margherita Pizza',
    from: '08:00',
    to: '12:00',
    category: 'Dinner',
    group: 'Veg',
    price: 250,
    qty: 10,
    sold: 5,
    image: 'assets/food/pizza.jpg',
    enabled: true
  },
  {
    id: 2,
    code: 'ITEM002',
    name: 'Chicken Burger',
    from: '08:00',
    to: '09:00',
    category: 'Snacks',
    group: 'Non-Veg',
    price: 120,
    qty: 5,
    sold: 8,
    image: 'assets/food/burger.jpg',
    enabled: true
  },
      
  {
    id: 3,
    code: 'ITEM003',
    name: 'Pancakes',
    from: '08:00',
    to: '10:00',
    category: 'Breakfast',
    group: 'Veg',
    price: 90,
    qty: 12,
    sold: 2,
    image: 'assets/food/pancake.jpg',
    enabled: true
  }

];

  constructor() {}

  getAllItems(): Item[] {
    return this.items;
  }

  addItem(item: Item) {
    this.items.push(item);
  }

  updateItem(updated: Item) {
    const index = this.items.findIndex(i => i.id === updated.id);

    if (index !== -1) {
      this.items[index] = updated;
    }
  }

  deleteItem(id: number) {
    this.items = this.items.filter(i => i.id !== id);
  }

  toggleItemStatus(id: number) {
    const item = this.items.find(i => i.id === id);

    if (item) {
      item.enabled = !item.enabled;
    }
  }

  restockItem(id: number, qty: number) {
    const item = this.items.find(i => i.id === id);

    if (item && qty > 0) {
      item.qty += qty;
    }
  }

  getInventoryValue(): number {
    return this.items.reduce((t, i) => t + i.price * i.qty, 0);
  }

  getLowStockCount(): number {
    return this.items.filter(i =>
      i.qty > 0 &&
      i.qty <= 5 &&
      i.enabled
    ).length;
  }

  getSoldOutCount(): number {
    return this.items.filter(i =>
      i.qty === 0 &&
      i.enabled
    ).length;
  }

  getDisabledCount(): number {
    return this.items.filter(i => !i.enabled).length;
  }

  filterItems(
    search: string,
    category: string,
    group: string,
    stockView: string
  ): Item[] {

    return this.items.filter(i => {

      if (search &&
        !i.name.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (category !== 'ALL' && i.category !== category)
        return false;

      if (group !== 'ALL' && i.group !== group)
        return false;

      if (stockView === 'LOW')
        return i.qty > 0 && i.qty <= 5;

      if (stockView === 'SOLD')
        return i.qty === 0;

      if (stockView === 'DISABLED')
        return !i.enabled;

      return true;
    });
  }

  sortItems(items: Item[], sortBy: string, order: string): Item[] {

    return [...items].sort((a, b) => {

      let valA: any;
      let valB: any;

      switch (sortBy) {

        case 'PRICE':
          valA = a.price;
          valB = b.price;
          break;

        case 'STOCK':
          valA = a.qty;
          valB = b.qty;
          break;

        case 'CATEGORY':
          valA = a.category.toLowerCase();
          valB = b.category.toLowerCase();
          break;

        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return order === 'ASC' ? -1 : 1;
      if (valA > valB) return order === 'ASC' ? 1 : -1;

      return 0;
    });
  }

  // NEW METHODS FOR DASHBOARD

  getTopSellingItems(): Item[] {
    return [...this.items]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }

  getCategoryDistribution() {
    const total = this.items.length;

    const categories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

    return categories.map(cat => {
      const count = this.items.filter(i => i.category === cat).length;

      return {
        name: cat,
        percent: total ? Math.round((count / total) * 100) : 0
      };
    });
  }
}
