import { 
  Component, 
  Output, 
  EventEmitter, 
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
  OnDestroy  // NEW: Added for cleanup
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

// Models
import { CartItem } from '../../models/cart-item.model';
import { Item } from '../../../dashboard/models/item.model';
import { InventoryService } from '../../../dashboard/services/inventory.service';
import { CartService } from '../../services/cart.service';
import { Observable } from 'rxjs/internal/Observable';
import { of, Subscription } from 'rxjs';

/* ================= TYPES ================= */

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  available: boolean;
  portions?: ('Half' | 'Full')[];
  addons?: Addon[];
  tags?: string[];
  popular?: boolean;
  spicy?: boolean;
  vegetarian?: boolean;
}

export interface Addon {
  name: string;
  price: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

/* ================= COMPONENT ================= */

@Component({
  selector: 'app-menu-area',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule
  ],
  templateUrl: './menu-area.component.html',
  styleUrls: ['./menu-area.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuAreaComponent implements OnInit, OnDestroy  {  // NEW: Added OnDestroy

  /* ================= OUTPUTS ================= */

  @Input() cart: CartItem[] = [];

  @Output() itemAdd = new EventEmitter<Omit<CartItem, 'qty'>>();
  @Output() itemRemove = new EventEmitter<number>();
  @Output() cartUpdate = new EventEmitter<CartItem[]>();

  /* ================= STATE ================= */

  menuItems: Item[] = [];
  menuItems$?: Observable<Item[]> | null = null;  // NEW: For async pipe
  categories: MenuCategory[] = [];
  filteredItems: Item[] = [];
  
  selectedCategory = 'all';
  searchQuery = '';
  selectedTags: string[] = [];
  
  // UI States
  loading = false;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'price' | 'popular' = 'name';

  // Available tags
  availableTags = ['Veg', 'Non-Veg'];

  cartItemStatus: boolean = false;
  cartItemQty: number = 0;
  private dataSubscription?: Subscription;  // NEW: Track subscription for cleanup

  /* ================= CONSTRUCTOR ================= */

constructor(
  private cdr: ChangeDetectorRef,
  private inventoryservice: InventoryService,
  private cartService: CartService
) {}

/* ================= LIFECYCLE ================= */

ngOnInit(): void {
  this.inventoryservice.getItemlist();
  this.loadMenuData();
}

// NEW: Cleanup subscription on destroy
ngOnDestroy(): void {
  if (this.dataSubscription) {
    this.dataSubscription.unsubscribe();
  }
}
  /* ================= INITIALIZATION ================= */

  private loadMenuData(): void {
    this.loading = true;
    this.error = null;

    // NEW: Polling approach for async service data
    const checkAndLoadData = () => {
      const items = this.getMockMenuItems();
      
      if (items && items.length > 0) {
        // Data is ready, process it
        try {
          // Mock data - Replace with actual API call
          this.menuItems = this.getMockMenuItems();
          this.menuItems.forEach(item => {
            item.qty = 0;
          });
          this.menuItems$ = of(this.menuItems); // NEW: Wrap for async pipe
          this.categories = this.generateCategories();
          this.applyFilters();
        } catch (err) {
          console.error('Failed to load menu:', err);
          this.error = 'Failed to load menu items';
        } finally {
          this.loading = false;
          this.cdr.detectChanges(); // FIXED: Changed from markForCheck() to detectChanges()
        }
      } else {
        // Data not ready yet, check again
        setTimeout(() => checkAndLoadData(), 100);  // NEW: Retry every 100ms
      }
    };
    checkAndLoadData();
  }

  private getMockMenuItems(): Item[] {
    return this.inventoryservice.getAllItems();
  }

  private generateCategories(): MenuCategory[] {
    const categoryCounts = new Map<string, number>();
    categoryCounts.set('Breakfast', 3);
    categoryCounts.set('Lunch', 3);
    categoryCounts.set('Snacks', 3);
    categoryCounts.set('Dinner', 3);

    const categoryIcons: { [key: string]: string } = {
      'Starters': 'restaurant_menu',
      'Main Course': 'dinner_dining',
      'Rice': 'rice_bowl',
      'Breads': 'bakery_dining',
      'Beverages': 'local_cafe',
      'Desserts': 'cake'
    };

    const categories: MenuCategory[] = [
      {
        id: 'all',
        name: 'All Items',
        icon: 'grid_view',
        itemCount: this.menuItems.length
      }
    ];

    categoryCounts.forEach((count, category) => {
      categories.push({
        id: category.toLowerCase().replace(/\s+/g, '-'),
        name: category,
        icon: categoryIcons[category] || 'restaurant',
        itemCount: count
      });
    });

    return categories;
  }

  /* ================= FILTERING ================= */

  applyFilters(): void {
    let filtered = [...this.menuItems];

    // Category filter
    if (this.selectedCategory !== 'all') {
      const categoryName = this.categories
        .find(c => c.id === this.selectedCategory)?.name;
      
      if (categoryName) {
        filtered = filtered.filter(item => item.category[0] === categoryName);
      }
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category[0].toLowerCase().includes(query)
      );
    }

    // Tag filters
    if (this.selectedTags.length == 1) {
      filtered = filtered.filter(item => {
        if (this.selectedTags.includes('Veg') && !(item.group=='Veg')) return false;
        if (this.selectedTags.includes('Non-Veg') && !(item.group=='Non-Veg')) return false;
        return true;
      });
    }

    // Availability filter
    filtered = filtered.filter(item => item.enabled);

    // Sorting
    this.applySorting(filtered);

    this.filteredItems = filtered;
    this.menuItems$ = of(this.filteredItems);  // NEW: Update observable for async pipe
    this.cdr.markForCheck();
  }

  private applySorting(items: Item[]): void {
    switch (this.sortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        items.sort((a, b) => a.price - b.price);
        break;
    }
  }

  /* ================= CATEGORY SELECTION ================= */

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.applyFilters();
  }

