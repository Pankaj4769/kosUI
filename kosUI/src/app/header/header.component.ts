import { Component } from '@angular/core';
import { InventoryComponent } from '../inventory/inventory.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [InventoryComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

}
