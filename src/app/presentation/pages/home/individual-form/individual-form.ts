import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormTextInput } from '../../../components/form-text-input';
import { Api } from '../../../../data/api';
import { PolicyRepository } from '../../../../domain/policy';
import { CustomerViewSinglePolicy } from '../../../../data/models';
import { DialogService } from '../../../../core/services/dialog';
import { AppService } from '../../../../core/services/app';
import { GeneralDataRepository } from '../../../../domain/general-data';
import { LogoLoading } from '../../../components/logo-loading/logo-loading';
import { HostListener } from '@angular/core';
import { FilesDownload } from '../../../components/files-download/files-download';
import { HasRoleDirective } from '../../../../core/directives/has-role-directive';
import { AuthorizationRepository } from '../../../../domain/authorization';
import { arabicOnlyValidator, englishOnlyValidator } from '../../../../core/validators/language';
import { numbersOnlyValidator, phoneNumberValidator } from '../../../../core/validators/number';
import { passportValidator } from '../../../../core/validators/passport';
import { PhoneNumberInputField } from '../../../components/phone-number-input-field/phone-number-input-field';

@Component({
  selector: 'app-individual-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormTextInput,
    LogoLoading,
    FilesDownload,
    HasRoleDirective,
    PhoneNumberInputField,
  ],
  templateUrl: './individual-form.html',
  styleUrl: './individual-form.css',
})
export class IndividualForm implements OnInit {
  policyRepository = inject(PolicyRepository);
  generalRepository = inject(GeneralDataRepository);
  authorizationRepository = inject(AuthorizationRepository);
  dialogService = inject(DialogService);
  apiService = inject(Api);
  appService = inject(AppService);
  fb = inject(FormBuilder);

