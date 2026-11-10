import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormTextInput } from '../../../../components/form-text-input';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { AgencyRepository } from '../../../../../domain/agency';
import { CreateAgencyRequest, UpdateAgencyRequest, ViewAgency } from '../../../../../data/models';
import { arabicOnlyValidator, englishOnlyValidator } from '../../../../../core/validators/language';

@Component({
  selector: 'app-travel-agencies-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './travel-agencies-tab.html',
})
export class TravelAgenciesTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  agencyRepository = inject(AgencyRepository);

  private destroyRef = inject(DestroyRef);

  agencies = signal<ViewAgency[]>([]);
  filteredAgencies = signal<ViewAgency[]>([]);
  selectedAgencyCode: number | null = null;
  showAgencyModal = false;
  isEditMode = false;
  agencyForm: FormGroup;
  searchControl = new FormControl('');

  itemsPerPage = 12;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredAgencies().length / this.itemsPerPage) || 1;
  }

  get paginatedAgencies(): ViewAgency[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAgencies().slice(start, start + this.itemsPerPage);
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
    this.agencyForm = this.fb.group({
      agencyNameNative: ['', [Validators.required, englishOnlyValidator()]],
      agencyNameForiegn: ['', arabicOnlyValidator()],
      agencyAccountCode: [''],
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.filterAgencies(value || '');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAgencies();
  }

  async loadAgencies(): Promise<void> {
    this.appService.isLoading.set('Loading agencies...');

    try {
      const response = await this.agencyRepository.GetAllAgencies();
      this.agencies.set(response);
      this.filteredAgencies.set(response);
      this.currentPage = 1;
      this.appService.isLoading.set(null);
    } catch (error) {
      this.dialogService.openDialog('Error loading agencies', 'error');
      this.appService.isLoading.set(null);
    }
  }

  filterAgencies(searchValue: string): void {
    if (!searchValue) {
      this.filteredAgencies.set(this.agencies());
    } else {
      const filtered = this.agencies().filter(a =>
        a.agencyCode?.toString().includes(searchValue) ||
        a.agencyAccountCode?.toLocaleLowerCase().includes(searchValue.toLowerCase()) ||
        a.agencyNameNative?.toLowerCase().includes(searchValue.toLowerCase()) ||
        a.agencyNameForiegn?.toLowerCase().includes(searchValue.toLowerCase())
      );
      this.filteredAgencies.set(filtered);
    }
    this.currentPage = 1;
  }

  selectAgency(code: number): void {
    this.selectedAgencyCode = code;
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

  openAddAgencyModal(): void {
    this.isEditMode = false;
    this.agencyForm.reset({
      agencyNameNative: '',
      agencyNameForiegn: '',
      agencyAccountCode: '',
    });
    this.showAgencyModal = true;
  }

  openEditAgencyModal(): void {
    if (this.selectedAgencyCode === null) return;

    const agency = this.agencies().find(a => a.agencyCode === this.selectedAgencyCode);
    if (!agency) return;

    this.isEditMode = true;
    this.agencyForm.patchValue({
      agencyNameNative: agency.agencyNameNative,
      agencyNameForiegn: agency.agencyNameForiegn,
      agencyAccountCode: agency.agencyAccountCode,
    });
    this.showAgencyModal = true;
  }

  closeModal(): void {
    this.showAgencyModal = false;
    this.agencyForm.reset();
  }

  async saveAgency(): Promise<void> {
    if (this.agencyForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      Object.keys(this.agencyForm.controls).forEach(key => {
        this.agencyForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.agencyForm.getRawValue();
    this.appService.isLoading.set(this.isEditMode ? 'Updating agency...' : 'Creating agency...');

    try {
      if (this.isEditMode) {
        const updateData: UpdateAgencyRequest = {
          agencyNameNative: formValue.agencyNameNative,
          agencyNameForiegn: formValue.agencyNameForiegn || undefined,
          agencyAccountCode: formValue.agencyAccountCode || undefined,
        };
        await this.agencyRepository.UpdateAgency(updateData, this.selectedAgencyCode!.toString());
        this.dialogService.openDialog('Agency updated successfully', 'success');
      } else {
        const createData: CreateAgencyRequest = {
          agencyNameNative: formValue.agencyNameNative,
          agencyNameForiegn: formValue.agencyNameForiegn || undefined,
          agencyAccountCode: formValue.agencyAccountCode || undefined,
        };
        await this.agencyRepository.SaveAgency(createData);
        this.dialogService.openDialog('Agency created successfully', 'success');
      }
      this.appService.isLoading.set(null);

      this.closeModal();
      await this.loadAgencies();
    } catch (error) {
      this.dialogService.openDialog('Error saving agency', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  goToAgencyOffices(): void {
    if (this.selectedAgencyCode === null) return;

    const agency = this.agencies().find(a => a.agencyCode === this.selectedAgencyCode);
    if (!agency?.agencyAccountCode) return;

    this.appService.officeSearchQuery.set(agency.agencyAccountCode);
    this.appService.selectedTabIndex.set(104);
  }

  async deleteAgency(): Promise<void> {
    if (this.selectedAgencyCode === null) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete travel agency?',
      message: `Agency ${this.selectedAgencyCode} will be permanently deleted.`,
      confirmText: 'Delete agency',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.appService.isLoading.set('Deleting agency...');

    try {
      await this.agencyRepository.DeleteAgency(this.selectedAgencyCode!.toString());
      this.dialogService.openDialog('Agency deleted successfully', 'success');
      this.selectedAgencyCode = null;
      await this.loadAgencies();
    } catch (error) {
      this.dialogService.openDialog('Error deleting agency', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }
}
