import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-widgets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-widgets.component.html',
  styleUrls: ['./dashboard-widgets.component.css']
})
export class DashboardWidgetsComponent {
  @Input() title = 'Staff Overview';
}
