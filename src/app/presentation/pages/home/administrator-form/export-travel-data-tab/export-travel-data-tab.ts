import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormTextInput } from '../../../../components/form-text-input';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { PolicyRepository } from '../../../../../domain/policy';

@Component({
  selector: 'app-export-travel-data-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './export-travel-data-tab.html',
})
export class ExportTravelDataTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  policyRespository = inject(PolicyRepository);
  exportForm: FormGroup;

  constructor() {
    this.exportForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required]
    });
  }

  async onExport(): Promise<void> {
    if (this.exportForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      return;
    }

    const formValue = this.exportForm.value;

    const fromDate = new Date(formValue.fromDate);
    const toDate = new Date(formValue.toDate);

    if (fromDate > toDate) {
      this.dialogService.openDialog('From Date cannot be later than To Date', 'error');
      return;
    }
    this.appService.isLoading.set("Building Travel Data Report...")

    try {
      await this.policyRespository.ExportTravelData(formValue.fromDate, formValue.toDate);
      this.appService.isLoading.set(null)

      this.appService.isLoading.set(null);
    } catch (error) {
      this.dialogService.openDialog('Error exporting travel data', 'error');
      this.appService.isLoading.set(null);
    }
  }
}
