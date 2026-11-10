import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormTextInput } from '../../../../components/form-text-input';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { TravelPriceRepository } from '../../../../../domain/travel-price';
import { CreateTravelPriceRequest, UpdateTravelPriceRequest, ViewTravelPrice } from '../../../../../data/models';

@Component({
  selector: 'app-travel-prices-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './travel-prices-tab.html',
})
export class TravelPricesTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  travelPriceRepository = inject(TravelPriceRepository);

  private destroyRef = inject(DestroyRef);

  prices = signal<ViewTravelPrice[]>([]);
  filteredPrices = signal<ViewTravelPrice[]>([]);
  selectedPrice: ViewTravelPrice | null = null;
  showPriceModal = false;
  showFilterModal = false;
  isEditMode = false;
  priceForm: FormGroup;
  filterForm: FormGroup;
  searchControl = new FormControl('');

  itemsPerPage = 15;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredPrices().length / this.itemsPerPage) || 1;
  }

  get paginatedPrices(): ViewTravelPrice[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPrices().slice(start, start + this.itemsPerPage);
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

  travelTypeOptions = [
    { label: 'Individual', value: 1 },
    { label: 'Student', value: 11 },
    { label: 'Family', value: 2 },
    { label: 'Group', value: 3 },
    { label: 'Hajj Basic', value: 4 },
    { label: 'Hajj Plus', value: 5 },
    { label: 'Hajj Extra', value: 6 },
    { label: 'Individual Inbound', value: 8 }
  ];

  areaOptions = [
    { label: 'Worldwide Excluding USA', value: 1 },
    { label: 'Worldwide (Excluding USA)-Stud', value: 11 },
    { label: 'Worldwide-Stud', value: 12 },
    { label: 'Worldwide Including USA', value: 2 }
  ];

  periodOptions = [
    { label: 'Upto 7 Days', value: 7 },
    { label: 'Upto 10 Days', value: 10 },
    { label: 'Upto 14 Days', value: 14 },
    { label: 'Upto 20 Days', value: 20 },
    { label: 'Upto 30 Days', value: 30 },
    { label: 'Upto 45 Days', value: 45 },
    { label: 'Upto 60 Days', value: 60 },
    { label: 'Upto 75 Days', value: 75 },
    { label: 'Upto 90 Days', value: 90 },
    { label: '120 Days (92 days/trip)', value: 120 },
    { label: '120 days (120 days per trip)', value: 119 },
    { label: '180 Days (92 days/trip)', value: 180 },
    { label: '180 Days (max 180 days per trip)', value: 179 },
    { label: 'Annual Multi Trip (100 days/trip)', value: 365 },
    { label: 'Annual Multi Trip (max 180 days per trip)', value: 364 },
    { label: '2 Years (100 days/trip)', value: 730 }
  ];

  constructor() {
    this.priceForm = this.fb.group({
      planType: [null, Validators.required],
      typeOfCoverage: [null, Validators.required],
      period: [null, Validators.required],
      ageFrom: [0, Validators.required],
      ageTo: [0, Validators.required],
      code: [0, Validators.required],
      codeOp: [0],
      reInsurance: [0],
      premium: [0],
      retention: [0],
      commission: [0],
      amman: [0],
      fees1: [0],
      fees2: [0],
      fees3: [0],
      fees4: [0],
    });

    this.filterForm = this.fb.group({
      planType: [null],
      typeOfCoverage: [null],
      period: [null],
      ageFrom: [null],
      ageTo: [null]
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.filterByCode(value || '');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadPrices();
  }

  async loadPrices(): Promise<void> {
    this.appService.isLoading.set('Loading travel prices...');

    try {
      const response = await this.travelPriceRepository.getTravelPrices();
      this.prices.set(response);
      this.filteredPrices.set(response);
      this.currentPage = 1;
      this.appService.isLoading.set(null);
    } catch (error) {
      this.dialogService.openDialog('Error loading travel prices', 'error');
      this.appService.isLoading.set(null);
    }
  }

  filterByCode(searchValue: string): void {
    if (!searchValue) {
      this.applyFilters();
    } else {
      const filtered = this.filteredPrices().filter(p =>
        p.code?.toString().includes(searchValue)
      );
      this.filteredPrices.set(filtered);
    }
    this.currentPage = 1;
  }

  selectPrice(price: ViewTravelPrice): void {
    this.selectedPrice = price;
  }

  isPriceSelected(price: ViewTravelPrice): boolean {
    if (!this.selectedPrice) return false;
    return this.selectedPrice.planType === price.planType &&
      this.selectedPrice.typeOfCoverage === price.typeOfCoverage &&
      this.selectedPrice.period === price.period &&
      this.selectedPrice.ageFrom === price.ageFrom &&
      this.selectedPrice.ageTo === price.ageTo;
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

  openAddPriceModal(): void {
    this.isEditMode = false;
    this.priceForm.reset({
      planType: null,
      typeOfCoverage: null,
      period: null,
      ageFrom: 0,
      ageTo: 0,
      code: 0,
      codeOp: 0,
      reInsurance: 0,
      premium: 0,
      retention: 0,
      commission: 0,
      amman: 0,
      fees1: 0,
      fees2: 0,
      fees3: 0,
      fees4: 0,
    });
    this.priceForm.get('planType')?.enable();
    this.priceForm.get('typeOfCoverage')?.enable();
    this.priceForm.get('period')?.enable();
    this.showPriceModal = true;
  }

  openEditPriceModal(): void {
    if (!this.selectedPrice) return;

    this.isEditMode = true;
    this.priceForm.patchValue({
      planType: this.selectedPrice.planType,
      typeOfCoverage: this.selectedPrice.typeOfCoverage,
      period: this.selectedPrice.period,
      ageFrom: this.selectedPrice.ageFrom,
      ageTo: this.selectedPrice.ageTo,
      code: this.selectedPrice.code,
      codeOp: this.selectedPrice.codeOp,
      reInsurance: this.selectedPrice.reInsurance,
      premium: this.selectedPrice.premium,
      retention: this.selectedPrice.retention,
      commission: this.selectedPrice.commission,
      amman: this.selectedPrice.amman,
      fees1: this.selectedPrice.fees1,
      fees2: this.selectedPrice.fees2,
      fees3: this.selectedPrice.fees3,
      fees4: this.selectedPrice.fees4,
    });
    this.priceForm.get('planType')?.disable();
    this.priceForm.get('typeOfCoverage')?.disable();
    this.priceForm.get('period')?.disable();
    this.showPriceModal = true;
  }

  async deleteTravelPriceRecord(): Promise<void> {
    if (!this.selectedPrice) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete travel price?',
      message: 'The selected travel pricing record will be permanently deleted.',
      confirmText: 'Delete price',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.appService.isLoading.set('Deleting travel price...');

    try {
      await this.travelPriceRepository.deleteTravelPrice(
        this.selectedPrice?.planType ?? (() => { throw new Error('Plan type is missing!'); })(),
        this.selectedPrice?.typeOfCoverage ?? (() => { throw new Error('Type of coverage is missing!'); })(),
        this.selectedPrice?.period ?? (() => { throw new Error('Period is missing!'); })(),
        this.selectedPrice?.ageFrom ?? (() => { throw new Error('Age from is missing!'); })(),
        this.selectedPrice?.ageTo ?? (() => { throw new Error('Age to is missing!'); })()
      );
      this.dialogService.openDialog('Travel price deleted successfully', 'success');
      this.selectedPrice = null;
      await this.loadPrices();
    } catch (error) {
      this.dialogService.openDialog('Error deleting travel price', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  closePriceModal(): void {
    this.showPriceModal = false;
    this.priceForm.reset();
  }

  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  applyFilters(): void {
    const filters = this.filterForm.getRawValue();
    let filtered = [...this.prices()];

    if (filters.planType !== null) {
      filtered = filtered.filter(p => p.planType === filters.planType);
    }
    if (filters.typeOfCoverage !== null) {
      filtered = filtered.filter(p => p.typeOfCoverage === filters.typeOfCoverage);
    }
    if (filters.period !== null) {
      filtered = filtered.filter(p => p.period === filters.period);
    }
    if (filters.ageFrom !== null) {
      filtered = filtered.filter(p => (p.ageFrom ?? 0) >= filters.ageFrom);
    }
    if (filters.ageTo !== null) {
      filtered = filtered.filter(p => (p.ageTo ?? 999) <= filters.ageTo);
    }

    this.filteredPrices.set(filtered);
    this.currentPage = 1;
    this.closeFilterModal();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.filteredPrices.set([...this.prices()]);
    this.currentPage = 1;
    this.closeFilterModal();
  }

  getTypeName(type: number | undefined): string {
    if (type === undefined) return '-';
    return this.travelTypeOptions.find(t => t.value === type)?.label || type.toString();
  }

  getAreaName(area: number | undefined): string {
    if (area === undefined) return '-';
    return this.areaOptions.find(a => a.value === area)?.label || area.toString();
  }

  getPeriodName(period: number | undefined): string {
    if (period === undefined) return '-';
    return this.periodOptions.find(p => p.value === period)?.label || period.toString();
  }

  async savePrice(): Promise<void> {
    if (this.priceForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      Object.keys(this.priceForm.controls).forEach(key => {
        this.priceForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.priceForm.getRawValue();
    this.appService.isLoading.set(this.isEditMode ? 'Updating price...' : 'Creating price...');

    try {
      if (this.isEditMode) {
        const updateData: UpdateTravelPriceRequest = {
          ageFrom: formValue.ageFrom,
          ageTo: formValue.ageTo,
          codeOp: formValue.codeOp,
          reInsurance: formValue.reInsurance,
          premium: formValue.premium,
          retention: formValue.retention,
          commission: formValue.commission,
          amman: formValue.amman,
          fees1: formValue.fees1,
          fees2: formValue.fees2,
          fees3: formValue.fees3,
          fees4: formValue.fees4,
        };
        await this.travelPriceRepository.updateTravelPrice(
          formValue.planType,
          formValue.typeOfCoverage,
          formValue.period,
          this.selectedPrice?.ageFrom ?? (() => { throw new Error('Age from is missing!'); })(),
          this.selectedPrice?.ageTo ?? (() => { throw new Error('Age to is missing!'); })(),
          updateData
        );
        this.dialogService.openDialog('Price updated successfully', 'success');
      } else {
        const createData: CreateTravelPriceRequest = {
          planType: formValue.planType,
          typeOfCoverage: formValue.typeOfCoverage,
          period: formValue.period,
          ageFrom: formValue.ageFrom,
          ageTo: formValue.ageTo,
          code: formValue.code,
          codeOp: formValue.codeOp,
          reInsurance: formValue.reInsurance,
          premium: formValue.premium,
          retention: formValue.retention,
          commission: formValue.commission,
          amman: formValue.amman,
          fees1: formValue.fees1,
          fees2: formValue.fees2,
          fees3: formValue.fees3,
          fees4: formValue.fees4,
        };
        await this.travelPriceRepository.addTravelPrice(createData);
        this.dialogService.openDialog('Price created successfully', 'success');
      }
      this.appService.isLoading.set(null);

      this.closePriceModal();
      await this.loadPrices();
    } catch (error) {
      this.dialogService.openDialog('Error saving price', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }
}
