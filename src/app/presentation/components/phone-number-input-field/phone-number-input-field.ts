import { Component, computed, effect, ElementRef, HostListener, inject, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { FormTextInput } from '../form-text-input';
import { Country, COUNTRIES } from './countries';

@Component({
  selector: 'app-phone-number-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule, FormTextInput],
  styles: [`
    .country-btn {
      border-radius: 0.375rem 0 0 0.375rem;
      border-right: 0;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0 0.65rem;
      height: 38px;
      font-size: 0.875rem;
    }
    .country-dropdown {
      position: fixed;
      width: min(280px, calc(100vw - 1rem));
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      z-index: 12000;
      display: flex;
      flex-direction: column;
    }
    .country-search {
      padding: 0.5rem;
      border-bottom: 1px solid #dee2e6;
    }
    .country-list {
      overflow-y: auto;
      max-height: 240px;
    }
    .country-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      width: 100%;
      border: 0;
      background: transparent;
      text-align: left;
    }
    .country-item:hover {
      background: #f8f9fa;
    }
    .country-item.active {
      background: #e8f4ff;
    }
    .country-item .dial-code {
      margin-left: auto;
      color: #6c757d;
      font-size: 0.8rem;
    }
    .local-input ::ng-deep label {
      display: none;
    }
    .local-input ::ng-deep .form-control {
      border-radius: 0 0.375rem 0.375rem 0;
      margin-bottom: 0 !important;
    }
    .local-input ::ng-deep .mb-2 {
      margin-bottom: 0 !important;
    }
    .validator-popup {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 0.5rem 0.75rem;
      z-index: 1000;
      margin-top: 2px;
    }
    .validator-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.8rem;
      padding: 2px 0;
    }
  `],
  template: `
    <div style="position: relative;" (focusin)="isFocused.set(true)" (focusout)="onFocusOut($event)">
      <label class="form-label mb-1">
        {{ label() }}
        @if (isRequired) {
          <span class="text-danger fw-bolder"> *</span>
        }
      </label>

      <div class="d-flex" style="position: relative;">

        <!-- Country selector -->
        <div style="position: relative; flex-shrink: 0;">
          <button
            #countryButton
            type="button"
            class="btn btn-outline-secondary country-btn"
            [style.background-color]="hasErrors ? 'var(--error-bg)' : ''"
            [disabled]="disabled()"
            (click)="toggleDropdown($event)"
          >
            <span>{{ selectedCountry().flag }}</span>
            <span>{{ selectedCountry().dialCode }}</span>
            <i class="bi bi-chevron-down" style="font-size: 0.7rem;"></i>
          </button>

          @if (dropdownOpen()) {
            <div
              class="country-dropdown"
              [style.top.px]="dropdownTop()"
              [style.left.px]="dropdownLeft()"
              (click)="$event.stopPropagation()"
            >
              <div class="country-search">

                <!-- when i click on this input, the browser shows a popup on saved info, don't want that, still shows popup -->
                <input
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Search country..."
                  name="country-code-search"
                  autocomplete="off"
                  [value]="searchQuery()"
                  (input)="onSearch($event)"
                  (click)="$event.stopPropagation()"
                  autofocus
                />
              </div>
              <div class="country-list">
                @for (country of filteredCountries(); track country.code) {
                  <button
                    type="button"
                    class="country-item"
                    [class.active]="country.code === selectedCountry().code"
                    (click)="selectCountry(country)"
                  >
                    <span>{{ country.flag }}</span>
                    <span>{{ country.name }}</span>
                    <span class="dial-code">{{ country.dialCode }}</span>
                  </button>
                }
                @if (filteredCountries().length === 0) {
                  <div class="country-item text-muted">No results found.</div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Local number input (uses form-text-input) -->
        <div class="flex-grow-1 local-input">
          <app-form-text-input
            [label]="''"
            inputType="tel"
            [disabled]="disabled()"
            [readonly]="readonly()"
            [ngModel]="localNumber()"
            (ngModelChange)="onLocalNumberChange($event)"
          />
        </div>

      </div>

      @if (isFocused() && validatorMessages.length > 0) {
        <div class="validator-popup">
          @for (v of validatorMessages; track v.key) {
            <div class="validator-item">
              <i [class]="v.satisfied ? 'bi bi-check-circle-fill text-success' : 'bi bi-x-circle-fill text-danger'"></i>
              <span>{{ v.message }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PhoneNumberInputField implements ControlValueAccessor {
  label = input<string>('');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  defaultCountry = input<string>(COUNTRIES[0].code);

  selectedCountry = signal<Country>(COUNTRIES[0]);
  localNumber = signal<string>('');
  dropdownOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  dropdownTop = signal(0);
  dropdownLeft = signal(0);
  countryButton = viewChild<ElementRef<HTMLButtonElement>>('countryButton');

  filteredCountries = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  });

  private ngControl = inject(NgControl, { self: true, optional: true });
  private elementRef = inject(ElementRef);

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    effect(() => {
      const code = this.defaultCountry();
      const country = COUNTRIES.find(c => c.code === code) ?? COUNTRIES[0];
      this.selectedCountry.set(country);
    });
  }

  isFocused = signal(false);

  get hasErrors(): boolean {
    const ctrl = this.ngControl?.control;
    return !!(ctrl?.invalid);
  }

  get isRequired(): boolean {
    const ctrl = this.ngControl?.control;
    if (!ctrl?.validator) return false;
    return !!ctrl.validator({} as any)?.['required'];
  }

  get validatorMessages(): { key: string; message: string; satisfied: boolean }[] {
    const control = this.ngControl?.control;
    if (!control?.validator) return [];

    const allErrors = {
      ...control.validator({ value: '' } as any),
      ...control.validator({ value: '\x00' } as any),
      ...control.validator({ value: '\x00'.repeat(300) } as any),
    };

    const builtInMessages: Record<string, (val: any) => string> = {
      required: () => 'This field is required.',
      minlength: (val) => `Minimum ${val?.requiredLength ?? ''} characters required.`,
      maxlength: (val) => `Maximum ${val?.requiredLength ?? ''} characters allowed.`,
      pattern: () => 'Invalid format.',
    };

    return Object.entries(allErrors)
      .filter(([key, val]) =>
        (val && typeof val === 'object' && 'message' in (val as object)) || key in builtInMessages
      )
      .map(([key, val]) => ({
        key,
        message: (val && typeof val === 'object' && 'message' in (val as object))
          ? (val as any).message as string
          : builtInMessages[key](val),
        satisfied: !control.errors?.[key],
      }));
  }

  onFocusOut(event: FocusEvent): void {
    if (!this.elementRef.nativeElement.contains(event.relatedTarget as Node)) {
      this.isFocused.set(false);
      this.onTouched();
    }
  }

  // Close dropdown when clicking outside the component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
      this.searchQuery.set('');
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.dropdownOpen();
    if (opening) this.positionDropdown();
    this.dropdownOpen.set(opening);
    if (!opening) this.searchQuery.set('');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.dropdownOpen()) this.positionDropdown();
  }

  private positionDropdown(): void {
    const button = this.countryButton()?.nativeElement;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = Math.min(280, window.innerWidth - 16);
    const menuHeight = 292;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    const top = window.innerHeight - rect.bottom >= menuHeight
      ? rect.bottom + 4
      : Math.max(8, rect.top - menuHeight - 4);

    this.dropdownLeft.set(left);
    this.dropdownTop.set(top);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  selectCountry(country: Country): void {
    this.selectedCountry.set(country);
    this.dropdownOpen.set(false);
    this.searchQuery.set('');
    this.emitValue();
  }

  onLocalNumberChange(value: string): void {
    this.localNumber.set(value);
    this.emitValue();
  }

  private emitValue(): void {
    const digits = this.localNumber().replace(/^0+/, '').replace(/\s/g, '');
    const full = digits ? `${this.selectedCountry().dialCode}${digits}` : '';
    this.onChange(full);
    this.onTouched();
  }

  // ControlValueAccessor
  onChange: (value: string) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(value: string): void {
    if (!value) {
      this.localNumber.set('');
      return;
    }
    // Match the longest dial code first to avoid +1 swallowing +1X codes
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = sorted.find(c => value.startsWith(c.dialCode));
    if (match) {
      this.selectedCountry.set(match);
      this.localNumber.set(value.slice(match.dialCode.length));
    } else {
      this.localNumber.set(value);
    }
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(_: boolean): void { }
}
