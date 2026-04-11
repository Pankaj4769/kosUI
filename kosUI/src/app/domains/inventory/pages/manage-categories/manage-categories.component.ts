import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryService } from '../../../dashboard/services/inventory.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { MenuCategory } from '../../../dashboard/models/menu-category.model';

const DEFAULT_ICONS = ['🍽', '🥗', '🍛', '🍜', '🍕', '🍔', '🥩', '🍣', '🥤', '🧃', '🍰', '🍩', '🥞', '☕', '🍺', '🌮', '🥙', '🍱', '🥘', '🧆'];

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './manage-categories.component.html',
  styleUrls: ['./manage-categories.component.css']
})
export class ManageCategoriesComponent implements OnInit {

  categories: MenuCategory[] = [];
  loading = false;
  saving = false;
  errorMsg = '';

  // Drawer state
  drawerOpen = false;
  editingCategory: MenuCategory | null = null;

  // Form fields
  formName = '';
  formIcon = '🍽';
  formError = '';

  iconPickerOpen = false;
  defaultIcons = DEFAULT_ICONS;

  // Delete confirm
  deletingId: number | null = null;

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.inventoryService.getMenuCategoryList().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.inventoryService.populateMenuCategories(cats);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to load categories. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddDrawer(): void {
    this.editingCategory = null;
    this.formName = '';
    this.formIcon = '🍽';
    this.formError = '';
    this.iconPickerOpen = false;
    this.drawerOpen = true;
  }

  openEditDrawer(cat: MenuCategory): void {
    this.editingCategory = { ...cat };
    this.formName = cat.name;
    this.formIcon = cat.icon;
    this.formError = '';
    this.iconPickerOpen = false;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingCategory = null;
    this.formError = '';
    this.iconPickerOpen = false;
  }

  selectIcon(icon: string): void {
    this.formIcon = icon;
    this.iconPickerOpen = false;
  }

  getItemCount(catName: string): number {
    return this.inventoryService.getAllItems()
      .filter(i => i.category.includes(catName)).length;
  }

  saveCategory(): void {
    this.formError = '';
    const name = this.formName.trim();

    if (!name || name.length < 2) {
      this.formError = 'Category name must be at least 2 characters.';
      return;
    }

    const duplicate = this.categories.some(c =>
      c.name.toLowerCase() === name.toLowerCase() &&
      c.categoryId !== this.editingCategory?.categoryId
    );
    if (duplicate) {
      this.formError = 'A category with this name already exists.';
      return;
    }

    const restaurantId = this.authService.currentUser?.restaurantId ?? '';
    this.saving = true;

    if (this.editingCategory) {
      const updated: MenuCategory = {
        categoryId: this.editingCategory.categoryId,
        name,
        icon: this.formIcon,
        restaurantId
      };
      this.inventoryService.updateMenuCategory(updated).subscribe({
        next: (res) => {
          const idx = this.categories.findIndex(c => c.categoryId === res.categoryId);
          if (idx !== -1) this.categories[idx] = res;
          this.inventoryService.populateMenuCategories([...this.categories]);
          this.saving = false;
          this.closeDrawer();
          this.cdr.detectChanges();
        },
        error: () => {
          this.formError = 'Failed to update category. Please try again.';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      const newCat: MenuCategory = { categoryId: null, name, icon: this.formIcon, restaurantId };
      this.inventoryService.addMenuCategory(newCat).subscribe({
        next: (res) => {
          this.categories.unshift(res);
          this.inventoryService.populateMenuCategories([...this.categories]);
          this.saving = false;
          this.closeDrawer();
          this.cdr.detectChanges();
        },
        error: () => {
          this.formError = 'Failed to add category. Please try again.';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  confirmDelete(id: number | null): void {
    if (id === null) return;
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  deleteCategory(id: number | null): void {
    if (id === null) return;
    this.inventoryService.deleteMenuCategory(id).subscribe({
      next: () => {
        this.categories = this.categories.filter(c => c.categoryId !== id);
        this.inventoryService.populateMenuCategories([...this.categories]);
        this.deletingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Failed to delete category.';
        this.deletingId = null;
        this.cdr.detectChanges();
      }
    });
  }
}