  /* ================= SEARCH ================= */

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  /* ================= TAG FILTERS ================= */

  toggleTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.applyFilters();
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  clearAllFilters(): void {
    this.selectedTags = [];
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  /* ================= SORTING ================= */

  changeSortBy(sortBy: 'name' | 'price' | 'popular'): void {
    this.sortBy = sortBy;
    this.applyFilters();
  }

  /* ================= VIEW MODE ================= */

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  /* ================= ADD TO CART ================= */

  quickAddItem(item: Item, portion?: 'Half' | 'Full'): void {
    if(item.id != null){
    const cartItem: Omit<CartItem, 'qty'> = {
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category[0],
      image: item.image,
      addedToCartStatus: true,
    };
    item.addedToCartStatus = true;
    item.qty += 1;
    this.itemAdd.emit(cartItem);
    this.cdr.markForCheck();  // NEW: Added to update item UI immediately
  }
  }

  addItemWithOptions(item: Item): void {

      this.quickAddItem(item);
  }

  incrementQuantity(item: Item): void {
    this.quickAddItem(item);
  }

  decrementQuantity(item: Item): void {

    if(item.qty == 1){
      item.addedToCartStatus = false;
    }

    if(item.id != null && item.qty >= 0){
      item.qty -= 1;
      this.cartService.decrementItem(item.id);
    }

    this.cdr.markForCheck();  // NEW: Added to update item UI immediately
 
    //this.cartUpdate.emit(updatedCart);
  }

  /* ================= ITEM MANAGEMENT ================= */

  removeItem(itemId: number | null): void {
    if(itemId != null){
    this.itemRemove.emit(itemId);
    }
  }




  /* ================= HELPERS ================= */

  getItemBadges(item: Item): string[] {
    const badges: string[] = [];
    if (item.group == 'Veg') badges.push('Veg');
    if (item.group == 'Non-Veg') badges.push('Non-Veg');
    return badges;
  }

  getBadgeIcon(badge: string): string {
    switch (badge) {
      //case 'Popular': return 'star';
      case 'Veg': return 'eco';
      case 'Non-Veg': return 'local_fire_department';
      default: return 'label';
    }
  }

  trackByItemId(index: number, item: MenuItem): number {
    return item.id;
  }

  trackByCategoryId(index: number, category: MenuCategory): string {
    return category.id;
  }

  /* ================= REFRESH ================= */

  refreshMenu(): void {
    this.loadMenuData();
  }
}
