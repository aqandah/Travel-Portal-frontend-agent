import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormTextInput } from '../../../../components/form-text-input';
import { PolicyDetails } from '../../../../components/policy-details/policy-details';
import { AppService } from '../../../../../core/services/app';
import { DialogService } from '../../../../../core/services/dialog';
import { PolicyRepository } from '../../../../../domain/policy';
import { CustomerViewGroupPolicy, CustomerViewSinglePolicy } from '../../../../../data/models';

@Component({
  selector: 'app-cancel-policy-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput, PolicyDetails],
  templateUrl: './cancel-policy-tab.html',
})
export class CancelPolicyTab {
  fb = inject(FormBuilder);
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  dialogService = inject(DialogService);
  policyRepository = inject(PolicyRepository);

  searchForm: FormGroup;
  isGroupPolicy = false;
  policyToCancel: CustomerViewSinglePolicy | null = null;

  constructor() {
    this.searchForm = this.fb.group({
      policyNumber: ['', Validators.required],
      groupMemberSerial: ['0', Validators.required]
    });
  }

  async onViewPolicy(): Promise<void> {
    if (this.searchForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      return;
    }

    const formValue = this.searchForm.value;
    this.appService.isLoading.set('Searching for policy...');

    const response = await this.policyRepository.endorsePolicy(formValue.policyNumber, true);
    if ((response as CustomerViewSinglePolicy).isActive) {
      this.appService.currentPolicyToShow.set(response as CustomerViewSinglePolicy);
      this.policyToCancel = response as CustomerViewSinglePolicy;

    } else if (response as CustomerViewGroupPolicy) {
      this.appService.currentPolicyToShow.set(response as CustomerViewGroupPolicy);
      this.policyToCancel = response as CustomerViewGroupPolicy;
    }

    this.appService.isLoading.set(null);
  }

  async onCancelPolicy(): Promise<void> {
    // TODO: Implement the policy cancellation logic
    // Example:
    const formValue = this.searchForm.value;

    this.appService.isLoading.set('Cancelling policy...');
    try {
      await this.policyRepository.endorsePolicy(
        formValue.policyNumber,
        false
      );

      this.dialogService.openDialog('Policy cancelled successfully', 'success');
    } catch (e) {
      this.dialogService.openDialog('Error cancelling policy', 'error');
    }

    this.appService.isLoading.set(null);

    this.policyToCancel = null
  }

  clearPolicy(): void {
    this.policyToCancel = null;
    this.isGroupPolicy = false;
    this.appService.currentPolicyToShow.set(null);
  }
}
