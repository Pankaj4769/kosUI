import { Injectable } from '@angular/core';
import { InventoryService } from './inventory.service';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private inventory: InventoryService) {}

//   getTotalRevenue() {
//     return this.inventory.getAllItems()
//       .reduce((sum: number, i: Item) => sum + (i.price * i.sold), 0);
//   }

//   getTotalItems() {
//     return this.inventory.getAllItems().length;
//   }

//   getLowStockCount() {
//     return this.inventory.getAllItems()
//       .filter((i: Item) => i.qty < 5).length;
//   }

//   getSoldOutCount() {
//     return this.inventory.getAllItems()
//       .filter((i: Item) => i.qty === 0).length;
//   }

//   getTopSelling() {
//     return [...this.inventory.getAllItems()]
//       .sort((a, b) => b.sold - a.sold)
//       .slice(0, 5);
//   }

//   getCategoryStats() {
//     const items = this.inventory.getAllItems();

//     const categories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

//     return categories.map(cat => {
//       const total = items.length;
//       const count = items.filter((i: Item) => i.category === cat).length;

//       return {
//         name: cat,
//         percent: total ? Math.round((count / total) * 100) : 0
//       };
//     });
//   }
}
