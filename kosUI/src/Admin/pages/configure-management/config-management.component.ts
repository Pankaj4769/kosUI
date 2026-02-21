import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface Currency {
  code: string; symbol: string; name: string;
  enabled: boolean; isDefault: boolean;
}

export interface TaxRule {
  id: number; name: string; rate: number;
  region: string; appliesTo: string; active: boolean;
}

export interface StorageConfig {
  provider: string; bucket: string;
  region: string; maxFileSizeMB: number;
  usedGB: number; totalGB: number;
}

@Component({
  selector: 'app-config-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './config-management.component.html',
  styleUrls: ['./config-management.component.css']
})
export class ConfigManagementComponent implements OnInit {

  activeTab = 'global';
  today     = '';
  saveSuccess = false;

  tabs = [
    { key: 'global',   label: 'Global Settings' },
    { key: 'currency', label: 'Currency'         },
    { key: 'tax',      label: 'Tax Settings'     },
    { key: 'branding', label: 'Branding'         },
    { key: 'timezone', label: 'Timezone'         },
    { key: 'storage',  label: 'Storage'          },
  ];

  /* ── Global Settings ── */
  globalSettings = {
    platformName:     'KitchenOS',
    supportEmail:     'support@kitchenos.com',
    maxTenantsPerNode: 500,
    defaultLanguage:  'en-IN',
    maintenanceMode:  false,
    allowSignup:      true,
    trialDays:        14,
    maxUsersPerTenant: 100,
    apiRateLimitPerMin: 1000,
    webhooksEnabled:  true,
    debugMode:        false,
    analyticsEnabled: true,
  };

  languageOptions = [
    { code: 'en-IN', label: 'English (India)'  },
    { code: 'en-US', label: 'English (US)'     },
    { code: 'hi-IN', label: 'Hindi'            },
    { code: 'ta-IN', label: 'Tamil'            },
    { code: 'te-IN', label: 'Telugu'           },
    { code: 'ar',    label: 'Arabic'           },
  ];

