import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { InventoryService } from '../inventory.service';
import { Item } from '../../models/item.model';

type Category = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
type Group = 'Veg' | 'Non-Veg';
type StockView = 'ALL' | 'LOW' | 'SOLD' | 'DISABLED';

@Component({
  selector: 'app-manage-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-inventory.html',
  styleUrls: ['./manage-inventory.css']
})
export class ManageInventoryComponent {

  constructor(private inventoryService: InventoryService) {}

  bulkPreview: any[] = [];
  bulkErrors: string[] = [];
  excelFileName: string = '';

  /* ---------- UI State ---------- */
  sidebarCollapsed = false;
  drawerOpen = false;
  selectedImage: string | null = null;

  /* ---------- UX Enhancements ---------- */
  formErrors: any = {};
  saveSuccess: boolean = false;

  categories: Category[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  /* ---------- Filters ---------- */
  search = '';
  categoryFilter: Category | 'ALL' = 'ALL';
  groupFilter: Group | 'ALL' = 'ALL';
  stockView: StockView = 'ALL';

  /* ---------- Sorting ---------- */
  sortBy: 'NAME' | 'PRICE' | 'STOCK' | 'CATEGORY' = 'NAME';
  sortOrder: 'ASC' | 'DESC' = 'ASC';

  /* ---------- Add/Edit Form ---------- */
  name = '';
  category: Category = 'Breakfast';
  group: Group = 'Veg';
  price: number | null = null;
  qty: number | null = null;
  from = '06:00';
  to = '11:00';

  editingItem: Item | null = null;

  /* ---------- Computed Properties ---------- */

  get soldOutItems(): Item[] {
    return this.viewItems.filter(i => i.qty === 0);
  }

  get totalItems() {
    return this.inventoryService.getAllItems().length;
  }

  get inventoryValue() {
    return this.inventoryService.getInventoryValue();
  }

  get lowStock() {
    return this.inventoryService.getLowStockCount();
  }

  get soldOut() {
    return this.inventoryService.getSoldOutCount();
  }

  get disabled() {
    return this.inventoryService.getDisabledCount();
  }

  get viewItems(): Item[] {
    const filtered = this.inventoryService.filterItems(
      this.search,
      this.categoryFilter,
      this.groupFilter,
      this.stockView
    );

    return this.inventoryService.sortItems(
      filtered,
      this.sortBy,
      this.sortOrder
    );
  }
  activeAddMode: 'SINGLE' | 'BULK' = 'SINGLE';
  /* ---------- UI Actions ---------- */

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  openDrawer() {
    this.drawerOpen = true;
    this.activeAddMode = 'SINGLE'; //default view
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.editingItem = null;
    this.resetForm();
  }

  /* ---------- FORM VALIDATION ---------- */

  validateForm(): boolean {

    this.formErrors = {};

    if (!this.name || this.name.trim().length < 3) {
      this.formErrors.name = 'Item name must be at least 3 characters';
    }

    if (this.price == null || this.price <= 0) {
      this.formErrors.price = 'Price must be greater than 0';
    }

    if (this.qty == null || this.qty < 0) {
      this.formErrors.qty = 'Stock cannot be negative';
    }

    if (!this.from || !this.to) {
      this.formErrors.time = 'Select valid availability time';
    }

    return Object.keys(this.formErrors).length === 0;
  }

  /* ---------- SAVE ITEM ---------- */

  saveItem() {

    if (!this.validateForm()) {
      return;
    }

    if (this.editingItem) {

      const updated: Item = {
        ...this.editingItem,
        name: this.name,
        category: this.category,
        group: this.group,
        price: this.price!,
        qty: this.qty!,
        from: this.from,
        to: this.to,
        image: this.selectedImage || undefined
      };

      this.inventoryService.updateItem(updated);

    } else {

      const newItem: Item = {
        id: Date.now(),
        code: 'ITM-' + Math.floor(1000 + Math.random() * 9000),
        name: this.name,
        category: this.category,
        group: this.group,
        price: this.price!,
        qty: this.qty!,
        enabled: true,
        from: this.from,
        to: this.to,
        image: this.selectedImage || undefined,
        sold: 0
      };

      this.inventoryService.addItem(newItem);
    }

    this.showSuccessToast();
    this.closeDrawer();
  }

  /* ---------- SUCCESS TOAST ---------- */

  showSuccessToast() {
    this.saveSuccess = true;

    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }

  /* ---------- EDIT ITEM ---------- */

  editItem(item: Item) {
    this.editingItem = item;

    this.name = item.name;
    this.category = item.category as Category;
    this.group = item.group as Group;
    this.price = item.price;
    this.qty = item.qty;
    this.from = item.from;
    this.to = item.to;
    this.selectedImage = item.image || null;

    this.drawerOpen = true;
  }

  /* ---------- DELETE ITEM ---------- */

  deleteItem(id: number) {
    const ok = confirm('Delete this item?');
    if (ok) {
      this.inventoryService.deleteItem(id);
    }
  }

  /* ---------- TOGGLE STATUS ---------- */

  toggleItem(item: Item) {
    this.inventoryService.toggleItemStatus(item.id);
  }

  /* ---------- STOCK VALIDATION ---------- */

  validateStock(item: Item) {
    if (item.qty == null || item.qty < 0) {
      item.qty = 0;
    }

    if (item.qty === 0) {
      item.enabled = false;
    }

    this.inventoryService.updateItem(item);
  }

  formatTime(time: string): string {
  if (!time) return '';

  const [hour, minute] = time.split(':').map(Number);

  const period = hour >= 12 ? 'PM' : 'AM';

  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

  /* ---------- BULK UPLOAD (Future Ready) ---------- */

  uploadExcel(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    console.log('Excel uploaded:', file.name);

    input.value = '';
  }

  /* ---------- IMAGE UPLOAD ---------- */

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  /* ---------- RESET FORM ---------- */

  resetForm() {
    this.name = '';
    this.price = null;
    this.qty = null;
    this.selectedImage = null;
    this.category = 'Breakfast';
    this.group = 'Veg';
    this.from = '06:00';
    this.to = '11:00';

    this.formErrors = {};
  }
}
