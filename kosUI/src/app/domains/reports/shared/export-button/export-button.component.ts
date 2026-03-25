import { Component, Input, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReportExportService, ReportExportConfig } from '../report-export.service';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './export-button.component.html',
  styleUrls: ['./export-button.component.css']
})
export class ExportButtonComponent {
  @Input() config!: ReportExportConfig;

  isOpen = false;

  constructor(private exportSvc: ReportExportService, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!this.el.nativeElement.contains(e.target)) this.isOpen = false;
  }

  toggle() { this.isOpen = !this.isOpen; }

  exportPDF() {
    this.isOpen = false;
    this.exportSvc.exportToPDF(this.config);
  }

  exportExcel() {
    this.isOpen = false;
    this.exportSvc.exportToExcel(this.config);
  }
}
