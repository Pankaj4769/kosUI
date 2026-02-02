import { 
  Component, 
  Output, 
  EventEmitter, 
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
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
export class MenuAreaComponent implements OnInit {

  /* ================= OUTPUTS ================= */

  @Output() itemAdd = new EventEmitter<Omit<CartItem, 'qty'>>();

  /* ================= STATE ================= */

  menuItems: MenuItem[] = [];
  categories: MenuCategory[] = [];
  filteredItems: MenuItem[] = [];
  
  selectedCategory = 'all';
  searchQuery = '';
  selectedTags: string[] = [];
  
  // UI States
  loading = false;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'price' | 'popular' = 'name';

  // Available tags
  availableTags = ['Vegetarian', 'Spicy', 'Popular', 'New'];

  /* ================= CONSTRUCTOR ================= */

  constructor(private cdr: ChangeDetectorRef) {}

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.loadMenuData();
  }

  /* ================= INITIALIZATION ================= */

  private loadMenuData(): void {
    this.loading = true;
    this.error = null;

    try {
      // Mock data - Replace with actual API call
      this.menuItems = this.getMockMenuItems();
      this.categories = this.generateCategories();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load menu:', err);
      this.error = 'Failed to load menu items';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private getMockMenuItems(): MenuItem[] {
    return [
      // Starters
      {
        id: 1,
        name: 'Paneer Tikka',
        category: 'Starters',
        price: 249,
        description: 'Grilled cottage cheese marinated in spices',
        available: true,
        portions: ['Half', 'Full'],
        addons: [
          { name: 'Extra Cheese', price: 30 },
          { name: 'Mint Chutney', price: 20 }
        ],
        tags: ['Vegetarian', 'Popular'],
        popular: true,
        vegetarian: true
      },
      {
        id: 2,
        name: 'Chicken 65',
        category: 'Starters',
        price: 299,
        description: 'Spicy fried chicken with curry leaves',
        available: true,
        portions: ['Half', 'Full'],
        tags: ['Spicy', 'Popular'],
        popular: true,
        spicy: true
      },
      {
        id: 3,
        name: 'French Fries',
        category: 'Starters',
        price: 129,
        description: 'Crispy golden fries',
        available: true,
        addons: [
          { name: 'Cheese Dip', price: 40 },
          { name: 'Peri Peri Seasoning', price: 20 }
        ],
        tags: ['Vegetarian'],
        vegetarian: true
      },

      // Main Course
      {
        id: 4,
        name: 'Butter Chicken',
        category: 'Main Course',
        price: 349,
        description: 'Creamy tomato-based curry with tender chicken',
        available: true,
        portions: ['Half', 'Full'],
        addons: [
          { name: 'Extra Gravy', price: 50 },
          { name: 'Butter Naan', price: 40 }
        ],
        tags: ['Popular'],
        popular: true
      },
      {
        id: 5,
        name: 'Paneer Butter Masala',
        category: 'Main Course',
        price: 299,
        description: 'Rich and creamy cottage cheese curry',
        available: true,
        portions: ['Half', 'Full'],
        tags: ['Vegetarian', 'Popular'],
        popular: true,
        vegetarian: true
      },
      {
        id: 6,
        name: 'Dal Makhani',
        category: 'Main Course',
        price: 199,
        description: 'Slow-cooked black lentils in creamy gravy',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },

      // Rice & Breads
      {
        id: 7,
        name: 'Veg Biryani',
        category: 'Rice',
        price: 249,
        description: 'Fragrant basmati rice with mixed vegetables',
        available: true,
        addons: [
          { name: 'Raita', price: 30 },
          { name: 'Extra Gravy', price: 40 }
        ],
        tags: ['Vegetarian', 'Popular'],
        popular: true,
        vegetarian: true
      },
      {
        id: 8,
        name: 'Chicken Biryani',
        category: 'Rice',
        price: 299,
        description: 'Aromatic rice layered with spiced chicken',
        available: true,
        addons: [
          { name: 'Raita', price: 30 },
          { name: 'Extra Chicken', price: 80 }
        ],
        tags: ['Popular'],
        popular: true
      },
      {
        id: 9,
        name: 'Garlic Naan',
        category: 'Breads',
        price: 49,
        description: 'Soft flatbread topped with garlic',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },
      {
        id: 10,
        name: 'Butter Naan',
        category: 'Breads',
        price: 39,
        description: 'Classic butter-brushed naan',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },

      // Beverages
      {
        id: 11,
        name: 'Mango Lassi',
        category: 'Beverages',
        price: 89,
        description: 'Sweet yogurt drink with mango',
        available: true,
        tags: ['Vegetarian', 'Popular'],
        popular: true,
        vegetarian: true
      },
      {
        id: 12,
        name: 'Masala Chai',
        category: 'Beverages',
        price: 39,
        description: 'Traditional Indian spiced tea',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },
      {
        id: 13,
        name: 'Cold Coffee',
        category: 'Beverages',
        price: 99,
        description: 'Chilled coffee with ice cream',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },

      // Desserts
      {
        id: 14,
        name: 'Gulab Jamun',
        category: 'Desserts',
        price: 79,
        description: 'Deep-fried milk dumplings in sugar syrup',
        available: true,
        tags: ['Vegetarian', 'Popular'],
        popular: true,
        vegetarian: true
      },
      {
        id: 15,
        name: 'Rasmalai',
        category: 'Desserts',
        price: 99,
        description: 'Soft cottage cheese patties in sweet milk',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      },
      {
        id: 16,
        name: 'Ice Cream',
        category: 'Desserts',
        price: 69,
        description: 'Assorted flavors',
        available: true,
        tags: ['Vegetarian'],
        vegetarian: true
      }
    ];
  }

  private generateCategories(): MenuCategory[] {
    const categoryCounts = new Map<string, number>();
    
    this.menuItems.forEach(item => {
      const count = categoryCounts.get(item.category) || 0;
      categoryCounts.set(item.category, count + 1);
    });

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
        filtered = filtered.filter(item => item.category === categoryName);
      }
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Tag filters
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        if (this.selectedTags.includes('Vegetarian') && !item.vegetarian) return false;
        if (this.selectedTags.includes('Spicy') && !item.spicy) return false;
        if (this.selectedTags.includes('Popular') && !item.popular) return false;
        return true;
      });
    }

    // Availability filter
    filtered = filtered.filter(item => item.available);

    // Sorting
    this.applySorting(filtered);

    this.filteredItems = filtered;
    this.cdr.markForCheck();
  }

  private applySorting(items: MenuItem[]): void {
    switch (this.sortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'popular':
        items.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
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

  quickAddItem(item: MenuItem, portion?: 'Half' | 'Full'): void {
    const cartItem: Omit<CartItem, 'qty'> = {
      id: Date.now(), // Temporary ID
      name: item.name,
      price: item.price,
      portion: portion,
      category: item.category,
      image: item.image
    };

    this.itemAdd.emit(cartItem);
  }

  addItemWithOptions(item: MenuItem): void {
    // Open customization dialog if item has portions or addons
    if (item.portions?.length || item.addons?.length) {
      // TODO: Open customization modal
      console.log('Open customization for:', item);
      // For now, just add with default
      this.quickAddItem(item);
    } else {
      this.quickAddItem(item);
    }
  }

  /* ================= HELPERS ================= */

  getItemBadges(item: MenuItem): string[] {
    const badges: string[] = [];
    if (item.popular) badges.push('Popular');
    if (item.vegetarian) badges.push('Veg');
    if (item.spicy) badges.push('Spicy');
    return badges;
  }

  getBadgeIcon(badge: string): string {
    switch (badge) {
      case 'Popular': return 'star';
      case 'Veg': return 'eco';
      case 'Spicy': return 'local_fire_department';
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
