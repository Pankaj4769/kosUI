import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

type Portion = 'Half' | 'Full';

interface Addon {
  name: string;
  price: number;
}

interface ModifierItem {
  name: string;
  portions?: Record<Portion, number>;
  addons?: Addon[];
}

@Component({
  selector: 'app-item-modifier-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-modifier-popup.component.html',
  styleUrls: ['./item-modifier-popup.component.css']
})
export class ItemModifierPopupComponent implements OnChanges {

  /* ================= INPUT / OUTPUT ================= */

  @Input() item!: ModifierItem;
  @Output() confirm = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  /* ================= STATE ================= */

  readonly portions: Portion[] = ['Half', 'Full'];

  selectedPortion: Portion = 'Full';
  selectedAddons: Addon[] = [];

  /* ================= LIFECYCLE ================= */

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item']) {
      this.resetSelections();   // ✅ ensures clean popup state
    }
  }

  /* ================= ADDONS ================= */

  toggleAddon(addon: Addon) {
    const exists = this.selectedAddons.some(a => a.name === addon.name);

    this.selectedAddons = exists
      ? this.selectedAddons.filter(a => a.name !== addon.name)
      : [...this.selectedAddons, addon];
  }

  isAddonSelected(addon: Addon): boolean {
  return this.selectedAddons.some(a => a.name === addon.name);
}

  /* ================= PRICING ================= */

  get totalPrice(): number {
    if (!this.item?.portions) return 0;

    const base = this.item.portions[this.selectedPortion];
    const addonsTotal = this.selectedAddons.reduce(
      (sum, a) => sum + a.price,
      0
    );

    return base + addonsTotal;
  }

  /* ================= ACTIONS ================= */

  addToCart() {
    if (!this.item) return;

    this.confirm.emit({
      name: this.item.name,
      portion: this.selectedPortion,
      addons: this.selectedAddons,
      price: this.totalPrice,
      qty: 1
    });

    this.closePopup();
  }

  closePopup() {
    this.resetSelections();
    this.close.emit();
  }

  /* ================= UTIL ================= */

  private resetSelections() {
    this.selectedPortion = 'Full';
    this.selectedAddons = [];
  }

  trackByName(_: number, addon: Addon) {
    return addon.name;
  }
}
