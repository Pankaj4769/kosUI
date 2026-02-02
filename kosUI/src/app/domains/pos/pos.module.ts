import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosRoutingModule } from './pos-routing.module';
import { DiscountPanelComponent } from './components/discount-panel/discount-panel.component';

@NgModule({
  declarations: [
    DiscountPanelComponent
    // ❌ DO NOT declare standalone components here
  ],
  imports: [
    CommonModule,
    FormsModule,
    PosRoutingModule
  ]
})
export class PosModule {}
