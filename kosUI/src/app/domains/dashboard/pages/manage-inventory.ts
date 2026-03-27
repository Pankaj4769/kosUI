import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { InventoryService } from '../../dashboard/services/inventory.service';
import { Item } from '../../dashboard/models/item.model';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../common-popup/pages/confirm-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';

type Category = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
type Group = 'Veg' | 'Non-Veg';
type StockView = 'ALL' | 'LOW' | 'SOLD' | 'DISABLED';

@Component({
  selector: 'app-manage-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
  ],
  templateUrl: './manage-inventory.html',
  styleUrls: ['./manage-inventory.css']
})
export class ManageInventoryComponent {

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.inventoryService.populateItems([]);
    this.inventoryService.getItemlist().subscribe(res=>{
      let itemList: Item[] = res;
      itemList.sort((a, b) => {
        if (a.id == null) return 1;
        if (b.id == null) return -1;
        return Number(b.id) - Number(a.id);
      });
      this.inventoryService.populateItems(itemList);
      this.cdr.detectChanges();
      
  });
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.form-field-group')) {
      this.categoryDropdownOpen = false;
      this.groupDropdownOpen    = false;
    }
  }

  bulkPreview: any[] = [];
  bulkErrors: string[] = [];
  excelFileName: string = '';
  bulkSaving = false;

  /* ---------- UI State ---------- */
  sidebarCollapsed = false;
  drawerOpen = false;
  selectedImage: string | null = null;

  /* ---------- UX Enhancements ---------- */
  formErrors: any = {};
  saveSuccess: boolean = false;

  categories: Category[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
  types: Group[] = ['Veg', 'Non-Veg'];

  categoryTimePresets: Record<string, { from: string; to: string }> = {
    'Breakfast': { from: '08:00', to: '11:00' },
    'Lunch':     { from: '12:30', to: '16:00' },
    'Snacks':    { from: '16:00', to: '18:00' },
    'Dinner':    { from: '19:00', to: '22:00' }
  };

  categoryDropdownOpen = false;
  groupDropdownOpen    = false;

  /* ---------- Filters ---------- */
  search = '';
  categoryFilter: Category | 'ALL' = 'ALL';
  groupFilter: Group | 'ALL' = 'ALL';
  stockView: StockView = 'ALL';

  /* ---------- Sorting ---------- */
  sortBy: 'NAME' | 'PRICE' | 'STOCK' | 'CATEGORY' | ''='';
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  /* ---------- Add/Edit Form ---------- */
  name = '';
  category: Category = 'Breakfast';
  group: Group = 'Veg';
  price: number | null = null;
  qty: number | null = null;
  from = '06:00';
  to = '11:00';
  selectedCategories: string[] = [];

  editingItem: Item | null = null;

  /* ---------- Computed Properties ---------- */

  get soldOutItems(): Item[] {
    return this.viewItems.filter(i => i.qty === 0);
  }

  get totalItems() {
    return this.inventoryService.getAllItems().length;
  }

  get inventoryValue() {
    return this.inventoryService.getAllItems().length - (this.inventoryService.getSoldOutCount()+this.inventoryService.getDisabledCount());
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

  onCategoryChange(category: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
  
    if (checked) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories = this.selectedCategories.filter(c => c !== category);
    }
  }

  toggleCategory(category: string, checked: boolean) {
    if (checked) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories = this.selectedCategories.filter(c => c !== category);
    }
    this.applyTimePreset();
  }

  private applyTimePreset() {
    if (this.selectedCategories.length === 0) return;

    // Use earliest "from" and latest "to" across all selected categories
    const times = this.selectedCategories
      .map(c => this.categoryTimePresets[c])
      .filter(Boolean);

    if (times.length === 0) return;

    this.from = times.reduce((min, t) => t.from < min ? t.from : min, times[0].from);
    this.to   = times.reduce((max, t) => t.to   > max ? t.to   : max, times[0].to);
  }

  saveItem() {
    if (!this.validateForm()) {
      return;
    }

    if (this.editingItem) {

      const updated: Item = {
        ...this.editingItem,
        name: this.name,
        category: this.selectedCategories,
        group: this.group,
        price: this.price!,
        qty: this.qty!,
        from: this.from,
        to: this.to,
        image: this.selectedImage || undefined,
        restaurantId: this.authService.currentUser?.restaurantId ?? ''
      };
      this.inventoryService.updateItem(updated).subscribe(res=>{
        let newItem= res;
        if(newItem.id != null && newItem.id > 0){
          this.inventoryService.getItemlist().subscribe(res=>{
            this.inventoryService.populateItems(res as Item[]);
            this.cdr.detectChanges();
          });
        }
      });

    } else {

      const newItem: Item = {
        id: null,
        name: this.name,
        category: this.selectedCategories,
        group: this.group,
        price: this.price!,
        qty: this.qty!,
        enabled: true,
        from: this.from,
        to: this.to,
        image: this.selectedImage || undefined,
        restaurantId: this.authService.currentUser?.restaurantId ?? ''
      };
      this.inventoryService.addItem(newItem).subscribe(response=>{
        let newItem= response;
        if(newItem.id != null && newItem.id > 0){
          this.inventoryService.getItemlist().subscribe(res=>{
            this.inventoryService.populateItems(res as Item[]);
            this.cdr.detectChanges();
          });
        }
      });
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
    this.selectedCategories = [...item.category];
    this.group = item.group as Group;
    this.price = item.price;
    this.qty = item.qty;
    this.from = item.from;
    this.to = item.to;
    this.selectedImage = item.image || null;

    this.drawerOpen = true;
  }

  /* ---------- DELETE ITEM ---------- */

  deleteItem(id: number | null) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmText: 'Delete',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.deleteItem(id).subscribe(res => {
          let message = res;
          if (message.status) {
            this.inventoryService.getItemlist().subscribe(res => {
              this.inventoryService.populateItems(res as Item[]);
              this.cdr.detectChanges();
            });
          }
        });
      }
    });
  }

  /* ---------- TOGGLE STATUS ---------- */

  toggleItem(item: Item) {
    this.inventoryService.toggleItemStatus(item.id, item.enabled);
  }

  /* ---------- STOCK VALIDATION ---------- */

  validateStock(item: Item) {
    if (item.qty == null || item.qty < 0) {
      item.qty = 0;
    }

    if (item.qty === 0) {
      item.enabled = false;
    }

    this.inventoryService.restockItem(item);
  }

  formatTime(time: string): string {
  if (!time) return '';

  const [hour, minute] = time.split(':').map(Number);

  const period = hour >= 12 ? 'PM' : 'AM';

  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

  /* ---------- BULK UPLOAD ---------- */

  downloadTemplate() {
    const headers = ['name', 'category', 'group', 'price', 'qty', 'from', 'to'];
    const sample = ['Masala Dosa', 'Breakfast,Lunch', 'Veg', 60, 50, '06:00', '11:00'];

    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);

    // Column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'inventory_bulk_template.xlsx');
  }

  uploadExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.excelFileName = file.name;
    this.bulkPreview = [];
    this.bulkErrors = [];

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        this.bulkErrors = ['File is empty or missing data rows.'];
        return;
      }

      const validCategories = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
      const validGroups = ['Veg', 'Non-Veg'];
      const parsed: any[] = [];
      const errors: string[] = [];

      rows.slice(1).forEach((row, idx) => {
        const rowNum = idx + 2;
        const [name, categoryRaw, group, price, qty, from, to] = row;

        const rowErrors: string[] = [];

        if (!name || String(name).trim().length < 3)
          rowErrors.push(`Row ${rowNum}: Name must be at least 3 characters`);

        const categories = String(categoryRaw || '').split(',').map(c => c.trim()).filter(Boolean);
        const invalidCats = categories.filter(c => !validCategories.includes(c));
        if (categories.length === 0)
          rowErrors.push(`Row ${rowNum}: Category is required`);
        else if (invalidCats.length > 0)
          rowErrors.push(`Row ${rowNum}: Invalid categories: ${invalidCats.join(', ')}`);

        if (!validGroups.includes(String(group).trim()))
          rowErrors.push(`Row ${rowNum}: Group must be 'Veg' or 'Non-Veg'`);

        if (isNaN(Number(price)) || Number(price) <= 0)
          rowErrors.push(`Row ${rowNum}: Price must be > 0`);

        if (isNaN(Number(qty)) || Number(qty) < 0)
          rowErrors.push(`Row ${rowNum}: Qty cannot be negative`);

        if (!from) rowErrors.push(`Row ${rowNum}: 'from' time is required`);
        if (!to)   rowErrors.push(`Row ${rowNum}: 'to' time is required`);

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          parsed.push({
            id: null,
            name: String(name).trim(),
            category: categories,
            group: String(group).trim(),
            price: Number(price),
            qty: Number(qty),
            from: String(from),
            to: String(to),
            enabled: true,
            restaurantId: this.authService.currentUser?.restaurantId ?? ''
          });
        }
      });

      this.bulkPreview = parsed;
      this.bulkErrors = errors;
    };

    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  saveBulkItems() {
    if (this.bulkPreview.length === 0) return;
    this.bulkSaving = true;
    this.inventoryService.bulkAddItems(this.bulkPreview).subscribe({
      next: () => {
        this.inventoryService.getItemlist().subscribe(res => {
          this.inventoryService.populateItems(res as Item[]);
          this.cdr.detectChanges();
          this.bulkSaving = false;
          this.bulkPreview = [];
          this.excelFileName = '';
          this.showSuccessToast();
          this.closeDrawer();
        });
      },
      error: () => {
        this.bulkSaving = false;
        this.bulkErrors = ['Server error while saving items. Please try again.'];
      }
    });
  }

  /* ---------- IMAGE UPLOAD ---------- */

  imageError: string = '';

  private readonly MAX_FILE_MB = 5;
  private readonly MAX_DIMENSION = 400;   // px – max width or height after resize
  private readonly JPEG_QUALITY  = 0.75;  // 0–1

  onImageSelect(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    this.imageError = '';

    // 1. Reject files larger than MAX_FILE_MB
    if (file.size > this.MAX_FILE_MB * 1024 * 1024) {
      this.imageError = `Image must be under ${this.MAX_FILE_MB} MB`;
      event.target.value = '';
      return;
    }

    // 2. Accept only images
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Only image files are allowed';
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        // 3. Calculate new dimensions, preserving aspect ratio
        let { width, height } = img;
        if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * this.MAX_DIMENSION) / width);
            width  = this.MAX_DIMENSION;
          } else {
            width  = Math.round((width  * this.MAX_DIMENSION) / height);
            height = this.MAX_DIMENSION;
          }
        }

        // 4. Draw onto canvas and export as compressed JPEG
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        this.selectedImage = canvas.toDataURL('image/jpeg', this.JPEG_QUALITY);
        this.cdr.detectChanges();
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
    event.target.value = '';
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