  planType = input<number>(1);
  windowWidth = signal(window.innerWidth);

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
  }

  personalDetailsForm!: FormGroup;
  policyInfoForm!: FormGroup;
  loadingPremium = signal(false);
  premiumAmount = 0.0;
  genders = [
    { label: 'Male', code: '1' },
    { label: 'Female', code: '2' },
  ];
  periods: { label: string; code: string }[] = [];
  countries: { label: string; code: string }[] = [];
  typesOfCoverage: { label: string; code: string }[] = [];
  paymentMethods = [
    { label: 'Cash', code: '1' },
    { label: 'On Account', code: '2' },
  ];
  today = new Date().toISOString().split('T')[0];
  maxDateOfBirth = '';
  currentStep = signal<number>(0);
  private savedProgressSnapshot = '';
  steps = [
    { index: 0, label: 'Personal' },
    { index: 1, label: 'Policy' },
  ];

  private readonly fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    fatherName: 'Father Name',
    familyName: 'Family Name',
    firstNameAr: 'First Name (Arabic)',
    fatherNameAr: 'Father Name (Arabic)',
    familyNameAr: 'Family Name (Arabic)',
    address: 'Address',
    addressAr: 'Address (Arabic)',
    phoneNumber: 'Phone Number',
    faxNumber: 'Fax Number',
    passportId: 'Passport ID',
    nationality: 'Nationality',
    gender: 'Gender',
    dateOfBirth: 'Date of Birth',

    departureFrom: 'Departure From',
    destination: 'Destination',
    inceptionDate: 'Inception Date',
    period: 'Period',
    expiryDate: 'Expiry Date',
    paymentMethod: 'Payment Method',
    paymentAccountNumber: 'Account Number',
  };

  private getValidationMessage(controlName: string, errors: any): string {
    const fieldName = this.fieldLabels[controlName] ?? controlName;

    if (errors['required']) {
      return `${fieldName}: This field is required`;
    }

    if (errors['email']) {
      return `${fieldName}: Please enter a valid email address`;
    }

    if (errors['minlength']) {
      return `${fieldName}: Minimum length is ${errors['minlength'].requiredLength}`;
    }

    if (errors['maxlength']) {
      return `${fieldName}: Maximum length is ${errors['maxlength'].requiredLength}`;
    }

    if (errors['pattern']) {
      return `${fieldName}: Invalid format`;
    }

    // Your custom validators
    if (errors['englishOnly']) {
      return `${fieldName}: Only English characters are allowed`;
    }

    if (errors['arabicOnly']) {
      return `${fieldName}: Only Arabic characters are allowed`;
    }

    if (errors['numbersOnly']) {
      return `${fieldName}: Only numbers are allowed`;
    }

    if (errors['phoneNumber']) {
      return `${fieldName}: Invalid phone number`;
    }

    if (errors['passport']) {
      return `${fieldName}: Invalid passport number`;
    }
    return `${fieldName}: Invalid value`;
  }

  // nextStep() {
  //   if (this.personalDetailsForm.valid) {
  //     this.currentStep.set(this.currentStep() + 1);
  //   } else {
  //     Object.keys(this.personalDetailsForm.controls).forEach((key) => {
  //       this.personalDetailsForm.get(key)?.markAsTouched();
  //     });
  //     this.dialogService.openDialog('Personal details is not valid', 'error');
  //   }
  // }

  private getFormValidationErrors(form: FormGroup): string[] {
    const errors: string[] = [];

    Object.keys(form.controls).forEach((controlName) => {
      const control = form.get(controlName);

      if (control?.invalid) {
        control.markAsTouched();

        if (control.errors) {
          errors.push(this.getValidationMessage(controlName, control.errors));
        }
      }
    });

    return errors;
  }

  nextStep(): void {
    const errors = this.getFormValidationErrors(this.personalDetailsForm);

    if (errors.length === 0) {
      this.currentStep.set(this.currentStep() + 1);
      return;
    }

    this.dialogService.openDialog(
      `Please fix the following fields:<br><br>${errors.join('<br>')}`,
      'error',
    );
  }
  prevStep() {
    this.currentStep.set(this.currentStep() - 1);
  }

  get filesToDownload(): { label: string; url: string }[] {
    return [
      { label: this.wordingDocumentNative.label, url: this.wordingDocumentNative.url },
      { label: this.wordingDocumentForeign.label, url: this.wordingDocumentForeign.url },
    ];
  }

  get departureFromSelectedOption(): string | undefined {
    if (this.planType() !== 8) return 'PAL';
    return '';
  }

  get destinationSelectedOption(): string | undefined {
    if (this.planType() === 8) return 'PAL';
    return '';
  }

  get userCashAccount(): string {
    return this.authorizationRepository.cashAccount;
  }

  get wordingDocumentNative(): { label: string; url: string } {
    if (this.planType() === 1) {
      return {
        label: 'Policy Wording',
        url: 'https://travel.trustgroup.net/testtravel/english_wording_8.pdf',
      };
    } else if (this.planType() === 8) {
      return {
        label: 'Policy Wording - Inbound',
        url: 'https://travel.trustgroup.net/testtravel/english_wording_8_Inbound.pdf',
      };
    } else if (this.planType() === 11) {
      return {
        label: 'Policy Wording - Student',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_stu_8.pdf',
      };
    }

    return {
      label: 'NOT FOUND',
      url: '',
    };
  }

  get wordingDocumentForeign(): { label: string; url: string } {
    if (this.planType() === 1) {
      return {
        label: 'وثيقة السفر',
        url: 'https://travel.trustgroup.net/testtravel/arabic_wording_8.pdf',
      };
    } else if (this.planType() === 8) {
      return {
        label: 'وثيقة السفر - داخلي',
        url: 'https://travel.trustgroup.net/testtravel/arabic_wording_8_Inbound.pdf',
      };
    } else if (this.planType() === 11) {
      return {
        label: 'وثيقة السفر - طلاب',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_stu_8.pdf',
      };
    }

    return {
      label: 'NOT FOUND',
      url: '',
    };
  }

  async ngOnInit(): Promise<void> {
    if (
      !this.appService.updatePolicyContext() &&
      this.appService.hasPolicyInBuffer(this.planType())
    ) {
      this.appService.currentPolicyToShow.set(
        this.appService.getPolicyFromBuffer(this.planType())!,
      );
      this.appService.selectedTabIndex.set(10);
    }

    this.appService.isLoading.set('Loading form...');

    this.personalDetailsForm = this.fb.group({
      firstName: ['', [Validators.required, englishOnlyValidator()]],
      fatherName: ['', englishOnlyValidator()],
      familyName: ['', [Validators.required, englishOnlyValidator()]],

      firstNameAr: ['', [arabicOnlyValidator()]],
      fatherNameAr: ['', [arabicOnlyValidator()]],
      familyNameAr: ['', [arabicOnlyValidator()]],

      address: ['', englishOnlyValidator()],
      addressAr: ['', arabicOnlyValidator()],
      phoneNumber: ['', [Validators.required, phoneNumberValidator()]],
      faxNumber: ['', numbersOnlyValidator()],

      passportId: ['', [Validators.required, passportValidator()]],
      nationality: ['PAL', Validators.required],
      gender: ['',Validators.required],

      dateOfBirth: ['', Validators.required],
    });

    this.policyInfoForm = this.fb.group({
      departureFrom: [this.departureFromSelectedOption, Validators.required],
      destination: [this.destinationSelectedOption, Validators.required],

      inceptionDate: ['', Validators.required],
      period: ['', Validators.required],
      expiryDate: [''],

      tripCancellation: [false],
      winterSports: [false],
      covid19: [false],

      paymentMethod: ['1', Validators.required],
      paymentAccountNumber: [this.userCashAccount, Validators.required],
    });

    if (this.planType() !== 8) {
      this.policyInfoForm.get('departureFrom')?.disable();
    } else {
      this.policyInfoForm.get('destination')?.disable();
    }
    this.policyInfoForm.get('expiryDate')?.disable();

    const paymentMethodControl = this.policyInfoForm.get('paymentMethod');
    const paymentAccountNumberControl = this.policyInfoForm.get('paymentAccountNumber');
    paymentMethodControl?.valueChanges.subscribe((paymentMethod) => {
      if (paymentMethod === '1') {
        paymentAccountNumberControl?.setValue(this.userCashAccount);
      } else {
        paymentAccountNumberControl?.setValue('');
      }
      paymentAccountNumberControl?.disable();
    });
    paymentAccountNumberControl?.disable();

    // Calculate expiry date when inception date or period changes
    this.policyInfoForm.get('inceptionDate')?.valueChanges.subscribe(() => {
      this.calculateExpiryDate();
    });
    this.policyInfoForm.get('period')?.valueChanges.subscribe(() => {
      this.calculateExpiryDate();
      this.showPremium();
    });
    this.personalDetailsForm.get('dateOfBirth')?.valueChanges.subscribe(() => {
      this.showPremium();
    });
    this.policyInfoForm.get('covid19')?.valueChanges.subscribe(() => {
      this.showPremium();
    });
    this.policyInfoForm.get('tripCancellation')?.valueChanges.subscribe(() => {
      this.showPremium();
    });
    this.policyInfoForm.get('winterSports')?.valueChanges.subscribe(() => {
      this.showPremium();
    });
    this.policyInfoForm.get('destination')?.valueChanges.subscribe(() => {
      this.showPremium();
    });

    const resPeriods = await this.generalRepository.getPeriods(this.planType());
    if (resPeriods) {
      this.periods = resPeriods.map((p) => ({ label: p.periodNameNative!, code: p.periodId! }));
    }

    const resCountries = await this.generalRepository.getCountries();
    if (resCountries) {
      this.countries = resCountries.map((c) => ({ label: c.nameInEnglish!, code: c.id! }));
    }

    if (this.appService.updatePolicyContext()) {
      this.prefillFromCurrentPolicy();
    }

    this.appService.isLoading.set(null);
    const accountsReturnContext = this.appService.consumeAccountsReturnContext(
      this.appService.selectedTabIndex(),
    );
    if (accountsReturnContext?.individual) {
      this.personalDetailsForm.patchValue(accountsReturnContext.individual.personalDetails, {
        emitEvent: false,
      });
      this.policyInfoForm.patchValue(accountsReturnContext.individual.policyInfo, {
        emitEvent: false,
      });
      this.premiumAmount = accountsReturnContext.individual.premiumAmount;
      this.currentStep.set(accountsReturnContext.step);
      if (accountsReturnContext.selectedAccountCode) {
        this.policyInfoForm.patchValue({
          paymentMethod: '2',
          paymentAccountNumber: accountsReturnContext.selectedAccountCode,
        });
      }
    } else if (!this.appService.updatePolicyContext()) {
      const savedProgress = this.appService.individualFormProgress().get(this.planType());
      if (savedProgress) {
        this.personalDetailsForm.patchValue(savedProgress.personalDetails, { emitEvent: false });
        this.policyInfoForm.patchValue(savedProgress.policyInfo, { emitEvent: false });
        this.premiumAmount = savedProgress.premiumAmount;
        this.currentStep.set(savedProgress.step);
      }
    }

    const date = new Date();
    date.setDate(date.getDate() - 30);

    this.maxDateOfBirth = date.toISOString().split('T')[0];
    this.savedProgressSnapshot = this.getProgressSnapshot();
  }

  private getProgressData() {
    return {
      personalDetails: this.personalDetailsForm.getRawValue(),
      policyInfo: this.policyInfoForm.getRawValue(),
      premiumAmount: this.premiumAmount,
      step: this.currentStep(),
    };
  }

  private getProgressSnapshot(): string {
    return JSON.stringify(this.getProgressData());
  }

  hasUnsavedChanges(): boolean {
    return this.getProgressSnapshot() !== this.savedProgressSnapshot;
  }

  saveProgress(): void {
    const progress = this.getProgressData();
    this.appService.saveIndividualFormProgress(this.planType(), progress);
    this.savedProgressSnapshot = JSON.stringify(progress);
    this.personalDetailsForm.markAsPristine();
    this.policyInfoForm.markAsPristine();
  }

  discardUnsavedProgress(): void {
    this.appService.clearIndividualFormProgress(this.planType());
  }

  async resetForm(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Reset individual form?',
      message: 'All entered traveller and policy information will be cleared.',
      confirmText: 'Reset form',
      cancelText: 'Keep editing',
      tone: 'danger',
    });

    if (!confirmed) return;

    this.personalDetailsForm.reset({ nationality: 'PAL' });
    this.policyInfoForm.reset({
      departureFrom: this.departureFromSelectedOption,
      destination: this.destinationSelectedOption,
      tripCancellation: false,
      winterSports: false,
      covid19: false,
      paymentMethod: '1',
      paymentAccountNumber: this.userCashAccount,
    });

    if (this.planType() !== 8) {
      this.policyInfoForm.get('departureFrom')?.disable();
    } else {
      this.policyInfoForm.get('destination')?.disable();
    }
    this.policyInfoForm.get('expiryDate')?.disable();
    this.policyInfoForm.get('paymentAccountNumber')?.disable();

    this.currentStep.set(0);
    this.premiumAmount = 0;
    this.appService.clearIndividualFormProgress(this.planType());
    this.personalDetailsForm.markAsPristine();
    this.policyInfoForm.markAsPristine();
    this.savedProgressSnapshot = this.getProgressSnapshot();
    this.dialogService.openDialog('Individual form reset successfully', 'success');
  }

  calculateExpiryDate(): void {
    const inceptionDate = this.policyInfoForm.get('inceptionDate')?.value;
    const period = this.policyInfoForm.get('period')?.value;

    if (inceptionDate && period) {
      const date = new Date(inceptionDate);
      date.setDate(date.getDate() + Number(period) - 1);

      const expiryDate = date.toISOString().split('T')[0];
      this.policyInfoForm.patchValue({ expiryDate }, { emitEvent: false });
    }
  }

  goToAccountsTab(): void {
    this.appService.accountsReturnContext.set({
      tabIndex: this.appService.selectedTabIndex(),
      step: this.currentStep(),
      individual: {
        personalDetails: this.personalDetailsForm.getRawValue(),
        policyInfo: this.policyInfoForm.getRawValue(),
        premiumAmount: this.premiumAmount,
      },
    });
    this.appService.selectedTabIndex.set(105);
  }

  async showPremium(): Promise<void> {
    const duration = this.policyInfoForm.get('period')?.value;
    const passengerAge = Math.floor(
      (new Date().getTime() -
        new Date(this.personalDetailsForm.get('dateOfBirth')?.value).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25),
    );
    const planType = this.planType();
    const destination = this.policyInfoForm.get('destination')?.value;

    const covidFlag = this.policyInfoForm.get('covid19')?.value;
    const tripCancellationFlag = this.policyInfoForm.get('tripCancellation')?.value;
    const winterSkiFlag = this.policyInfoForm.get('winterSports')?.value;

    if (!isNaN(passengerAge) && duration && destination) {
      this.loadingPremium.set(true);

      const response = await this.policyRepository.calculatePremium([
        {
          duration: Number(duration),
          passengerAge: passengerAge,
          planType: planType,
          destinationCountryCode: destination,
          covidFlag: covidFlag,
          tripCancellationFlag: tripCancellationFlag,
          winterSkiFlag: winterSkiFlag,
        },
      ]);

      this.premiumAmount = response;

      this.loadingPremium.set(false);
    }
  }

  get isUpdateMode(): boolean {
    return this.appService.updatePolicyContext() !== null;
  }

  prefillFromCurrentPolicy(): void {
    const policy = this.appService.currentPolicyToShow() as CustomerViewSinglePolicy;
    if (!policy) return;
    const accountCode = (policy as CustomerViewSinglePolicy & { accountCode?: string | null })
      .accountCode;

    this.personalDetailsForm.patchValue(
      {
        firstName: policy.firstName ?? '',
        familyName: policy.lastName ?? '',
        firstNameAr: policy.firstNameForeign ?? '',
        familyNameAr: policy.lastNameForeign ?? '',
        phoneNumber: policy.phoneNumber ?? '',
        passportId: policy.passportNumber ?? '',
        nationality: policy.nationalityCountry ?? 'PAL',
        gender: policy.passengerGender != null ? String(policy.passengerGender) : '',
        dateOfBirth: policy.birthDate ?? '',
        address: policy.addressNative ?? '',
        addressAr: policy.addressForeign ?? '',
      },
      { emitEvent: false },
    );

    this.policyInfoForm.patchValue(
      {
        destination: policy.destinationCountryCode ?? '',
        inceptionDate: policy.startDate ?? '',
        period: String(policy.duration ?? ''),
        tripCancellation: policy.tripCancellationFlag ?? false,
        winterSports: policy.winterSkiFlag ?? false,
        covid19: policy.covidFlag ?? false,
        ...(accountCode
          ? {
              paymentMethod: accountCode === this.userCashAccount ? '1' : '2',
              paymentAccountNumber: accountCode,
            }
          : {}),
      },
      { emitEvent: false },
    );

    this.calculateExpiryDate();
    this.showPremium();
  }

  async onSavePolicy(): Promise<void> {
    if (this.policyInfoForm.valid) {
      const personalValues = this.personalDetailsForm.value;
      const policyValues = this.policyInfoForm.getRawValue();

      const policyData = {
        firstNameForeign: personalValues.firstNameAr,
        firstNameNative: personalValues.firstName,

        fatherNameForeign: personalValues.fatherNameAr,
        fatherNameNative: personalValues.fatherName,

        lastNameForeign: personalValues.familyNameAr,
        lastNameNative: personalValues.familyName,

        addressForeign: personalValues.addressAr,
        addressNative: personalValues.address,

        passportNumber: personalValues.passportId,
        phoneNumber: personalValues.phoneNumber,
        fax: personalValues.faxNumber,

        birthDate: personalValues.dateOfBirth,
        startDate: policyValues.inceptionDate,

        duration: Number(policyValues.period),
        destinationCountryCode: policyValues.destination,
        nationalityCountryCode: personalValues.nationality,
        originCountryCode: policyValues.departureFrom,

        passengerGender: personalValues.gender === '' ? 1 : parseInt(personalValues.gender),
        planType: this.planType(),

        tripCancellationFlag: policyValues.tripCancellation,
        winterSkiFlag: policyValues.winterSports,
        covidFlag: policyValues.covid19,

        accountCode: policyValues.paymentAccountNumber,
      };

      const updateContext = this.appService.updatePolicyContext();

      if (updateContext) {
        this.appService.isLoading.set('Updating policy...');
        const result = await this.policyRepository.updatePolicy(
          updateContext.refNumber,
          policyData,
          updateContext.serial,
        );

        if (result) {
          const originalStatus = (this.appService.currentPolicyToShow() as CustomerViewSinglePolicy)
            ?.policyStatus;

          this.appService.updatePolicyContext.set(null);
          this.appService.clearIndividualFormProgress(this.planType());
          this.appService.currentPolicyToShow.set({
            ...result,
            accountCode: policyValues.paymentAccountNumber,
          } as CustomerViewSinglePolicy & { accountCode?: string });
          this.appService.isLoading.set(null);

          if (originalStatus === 0)
            this.dialogService.openDialog('Draft policy updated successfully', 'success');
          else
            this.dialogService.openDialog(
              "Original policy couldn't be updated since it has already been generated.<br><br>System endorsed the original one and issued a new policy with the updated data",
              'success',
            );

          this.appService.selectedTabIndex.set(10);
        } else {
          this.appService.isLoading.set(null);
          this.dialogService.openDialog('Failed to update policy', 'error');
        }
      } else {
        this.appService.isLoading.set('Inserting policy...');
        const result = await this.policyRepository.createPolicy(policyData);

        if (result) {
          this.appService.setPolicyInBuffer(this.planType(), result);
          this.appService.clearIndividualFormProgress(this.planType());
          this.appService.currentPolicyToShow.set({
            ...result,
            accountCode: policyValues.paymentAccountNumber,
          } as CustomerViewSinglePolicy & { accountCode?: string });
          this.appService.isLoading.set(null);
          this.dialogService.openDialog('Policy inserted successfully', 'success');
          this.appService.selectedTabIndex.set(10);
        } else {
          this.appService.isLoading.set(null);
          this.dialogService.openDialog('Failed to insert policy', 'error');
        }
      }
    } else {
  const errors = this.getFormValidationErrors(this.policyInfoForm);

  this.dialogService.openDialog(
    `Please fix the following fields:<br><br>${errors.join('<br>')}`,
    'error'
  );
}
  }

  openPolicyDocument(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Check if the current tab has saved data
   */
  get hasData(): boolean {
    return this.appService.hasPolicyInBuffer(this.planType());
  }

  /**
   * Get the tab index corresponding to this form's planType
   */
  private get tabIndex(): number {
    const planTypeToTab: Record<number, number> = { 1: 0, 8: 1, 11: 2 };
    return planTypeToTab[this.planType()] ?? 0;
  }

  /**
   * Clear the saved policy data and reset the form
   */
  clearProgress(): void {
    this.appService.clearDataForTab(this.tabIndex);
    this.appService.clearIndividualFormProgress(this.planType());
    this.personalDetailsForm.reset({ nationality: 'PAL' });
    this.policyInfoForm.reset({
      departureFrom: this.departureFromSelectedOption,
      destination: this.destinationSelectedOption,
      tripCancellation: false,
      winterSports: false,
      covid19: false,
      paymentMethod: '1',
      paymentAccountNumber: this.userCashAccount,
    });
    this.premiumAmount = 0.0;
    this.currentStep.set(0);
    this.savedProgressSnapshot = this.getProgressSnapshot();
  }
}
