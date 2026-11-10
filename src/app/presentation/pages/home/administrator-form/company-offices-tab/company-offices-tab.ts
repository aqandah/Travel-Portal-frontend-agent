import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormTextInput } from '../../../../components/form-text-input';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { OfficeRepository } from '../../../../../domain/office';
import { CreateOfficeRequest, UpdateOfficeRequest, ViewOffice } from '../../../../../data/models';
import { arabicOnlyValidator, englishOnlyValidator } from '../../../../../core/validators/language';

@Component({
  selector: 'app-company-offices-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './company-offices-tab.html',
})
export class CompanyOfficesTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  officeRepository = inject(OfficeRepository);

  private destroyRef = inject(DestroyRef);

  offices = signal<ViewOffice[]>([]);
  filteredOffices = signal<ViewOffice[]>([]);
  selectedOfficeId: string | null = null;
  showOfficeModal = false;
  isEditMode = false;
  officeForm: FormGroup;
  searchControl = new FormControl('');

  itemsPerPage = 12;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredOffices().length / this.itemsPerPage) || 1;
  }

  get paginatedOffices(): ViewOffice[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOffices().slice(start, start + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else if (this.currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i);
    } else if (this.currentPage >= this.totalPages - 2) {
      for (let i = this.totalPages - 4; i <= this.totalPages; i++) pages.push(i);
    } else {
      for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) pages.push(i);
    }
    return pages;
  }

  constructor() {
    this.officeForm = this.fb.group({
      officeCode: ['', Validators.required],
      officeNameNative: ['', [Validators.required, englishOnlyValidator()]],
      officeNameForeign: ['', arabicOnlyValidator()],
      officeAgencyAccountCode: [''],
      officeBrokerSltId: [null],
      specialDiscount: [0],
    });

    this.searchControl.valueChanges.pipe(
      // debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.filterOffices(value || '');
    });
  }

  async ngOnInit(): Promise<void> {
    this.appService.isLoading.set('Loading offices...');

    await this.loadOffices();

    const searchQuery = this.appService.officeSearchQuery();
    if (searchQuery) {
      this.searchControl.setValue(searchQuery);
      this.appService.officeSearchQuery.set(null);
    }
    this.appService.isLoading.set(null);
  }

  async loadOffices(): Promise<void> {
    try {
      const response = await this.officeRepository.GetAllOffices();
      this.offices.set(response);
      this.filteredOffices.set(response);
      this.currentPage = 1;
    } catch (error) {
      this.dialogService.openDialog('Error loading offices', 'error');
    }
  }

  filterOffices(searchValue: string): void {
    if (!searchValue) {
      this.filteredOffices.set(this.offices());
    } else {
      const filtered = this.offices().filter(o =>
        o.officeId?.toLowerCase().includes(searchValue.toLowerCase()) ||
        o.nameInEnglish?.toLowerCase().includes(searchValue.toLowerCase()) ||
        o.nameInArabic?.toLowerCase().includes(searchValue.toLowerCase()) ||
        o.brokerCode?.toLowerCase().includes(searchValue.toLowerCase())
      );
      this.filteredOffices.set(filtered);
    }
    this.currentPage = 1;
  }

  selectOffice(id: string): void {
    this.selectedOfficeId = id;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  openAddOfficeModal(): void {
    this.isEditMode = false;
    this.officeForm.reset({
      officeCode: '',
      officeNameNative: '',
      officeNameForeign: '',
      officeAgencyAccountCode: '',
      officeBrokerSltId: null,
      specialDiscount: 0,
    });
    this.officeForm.get('officeCode')?.enable();
    this.showOfficeModal = true;
  }

  openEditOfficeModal(): void {
    if (!this.selectedOfficeId) return;

    const office = this.offices().find(o => o.officeId === this.selectedOfficeId);
    if (!office) return;

    this.isEditMode = true;
    this.officeForm.patchValue({
      officeCode: office.officeId,
      officeNameNative: office.nameInEnglish,
      officeNameForeign: office.nameInArabic,
      officeAgencyAccountCode: office.brokerCode,
      officeBrokerSltId: office.brokerSltId,
      specialDiscount: office.specialDiscount,
    });
    this.officeForm.get('officeCode')?.disable();
    this.showOfficeModal = true;
  }

  closeModal(): void {
    this.showOfficeModal = false;
    this.officeForm.reset();
  }

  async saveOffice(): Promise<void> {
    if (this.officeForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      Object.keys(this.officeForm.controls).forEach(key => {
        this.officeForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.officeForm.getRawValue();
    this.appService.isLoading.set(this.isEditMode ? 'Updating office...' : 'Creating office...');

    try {
      if (this.isEditMode) {
        const updateData: UpdateOfficeRequest = {
          nameInEnglish: formValue.officeNameNative,
          nameInArabic: formValue.officeNameForeign || undefined,
          brokerCode: formValue.officeAgencyAccountCode || undefined,
          brokerSltId: formValue.officeBrokerSltId ?? undefined,
          specialDiscount: formValue.specialDiscount ?? undefined,
        };
        await this.officeRepository.UpdateOffice(updateData, this.selectedOfficeId!);
        this.dialogService.openDialog('Office updated successfully', 'success');
      } else {
        const createData: CreateOfficeRequest = {
          officeId: formValue.officeCode,
          nameInEnglish: formValue.officeNameNative,
          nameInArabic: formValue.officeNameForeign || undefined,
          brokerCode: formValue.officeAgencyAccountCode || undefined,
          brokerSltId: formValue.officeBrokerSltId ?? undefined,
          specialDiscount: formValue.specialDiscount ?? undefined,
        };
        await this.officeRepository.SaveOffice(createData);
        this.dialogService.openDialog('Office created successfully', 'success');
      }
      this.appService.isLoading.set(null);

      this.closeModal();
      await this.loadOffices();
    } catch (error) {
      this.dialogService.openDialog('Error saving office', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  async deleteOffice(): Promise<void> {
    if (!this.selectedOfficeId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete company office?',
      message: `Office ${this.selectedOfficeId} will be permanently deleted.`,
      confirmText: 'Delete office',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.appService.isLoading.set('Deleting office...');

    try {
      await this.officeRepository.DeleteOffice(this.selectedOfficeId);
      this.dialogService.openDialog('Office deleted successfully', 'success');
      this.selectedOfficeId = null;
      await this.loadOffices();
    } catch (error) {
      this.dialogService.openDialog('Error deleting office', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }
}
