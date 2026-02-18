import { CommonModule } from '@angular/common';
import { 
  Component, 
  EventEmitter, 
  Input, 
  Output,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import * as fs from 'file-saver';

// --- Interfaces ---

export interface SimpleStaff {
  id: string;
  name: string;
  role: string;
  status?: string;
}

export type ViewMode = 'day' | 'week' | 'month';
export type WorkflowStep = 'policy' | 'date-selection' | 'staff-list' | 'dashboard';

export interface ShiftTemplateView {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  isActive: boolean;
}

export interface ShiftAssignmentView {
  id: string;
  staffId: string;
  staffName: string;
  shiftId: string;
  shiftName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'MISSED';
}

export interface ShiftKpi {
  activeShifts: number;
  onDuty: number;
  offDuty: number;
  currentShift: string;
}

// Interface for the Report View
export interface ReportRow {
  staffName: string;
  empId: string;
  role: string;
  date: string;
  shift: string;
  status: string;
}

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shift-management.component.html',
  styleUrls: ['./shift-management.component.css']
})
export class ShiftManagementComponent implements OnInit, OnChanges {
  
  // ============= INPUTS =============
  @Input() templates: ShiftTemplateView[] = [];
  @Input() assignments: ShiftAssignmentView[] = []; 
  @Input() kpi!: ShiftKpi;
  @Input() selectedDate: Date = new Date();
  @Input() availableStaff: SimpleStaff[] = [];

  // ============= OUTPUTS =============
  @Output() dateChange = new EventEmitter<Date>();
  @Output() assignStaff = new EventEmitter<string>(); 
  @Output() bulkAssign = new EventEmitter<ShiftAssignmentView[]>();
  @Output() autoGenerateRoster = new EventEmitter<void>();
  @Output() editAssignment = new EventEmitter<ShiftAssignmentView>();
  @Output() deleteAssignment = new EventEmitter<string>();
  
  @Output() downloadTemplate = new EventEmitter<{start: Date, end: Date}>();
  @Output() uploadTemplate = new EventEmitter<File>();
  @Output() viewReport = new EventEmitter<void>();

  // ============= STATE =============
  currentView: ViewMode = 'day';
  showDirectory = false;
  weekDays: Date[] = [];
  monthWeeks: Date[][] = []; 

  // Modal States
  showShiftSelector = false;
  selectedShiftId: string = '';

  showReportModal = false; // NEW: View Report Modal
  reportData: ReportRow[] = []; // NEW: Data for report table

  // Bulk Assign Modal State
  showBulkModal = false;
  bulkForm: any = {
    staffId: '',
    shiftId: '',
    startDate: '',
    endDate: '',
    selectedDays: [1, 2, 3, 4, 5]
  };

  daysOfWeek = [
    { id: 0, label: 'Sun' }, { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' }, { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }
  ];

  currentStep: WorkflowStep = 'policy';
  
  selectedRange = {
    start: new Date().toISOString().split('T')[0],
    end: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
  };

  expandedStaffId: string | null = null;
  weekDaysForRange: Date[] = [];
  minDate = new Date();
  maxDate = new Date();

  ngOnInit(): void {
    this.minDate.setDate(this.minDate.getDate() - 30);
    this.maxDate.setDate(this.maxDate.getDate() + 90);
    this.generateCalendarData();
    this.initBulkFormDates();

    if (!this.availableStaff || this.availableStaff.length === 0) this.loadMockStaff();
    if (!this.templates || this.templates.length === 0) this.loadMockTemplates();
  }

  loadMockStaff() {
    this.availableStaff = [
      { id: 'EMP001', name: 'John Doe', role: 'Chef', status: 'Active' },
      { id: 'EMP002', name: 'Jane Smith', role: 'Sous Chef', status: 'Active' },
      { id: 'EMP003', name: 'Mike Johnson', role: 'Line Cook', status: 'Active' }
    ];
  }

  loadMockTemplates() {
    this.templates = [
      { id: 'SH001', name: 'General', startTime: '09:00', endTime: '17:00', duration: 8, isActive: true },
      { id: 'SH002', name: 'Morning', startTime: '06:00', endTime: '14:00', duration: 8, isActive: true },
      { id: 'SH003', name: 'Evening', startTime: '14:00', endTime: '22:00', duration: 8, isActive: true }
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] || changes['currentView']) {
      this.generateCalendarData();
      this.initBulkFormDates();
    }
  }

  // ============= WIZARD LOGIC =============

  acceptPolicy(): void { this.currentStep = 'date-selection'; }

  confirmDateRange(): void {
    if (!this.selectedRange.start || !this.selectedRange.end) return;
    this.generateWeekDaysForRange();
    this.currentStep = 'staff-list';
    this.bulkForm.startDate = this.selectedRange.start;
    this.bulkForm.endDate = this.selectedRange.end;
  }