  /* ── Currency ── */
  currencies: Currency[] = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee',    enabled: true,  isDefault: true  },
    { code: 'USD', symbol: '$', name: 'US Dollar',        enabled: true,  isDefault: false },
    { code: 'EUR', symbol: '€', name: 'Euro',             enabled: true,  isDefault: false },
    { code: 'GBP', symbol: '£', name: 'British Pound',    enabled: false, isDefault: false },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',    enabled: true,  isDefault: false },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',enabled: false, isDefault: false },
    { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal',    enabled: false, isDefault: false },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit',enabled: false,isDefault: false },
  ];

  currencySettings = {
    decimalPlaces:    2,
    thousandSeparator: ',',
    decimalSeparator:  '.',
    symbolPosition:   'before',
  };

  /* ── Tax ── */
  taxRules: TaxRule[] = [
    { id:1, name:'GST 5%',      rate:5,  region:'India',    appliesTo:'Food Items',     active:true  },
    { id:2, name:'GST 12%',     rate:12, region:'India',    appliesTo:'Packaged Food',  active:true  },
    { id:3, name:'GST 18%',     rate:18, region:'India',    appliesTo:'Services',       active:true  },
    { id:4, name:'VAT 5%',      rate:5,  region:'UAE',      appliesTo:'All Items',      active:true  },
    { id:5, name:'Sales Tax 8%',rate:8,  region:'US/NY',    appliesTo:'Food & Beverage',active:true  },
    { id:6, name:'SST 6%',      rate:6,  region:'Malaysia', appliesTo:'Services',       active:false },
  ];

  newTaxRule = { name:'', rate:0, region:'', appliesTo:'', active:true };
  showTaxModal = false;

  taxSettings = {
    taxInclusive:   false,
    showTaxOnBill:  true,
    autoCalculate:  true,
    roundingMethod: 'round',
  };

  /* ── Branding ── */
  branding = {
    primaryColor:   '#2563EB',
    secondaryColor: '#7C3AED',
    accentColor:    '#16A34A',
    logoUrl:        '',
    faviconUrl:     '',
    fontFamily:     'Segoe UI',
    borderRadius:   '8',
    companyName:    'KitchenOS',
    tagline:        'Smart Restaurant Management',
    footerText:     '© 2026 KitchenOS. All rights reserved.',
  };

  fontOptions = [
    'Segoe UI', 'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Lato'
  ];

  /* ── Timezone ── */
  timezoneSettings = {
    defaultTimezone: 'Asia/Kolkata',
    dateFormat:      'DD/MM/YYYY',
    timeFormat:      '12h',
    firstDayOfWeek:  'Monday',
    fiscalYearStart: 'April',
  };

  timezones = [
    { value: 'Asia/Kolkata',    label: '(IST +5:30) India Standard Time'      },
    { value: 'Asia/Dubai',      label: '(GST +4:00) Gulf Standard Time'       },
    { value: 'Asia/Singapore',  label: '(SGT +8:00) Singapore Time'           },
    { value: 'Asia/Kuala_Lumpur',label:'(MYT +8:00) Malaysia Time'            },
    { value: 'Asia/Riyadh',     label: '(AST +3:00) Arabia Standard Time'     },
    { value: 'Europe/London',   label: '(GMT +0:00) Greenwich Mean Time'      },
    { value: 'America/New_York',label: '(EST -5:00) Eastern Standard Time'   },
    { value: 'America/Chicago', label: '(CST -6:00) Central Standard Time'   },
    { value: 'Australia/Sydney',label: '(AEDT +11:00) Australian Eastern'    },
  ];

  dateFormats = ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD','DD-MMM-YYYY'];

  /* ── Storage ── */
  storageConfig: StorageConfig = {
    provider:       'AWS S3',
    bucket:         'kitchenos-prod-assets',
    region:         'ap-south-1',
    maxFileSizeMB:  25,
    usedGB:         184,
    totalGB:        500,
  };

  storageProviders = ['AWS S3', 'Google Cloud Storage', 'Azure Blob', 'Cloudflare R2'];

  storageCategories = [
    { label: 'Menu Images',    usedGB: 82,  color: '#2563EB' },
    { label: 'Invoice PDFs',   usedGB: 54,  color: '#7C3AED' },
    { label: 'Receipts',       usedGB: 28,  color: '#16A34A' },
    { label: 'System Backups', usedGB: 20,  color: '#D97706' },
  ];

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ── Actions ── */
  setTab(k: string): void { this.activeTab = k; }

  saveSettings(): void {
    this.saveSuccess = true;
    setTimeout(() => { this.saveSuccess = false; }, 3000);
  }

  setDefaultCurrency(c: Currency): void {
    this.currencies.forEach(x => x.isDefault = false);
    c.isDefault = true;
    c.enabled   = true;
  }

  addTaxRule(): void {
    if (!this.newTaxRule.name.trim()) return;
    this.taxRules.push({
      id: Date.now(), ...this.newTaxRule
    });
    this.showTaxModal = false;
    this.newTaxRule = { name:'', rate:0, region:'', appliesTo:'', active:true };
  }

  deleteTaxRule(r: TaxRule): void {
    this.taxRules = this.taxRules.filter(x => x.id !== r.id);
  }

  triggerLogoUpload(): void {
    document.getElementById('logoInput')?.click();
  }

  /* ── Helpers ── */
  get storageUsedPct(): number {
    return Math.round((this.storageConfig.usedGB / this.storageConfig.totalGB) * 100);
  }

  getStorageBarColor(): string {
    const p = this.storageUsedPct;
    return p > 85 ? '#DC2626' : p > 65 ? '#D97706' : '#2563EB';
  }

  getCurrencyEnabledCount(): number {
    return this.currencies.filter(c => c.enabled).length;
  }
}
