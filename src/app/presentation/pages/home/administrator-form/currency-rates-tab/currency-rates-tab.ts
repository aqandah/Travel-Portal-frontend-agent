import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyRateViewDto } from '../../../../../data/models';
import { CurrencyRatesRespository } from '../../../../../domain/currency-rates';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { FormTextInput } from '../../../../components/form-text-input';

@Component({
  selector: 'app-currency-rates-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './currency-rates-tab.html',
})
export class CurrencyRatesTab {
  currencyRateRepository = inject(CurrencyRatesRespository)
  appService = inject(AppService)

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  fb = inject(FormBuilder)
  dialogService = inject(DialogService)

  rates = signal<CurrencyRateViewDto[]>([]);
  currencyRateForm: FormGroup;

  selectedRateId: number | null = 390;

  constructor() {
    this.currencyRateForm = this.fb.group({
      startDate: ['', Validators.required],
      exchangeRate: ['', [Validators.required, Validators.min(0)]]
    });
  }

  async ngOnInit() {
    await this.refreshTable();
  }

  async addCurrencyRate(): Promise<void> {
    if (this.currencyRateForm.invalid) {
      this.dialogService.openDialog('Date is invalid', "error");
      return;
    }

    const formValue = this.currencyRateForm.value;
    this.appService.isLoading.set("Adding currency rate...");
    try {
      await this.currencyRateRepository.addCurrencyRate({
        exchangeRate: formValue.exchangeRate,
        startingDate: formValue.startDate
      });

      this.refreshTable();
      this.currencyRateForm.reset();

      this.appService.isLoading.set(null);
    } catch (error) {
      this.dialogService.openDialog('Error adding currency rate', "error");
      this.appService.isLoading.set(null);
    }
  }

  async deleteCurrencyRate(): Promise<void> {
    if (this.selectedRateId !== null) {
      const confirmed = await this.dialogService.confirm({
        title: 'Delete currency rate?',
        message: 'The selected currency rate will be permanently deleted.',
        confirmText: 'Delete rate',
        tone: 'danger',
      });
      if (!confirmed) return;

      this.appService.isLoading.set("Deleting currency rate...");
      try {
        await this.currencyRateRepository.deleteCurrencyRate(this.selectedRateId);

        this.refreshTable();
        this.selectedRateId = null;
        this.appService.isLoading.set(null);

      } catch (error) {
        this.appService.isLoading.set(null);
        this.dialogService.openDialog('Error deleting currency rate', "error");
      }
    }
  }

  async refreshTable(): Promise<void> {
    this.appService.isLoading.set("Refreshing currency rates...");
    this.rates.set(await this.currencyRateRepository.getCurrencyRates() || []);
    this.appService.isLoading.set(null);
  }

  selectRate(id: number | undefined): void {
    if (id !== undefined) {
      this.selectedRateId = id;
      ;
    }
  }
}