  generateWeekDaysForRange(): void {
    const start = new Date(this.selectedRange.start);
    const end = new Date(this.selectedRange.end);
    this.weekDaysForRange = [];
    let current = new Date(start);
    while (current <= end && this.weekDaysForRange.length < 14) {
      this.weekDaysForRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  }

  // ============= NEW: DOWNLOAD EXCEL TEMPLATE (Vertical + Dropdown) =============
  
  async onDownloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Shift Assignments');

    // 1. Define Columns
    sheet.columns = [
      { header: 'Staff Name', key: 'name', width: 25 },
      { header: 'Emp ID', key: 'id', width: 15 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Shifts', key: 'shift', width: 30 }, // Target for Dropdown
    ];

    // 2. Create Shift Options List (Format: "Name (Start-End)")
    const shiftOptions = this.templates.map(t => `${t.name} (${t.startTime}-${t.endTime})`);
    
    // Add a hidden sheet for data validation source (cleaner than inline list)
    const dataSheet = workbook.addWorksheet('Data');
    dataSheet.state = 'hidden';
    shiftOptions.forEach((opt, index) => {
      dataSheet.getCell(`A${index + 1}`).value = opt;
    });

    // 3. Generate Rows (Staff x Date Range)
    const start = new Date(this.selectedRange.start);
    const end = new Date(this.selectedRange.end);
    let currentRowIndex = 2; // Start after header

    this.availableStaff.forEach(staff => {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = this.formatDate(d);
        
        // Add Row Data
        const row = sheet.addRow({
          name: staff.name,
          id: staff.id,
          role: staff.role,
          date: dateStr,
          shift: shiftOptions[0] // Default to first shift
        });

        // 4. Add Dropdown Validation to the Shift Column (Col E)
        const shiftCell = row.getCell('shift');
        shiftCell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`Data!$A$1:$A$${shiftOptions.length}`] // Reference hidden list
        };
        
        currentRowIndex++;
      }
    });

    // 5. Download File
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Shift_Template_${this.selectedRange.start}_to_${this.selectedRange.end}.xlsx`;
    fs.saveAs(new Blob([buffer]), fileName);
  }

  // ============= NEW: UPLOAD EXCEL TEMPLATE (Vertical) =============

  async onUploadTemplate(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    const sheet = workbook.getWorksheet(1); // First sheet

    const newAssignments: ShiftAssignmentView[] = [];
    
    if(!sheet) return;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const empId = row.getCell(2).text; // Col B
      const dateStr = row.getCell(4).text; // Col D
      const shiftStr = row.getCell(5).text; // Col E: "General (09:00-17:00)"

      const staff = this.availableStaff.find(s => s.id === empId);
      
      // Extract Shift Name from "Name (Start-End)"
      // Simple logic: split by ' (' and take first part
      const shiftNameClean = shiftStr.split(' (')[0];
      const shiftTemplate = this.templates.find(t => t.name === shiftNameClean);

      if (staff && shiftTemplate && dateStr) {
        // Parse date (Assuming DD-MM-YYYY or YYYY-MM-DD)
        const dateParts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
        // Simple date parser (adjust based on your region format)
        // Here assuming input is DD-MM-YYYY based on prompt example
        let dateObj: Date;
        if(dateParts[0].length === 4) {
           dateObj = new Date(dateStr); // YYYY-MM-DD
        } else {
           dateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`); // DD-MM-YYYY -> YYYY-MM-DD
        }

        newAssignments.push({
          id: `ASN-${Math.floor(Math.random() * 100000)}`,
          staffId: staff.id,
          staffName: staff.name,
          shiftId: shiftTemplate.id,
          shiftName: shiftTemplate.name,
          date: dateObj,
          startTime: shiftTemplate.startTime,
          endTime: shiftTemplate.endTime,
          status: 'SCHEDULED'
        });
      }
    });

    console.log(`Parsed ${newAssignments.length} assignments from Excel.`);
    this.bulkAssign.emit(newAssignments);
    alert(`Successfully loaded ${newAssignments.length} shifts!`);
  }

  // ============= NEW: VIEW REPORT LOGIC =============

  onViewReport(): void {
    const start = new Date(this.selectedRange.start);
    const end = new Date(this.selectedRange.end);
    
    // Filter assignments within range
    const relevantAssignments = this.assignments.filter(a => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });

    // Map to Report Format
    this.reportData = relevantAssignments.map(a => {
      const staff = this.availableStaff.find(s => s.id === a.staffId);
      return {
        staffName: a.staffName,
        empId: a.staffId,
        role: staff ? staff.role : 'Unknown',
        date: this.formatDate(new Date(a.date)),
        shift: `${a.shiftName} (${a.startTime}-${a.endTime})`,
        status: a.status
      };
    });

    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  async onDownloadReport() {
    // Generate Excel from reportData
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Assigned Shifts Report');

    sheet.columns = [
      { header: 'Staff Name', key: 'staffName', width: 25 },
      { header: 'Emp ID', key: 'empId', width: 15 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Shifts', key: 'shift', width: 30 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    this.reportData.forEach(row => {
      sheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    fs.saveAs(new Blob([buffer]), 'Assigned_Shifts_Report.xlsx');
  }

  // ============= HELPERS =============
  
  formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`; // DD-MM-YYYY format
  }

  // ============= STANDARD VIEW LOGIC =============
  
  toggleStaffExpand(staffId: string): void { this.expandedStaffId = (this.expandedStaffId === staffId) ? null : staffId; }
  setView(mode: ViewMode): void { this.currentView = mode; this.generateCalendarData(); }
  
  generateCalendarData(): void {
    const today = new Date(this.selectedDate);
    if (this.currentView === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      this.weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
      });
    } else if (this.currentView === 'month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const start = new Date(firstDay);
      start.setDate(firstDay.getDate() - firstDay.getDay());
      const weeks = [];
      let current = new Date(start);
      while (current <= lastDay || weeks.length < 5) {
        const week = [];
        for (let i = 0; i < 7; i++) { week.push(new Date(current)); current.setDate(current.getDate() + 1); }
        weeks.push(week);
      }
      this.monthWeeks = weeks;
    }
  }

  initBulkFormDates(): void {
    const now = new Date(this.selectedDate);
    this.bulkForm.startDate = now.toISOString().split('T')[0];
    this.bulkForm.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  }
  
  openBulkAssignModal(staffId?: string): void {
    if (staffId) this.bulkForm.staffId = staffId;
    this.showBulkModal = true;
  }
  closeBulkModal(): void { this.showBulkModal = false; }
  toggleDaySelection(dayId: number): void {
    const idx = this.bulkForm.selectedDays.indexOf(dayId);
    if (idx > -1) this.bulkForm.selectedDays.splice(idx, 1);
    else this.bulkForm.selectedDays.push(dayId);
  }
  isDaySelected(dayId: number): boolean { return this.bulkForm.selectedDays.includes(dayId); }
  
  saveBulkAssignment(): void {
    if (!this.bulkForm.staffId || !this.bulkForm.shiftId) return;
    const start = new Date(this.bulkForm.startDate);
    const end = new Date(this.bulkForm.endDate);
    const newAssignments: ShiftAssignmentView[] = [];
    const staff = this.availableStaff.find(s => s.id === this.bulkForm.staffId);
    const shift = this.templates.find(s => s.id === this.bulkForm.shiftId);
    if (!staff || !shift) return;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (this.bulkForm.selectedDays.includes(d.getDay())) {
        newAssignments.push({
          id: `ASN-${Math.floor(Math.random() * 10000)}`,
          staffId: staff.id,
          staffName: staff.name,
          shiftId: shift.id,
          shiftName: shift.name,
          date: new Date(d),
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: 'SCHEDULED'
        });
      }
    }
    this.bulkAssign.emit(newAssignments);
    this.closeBulkModal();
  }

  onAutoGenerate(): void { this.autoGenerateRoster.emit(); }
  onFilterRoster(): void { alert('Filter dialog would open here.'); }
  onPrintRoster(): void { window.print(); }
  onAssignStaff(shiftId: string): void { this.assignStaff.emit(shiftId); }
  onAssignmentAction(assignment: ShiftAssignmentView): void { this.editAssignment.emit(assignment); }
  onDeleteAssignment(assignmentId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.deleteAssignment.emit(assignmentId);
  }

  previousDay(): void { 
    const d = new Date(this.selectedDate); 
    if(this.currentView === 'month') d.setMonth(d.getMonth() - 1);
    else if(this.currentView === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    this.dateChange.emit(d);
  }
  nextDay(): void { 
    const d = new Date(this.selectedDate); 
    if(this.currentView === 'month') d.setMonth(d.getMonth() + 1);
    else if(this.currentView === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    this.dateChange.emit(d);
  }

  toggleDirectory(): void { this.showDirectory = !this.showDirectory; }

  // New Shift Selector
  onOpenShiftSelector(): void { this.selectedShiftId = ''; this.showShiftSelector = true; }
  closeShiftSelector(): void { this.showShiftSelector = false; }
  confirmShiftSelection(): void { 
    if (!this.selectedShiftId) return;
    const selected = this.templates.find(t => t.id === this.selectedShiftId);
    if (selected) { this.bulkForm.shiftId = selected.id; this.showBulkModal = true; }
    this.closeShiftSelector();
  }
  onAddShift() { this.onOpenShiftSelector(); }
  onEditShift(shift: ShiftTemplateView) { this.selectedShiftId = shift.id; this.showShiftSelector = true; }

  getAssignmentsByShift(shiftId: string): ShiftAssignmentView[] { return this.assignments.filter((a) => a.shiftId === shiftId); }
  getAssignmentForDay(staffId: string, date: Date): ShiftAssignmentView | undefined { return this.assignments.find(a => a.staffId === staffId && this.isSameDay(new Date(a.date), date)); }
  getAssignmentsForDate(date: Date): ShiftAssignmentView[] { return this.assignments.filter(a => this.isSameDay(new Date(a.date), date)); }
  getShiftWidth(duration: number): string { return (duration / 24 * 100) + '%'; }
  getShiftOffset(startTime: string): string {
    const [h, m] = startTime.split(':').map(Number);
    return ((h * 60 + m) / 1440 * 100) + '%';
  }
  private isSameDay(d1: Date, d2: Date): boolean { return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear(); }
  isToday(date: Date): boolean { return this.isSameDay(date, new Date()); }
}
