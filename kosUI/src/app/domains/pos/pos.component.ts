import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [RouterOutlet], // ✅ IMPORTANT
  template: `
    <router-outlet></router-outlet>
  `
})
export class PosComponent {}
