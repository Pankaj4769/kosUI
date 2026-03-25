import {  ChangeDetectorRef, Injectable } from '@angular/core';
import { Item } from '../models/item.model';
import { HttpClient } from '@angular/common/http';
import { MessageResponse } from '../models/message.model';
import { BASE_URL } from "../../../apiUrls";
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  baseUrl= BASE_URL;

    private items: Item[] = [];

  constructor(
    private readonly httpclient: HttpClient,
    private authService: AuthService
  ) {}

  getAllItems(): Item[] {

    return this.items;

  }

  populateItems(items: Item[]){
    this.items = [...items];
  }

  getItemlist(){
     return this.httpclient.get<Item[]>(this.baseUrl+'/getAllItems/'+this.authService.currentUser?.restaurantId);
  }
  addItem(item: Item) {

    return this.httpclient.post<Item>(this.baseUrl+'/addItem',item);
  }

  updateItem(updated: Item) {
    return this.httpclient.patch<Item>(this.baseUrl+'/updateItem',updated);
    
  }

  deleteItem(id: number | null) {
    return this.httpclient.delete<MessageResponse>(this.baseUrl+'/deleteItemById/'+id);
  }

  bulkAddItems(items: Item[]) {
    return this.httpclient.post<Item[]>(this.baseUrl+'/bulkAddItems', items);
  }

  toggleItemStatus(id: number|null, status:boolean) {
    this.httpclient.patch<Item>(this.baseUrl+'/updateItemStatus/'+id+'/'+status,null).subscribe(res=>{
      let itm = res;
      const item = this.items.find(i => i.id === id);

    if (item) {
      item.enabled = itm.enabled;
    }
    });
  }

  restockItem(updated: Item) {
    this.httpclient.patch<Item>(this.baseUrl+'/restockItem',updated).subscribe(res=>{

      let itm = res;
      const index = this.items.findIndex(i => i.id === updated.id);

      if (index !== -1) {
        this.items[index] = updated;
      }
    });
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

      if (category !== 'ALL' && !i.category.includes(category))
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
          valA = a.category.length;
          valB = b.category.length;
          break;
        case 'NAME':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
  

        default:
          valA = a.id;
          valB = b.id;
      }

      if (valA < valB) return order === 'ASC' ? -1 : 1;
      if (valA > valB) return order === 'ASC' ? 1 : -1;

      return 0;
    });
  }

  // NEW METHODS FOR DASHBOARD

  // getTopSellingItems(): Item[] {
  //   return [...this.items]
  //     .sort((a, b) => b.sold - a.sold)
  //     .slice(0, 5);
  // }

  // getCategoryDistribution() {
  //   const total = this.items.length;

  //   const categories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  //   return categories.map(cat => {
  //     const count = this.items.filter(i => i.category === cat).length;

  //     return {
  //       name: cat,
  //       percent: total ? Math.round((count / total) * 100) : 0
  //     };
  //   });
  // }
}
