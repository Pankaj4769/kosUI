import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  @Output() close = new EventEmitter<void>();

  step: 1 | 2 = 1;
  identifier = '';
  errorMsg   = '';
  isLoading  = false;

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fp-overlay')) {
      this.close.emit();
    }
  }

  submit(): void {
    const val = this.identifier.trim();
    if (!val) {
      this.errorMsg = 'Please enter your email or mobile number.';
      return;
    }

    const emailOk  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const mobileOk = /^\d{10}$/.test(val);

    if (!emailOk && !mobileOk) {
      this.errorMsg = 'Enter a valid email address or 10-digit mobile number.';
      return;
    }

    this.errorMsg  = '';
    this.isLoading = true;

    // Simulate API call — replace with real service call
    setTimeout(() => {
      this.isLoading = false;
      this.step = 2;
    }, 1200);
  }
}
