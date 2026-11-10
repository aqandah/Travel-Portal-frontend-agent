import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormTextInput } from '../../../../components/form-text-input';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { AgencyCommissionRepository } from '../../../../../domain/agency-commission';
import { CreateAgencyCommissionRequest, UpdateAgencyCommissionRequest, ViewAgencyCommission } from '../../../../../data/models';

@Component({
  selector: 'app-agency-commissions-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './agency-commissions-tab.html',
})
export class AgencyCommissionsTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  agencyCommissionRepository = inject(AgencyCommissionRepository);

  private destroyRef = inject(DestroyRef);

  agencyCommissions = signal<ViewAgencyCommission[]>([]);
  filteredCommissions = signal<ViewAgencyCommission[]>([]);
  selectedBrokerCode: string | null = null;
  showCommissionModal = false;
  isEditMode = false;
  commissionForm: FormGroup;
  searchControl = new FormControl('');

  itemsPerPage = 12;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredCommissions().length / this.itemsPerPage) || 1;
  }

  get paginatedCommissions(): ViewAgencyCommission[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCommissions().slice(start, start + this.itemsPerPage);
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

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  constructor() {
    this.commissionForm = this.fb.group({
      brokerCode: ['', Validators.required],
      commissionPercent: [0, Validators.required],
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.filterCommissions(value || '');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCommissions();
  }

  async loadCommissions(): Promise<void> {
    this.appService.isLoading.set('Loading agency commissions...');

    try {
      const response = await this.agencyCommissionRepository.getAgencyCommissions();
      this.agencyCommissions.set(response);
      this.filteredCommissions.set(response);
      this.currentPage = 1;
      this.appService.isLoading.set(null);

    } catch (error) {
      this.dialogService.openDialog('Error loading agency commissions', 'error');
    }
  }

  filterCommissions(searchValue: string): void {
    if (!searchValue) {
      this.filteredCommissions.set(this.agencyCommissions());
    } else {
      const filtered = this.agencyCommissions().filter(c =>
        c.brokerCode?.toLowerCase().includes(searchValue.toLowerCase())
      );
      this.filteredCommissions.set(filtered);
    }
    this.currentPage = 1;
  }

  selectCommission(code: string): void {
    this.selectedBrokerCode = code;
  }

  openAddCommissionModal(): void {
    this.isEditMode = false;
    this.commissionForm.reset({
      brokerCode: '',
      commissionPercent: 0,
    });
    this.commissionForm.get('brokerCode')?.enable();
    this.showCommissionModal = true;
  }

  openEditCommissionModal(): void {
    if (!this.selectedBrokerCode) return;

    const commission = this.agencyCommissions().find(c => c.brokerCode === this.selectedBrokerCode);
    if (!commission) return;

    this.isEditMode = true;
    this.commissionForm.patchValue({
      brokerCode: commission.brokerCode,
      commissionPercent: commission.commissionPercent,
    });
    this.commissionForm.get('brokerCode')?.disable();
    this.showCommissionModal = true;
  }

  closeModal(): void {
    this.showCommissionModal = false;
    this.commissionForm.reset();
  }

  async saveCommission(): Promise<void> {
    if (this.commissionForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      Object.keys(this.commissionForm.controls).forEach(key => {
        this.commissionForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.commissionForm.getRawValue();
    this.appService.isLoading.set(this.isEditMode ? 'Updating commission...' : 'Creating commission...');

    try {
      if (this.isEditMode) {
        const updateData: UpdateAgencyCommissionRequest = {
          brokerCode: formValue.brokerCode,
          commissionPercent: formValue.commissionPercent,
        };
        await this.agencyCommissionRepository.updateAgencyCommission(updateData);
        this.dialogService.openDialog('Commission updated successfully', 'success');
      } else {
        const createData: CreateAgencyCommissionRequest = {
          brokerCode: formValue.brokerCode,
          commissionPercent: formValue.commissionPercent,
        };
        await this.agencyCommissionRepository.postAgencyCommission(createData);
        this.dialogService.openDialog('Commission created successfully', 'success');
      }
      this.appService.isLoading.set(null);

      this.closeModal();
      await this.loadCommissions();
    } catch (error) {
      this.dialogService.openDialog('Error saving commission', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  async deleteCommission(): Promise<void> {
    if (!this.selectedBrokerCode) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete agency commission?',
      message: `Commission for broker ${this.selectedBrokerCode} will be permanently deleted.`,
      confirmText: 'Delete commission',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.appService.isLoading.set('Deleting commission...');

    try {
      await this.agencyCommissionRepository.deleteAgencyCommission(this.selectedBrokerCode);
      this.dialogService.openDialog('Commission deleted successfully', 'success');
      this.selectedBrokerCode = null;
      await this.loadCommissions();
    } catch (error) {
      this.dialogService.openDialog('Error deleting commission', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }
}
