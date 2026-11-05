import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AppService } from '../../../../core/services/app';
import { DialogService } from '../../../../core/services/dialog';
import { GeneralDataRepository } from '../../../../domain/general-data';
import { GroupSubPolicy } from '../../../../data/models/group-sub-policy';
import { PolicyRepository } from '../../../../domain/policy';
import { FormTextInput } from '../../../components/form-text-input';
import { LogoLoading } from '../../../components/logo-loading/logo-loading';
import { GroupMemberForm } from '../../../components/group-member-form/group-member-form';
import { FilesDownload } from '../../../components/files-download/files-download';
import { CreateGroupPolicyRequest, CustomerViewGroupPolicy } from '../../../../data/models';
import { AuthorizationRepository } from '../../../../domain/authorization';
import { HasRoleDirective } from '../../../../core/directives/has-role-directive';
import { arabicOnlyValidator, englishOnlyValidator } from '../../../../core/validators/language';

type GroupDiscountMode = 'automatic' | 'manual';

@Component({
  selector: 'app-group-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormTextInput,
    LogoLoading,
    GroupMemberForm,
    FilesDownload,
    HasRoleDirective,
  ],
  templateUrl: './group-form.html',
  styleUrl: './group-form.css',
})
export class GroupForm implements OnInit {
  generalRepository = inject(GeneralDataRepository);
  dialogService = inject(DialogService);
  authorizationRepository = inject(AuthorizationRepository);
  appService = inject(AppService);
  fb = inject(FormBuilder);
  policyRepository = inject(PolicyRepository);

  companyInfoForm!: FormGroup;
  policyInfoForm!: FormGroup;
  loadingPremium = signal(false);
  premiumQuoteReady = signal(false);
  premiumAmount = signal<number>(0.0);
  automaticDiscountPercent = signal<number>(0);
  appliedDiscountPercent = signal<number>(0);
  discountMode = signal<GroupDiscountMode>('automatic');

  members: GroupSubPolicy[] = [];
  showMemberForm = signal(false);
  editingMemberIndex = signal<number | undefined>(undefined);
  memberToEdit = signal<GroupSubPolicy | undefined>(undefined);
  today = new Date().toISOString().split('T')[0];
  currentStep = signal<number>(0);
  windowWidth = signal(window.innerWidth);
  private premiumCalculationId = 0;

  steps = [
    { index: 0, label: 'Company' },
    { index: 1, label: 'Members' },
  ];

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
  }

  goToAccountsTab(): void {
    this.appService.accountsReturnContext.set({
      tabIndex: this.appService.selectedTabIndex(),
      step: this.currentStep(),
      group: {
        companyInfo: this.companyInfoForm.getRawValue(),
        policyInfo: this.policyInfoForm.getRawValue(),
        members: this.members,
        premiumAmount: this.premiumAmount(),
        automaticDiscountPercent: this.automaticDiscountPercent(),
        appliedDiscountPercent: this.appliedDiscountPercent(),
        discountMode: this.discountMode(),
      },
    });
    this.appService.selectedTabIndex.set(105);
  }

  get userCashAccount(): string {
    return this.authorizationRepository.cashAccount;
  }

  private readonly fieldLabels: Record<string, string> = {
    groupTravelType: 'Group Travel Type',
    companyNameEnglish: 'Company Name',
    companyNameArabic: 'Company Name (Arabic)',
    departureFrom: 'Departure From',
    destination: 'Destination',
    issueDate: 'Issue Date',
    inceptionDate: 'Inception Date',
    inceptionDay: 'Inception Day',
    inceptionMonth: 'Inception Month',
    inceptionYear: 'Inception Year',
    period: 'Period',
    expiryDate: 'Expiry Date',

    paymentMethod: 'Payment Method',
    paymentAccountNumber: 'Account Number',
  };

  private getValidationMessage(controlName: string, errors: Record<string, any>): string {
    const fieldName = this.fieldLabels[controlName] ?? controlName;

    if (errors['required']) {
      return `${fieldName}: This field is required`;
    }

    if (errors['englishOnly']) {
      return `${fieldName}: Only English characters are allowed`;
    }

    if (errors['arabicOnly']) {
      return `${fieldName}: Only Arabic characters are allowed`;
    }

    if (errors['numbersOnly']) {
      return `${fieldName}: Only numbers are allowed`;
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

    return `${fieldName}: Invalid value`;
  }

  private showValidationErrors(form: FormGroup): void {
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

    if (errors.length > 0) {
      this.dialogService.openDialog(
        `Please fix the following fields:<br><br>${errors.join('<br>')}`,
        'error',
      );
    }
  }

  // nextStep() {
  //   if (this.companyInfoForm.valid) {
  //     if (this.currentStep() < this.steps.length - 1) {
  //       this.currentStep.set(this.currentStep() + 1);
  //     }
  //   } else {
  //     Object.keys(this.companyInfoForm.controls).forEach((key) => {
  //       this.companyInfoForm.get(key)?.markAsTouched();
  //     });
  //     this.dialogService.openDialog('Company details is not valid', 'error');
  //   }
  // }

  nextStep(): void {
    if (this.companyInfoForm.invalid) {
      this.showValidationErrors(this.companyInfoForm);
      return;
    }

    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  get filesToDownload(): { label: string; url: string }[] {
    return [
      {
        label: 'Policy Wording - Group',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_group_8.pdf',
      },
      {
        label: 'وثيقة السفر - جماعي',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_group_8.pdf',
      },
    ];
  }

  groupTravelTypes = [{ label: 'Normal Group', code: '1' }];
  countries: { label: string; code: string }[] = [];
  periods: { label: string; code: string }[] = [];
  typesOfCoverage: { label: string; code: string }[] = [];
  paymentMethods = [
    { label: 'Cash', code: '2' },
    { label: 'On Account', code: '1' },
  ];

  get departureFromSelectedOption(): string {
    return 'PAL';
  }

  async ngOnInit(): Promise<void> {
    if (!this.appService.updatePolicyContext() && this.appService.hasPolicyInBuffer(3)) {
      this.appService.currentPolicyToShow.set(this.appService.getPolicyFromBuffer(3)!);
      this.appService.selectedTabIndex.set(10);
    }

    this.appService.isLoading.set('Loading form...');

    this.companyInfoForm = this.fb.group({
      groupTravelType: ['1'],

      companyNameEnglish: ['', [Validators.required, englishOnlyValidator()]],
      companyNameArabic: ['', arabicOnlyValidator()],

      departureFrom: ['PAL'],
      destination: ['', Validators.required],

      issueDate: ['', Validators.required],
      inceptionDate: ['', Validators.required],
      inceptionDay: [''],
      inceptionMonth: [''],
      inceptionYear: [''],
      period: ['', Validators.required],
      expiryDate: [''],
    });

    this.policyInfoForm = this.fb.group({
      paymentMethod: ['2'],
      paymentAccountNumber: [this.userCashAccount, Validators.required],
      manualDiscountPercent: [null, [Validators.min(0), Validators.max(100)]],
    });

    this.policyInfoForm.get('manualDiscountPercent')?.valueChanges.subscribe(() => {
      if (this.isRole2 && this.discountMode() === 'manual') {
        this.premiumQuoteReady.set(false);
      }
    });

    this.policyInfoForm.get('paymentMethod')?.valueChanges.subscribe((paymentMethod) => {
      this.policyInfoForm
        .get('paymentAccountNumber')
        ?.setValue(paymentMethod === '2' ? this.userCashAccount : '');
    });

    this.companyInfoForm.get('departureFrom')?.disable();

    const resCountries = await this.generalRepository.getCountries();
    if (resCountries) {
      this.countries = resCountries.map((c) => ({ label: c.nameInEnglish!, code: c.id! }));
    }

    const resPeriods = await this.generalRepository.getPeriods(1);
    if (resPeriods) {
      this.periods = resPeriods.map((p) => ({ label: p.periodNameNative!, code: p.periodId! }));
    }

    this.companyInfoForm.get('inceptionDate')?.valueChanges.subscribe(() => {
      this.calculateExpiryDate();
    });
    this.companyInfoForm.get('period')?.valueChanges.subscribe(() => {
      this.calculateExpiryDate();
    });
    this.companyInfoForm
      .get('period')
      ?.valueChanges.pipe(debounceTime(300))
      .subscribe(() => {
        this.showPremium();
      });
    this.companyInfoForm.get('destination')?.valueChanges.subscribe(() => {
      this.showPremium();
    });

    const today = new Date().toISOString().split('T')[0];
    this.companyInfoForm.patchValue({ issueDate: today });

    if (this.appService.updatePolicyContext()) {
      await this.prefillFromCurrentPolicy();
    }

    this.appService.isLoading.set(null);
    const accountsReturnContext = this.appService.consumeAccountsReturnContext(
      this.appService.selectedTabIndex(),
    );
    if (accountsReturnContext?.group) {
      this.companyInfoForm.patchValue(accountsReturnContext.group.companyInfo, {
        emitEvent: false,
      });
      this.policyInfoForm.patchValue(accountsReturnContext.group.policyInfo, {
        emitEvent: false,
      });
      this.premiumCalculationId++;
      this.loadingPremium.set(false);
      this.members = accountsReturnContext.group.members;
      this.premiumAmount.set(accountsReturnContext.group.premiumAmount);
      this.automaticDiscountPercent.set(
        accountsReturnContext.group.automaticDiscountPercent ?? 0,
      );
      this.appliedDiscountPercent.set(accountsReturnContext.group.appliedDiscountPercent ?? 0);
      this.discountMode.set(accountsReturnContext.group.discountMode ?? 'automatic');
      this.currentStep.set(accountsReturnContext.step);
      if (accountsReturnContext.selectedAccountCode) {
        this.policyInfoForm.patchValue({
          paymentAccountNumber: accountsReturnContext.selectedAccountCode,
        });
      }
      void this.showPremium(this.discountMode());
    }
  }

  calculateExpiryDate(): void {
    const inceptionDate = this.companyInfoForm.get('inceptionDate')?.value;
    const period = this.companyInfoForm.get('period')?.value;

    if (inceptionDate && period) {
      const date = new Date(inceptionDate);
      date.setDate(date.getDate() + Number(period) - 1);

      const expiryDate = date.toISOString().split('T')[0];
      this.companyInfoForm.patchValue({ expiryDate }, { emitEvent: false });
    }
  }

  async showPremium(mode: GroupDiscountMode = this.discountMode()): Promise<void> {
    const companyValues = this.companyInfoForm.getRawValue();
    var duration = companyValues.period ? Number(companyValues.period) : NaN;
    var destination = companyValues.destination;
    const calculationId = ++this.premiumCalculationId;
    const effectiveMode = this.isDiscountEligible ? mode : 'automatic';
    this.discountMode.set(effectiveMode);
    this.premiumQuoteReady.set(false);

    if (!this.isDiscountEligible) {
      this.policyInfoForm.patchValue({ manualDiscountPercent: null }, { emitEvent: false });
    }

    if (!duration || !destination || this.members.length === 0) {
      this.premiumAmount.set(0);
      this.automaticDiscountPercent.set(0);
      this.appliedDiscountPercent.set(0);
      this.loadingPremium.set(false);
      return;
    }

    this.loadingPremium.set(true);

    try {
      const manualDiscountPercent = this.isRole2 && effectiveMode === 'manual'
        ? this.policyInfoForm.get('manualDiscountPercent')?.value
        : undefined;
      const response = await this.policyRepository.calculatePremiumQuote(
        this.getPremiumQuoteRequests(),
        manualDiscountPercent === '' || manualDiscountPercent == null
          ? null
          : Number(manualDiscountPercent),
      );

      if (calculationId !== this.premiumCalculationId) return;

      const automaticDiscount =
        response.automaticDiscountPercent ?? this.getAutomaticGroupDiscountPercent(this.members.length);
      const responseDiscount =
        response.appliedDiscountPercent ??
        (effectiveMode === 'manual' ? Number(manualDiscountPercent) : automaticDiscount);
      const totalPremium =
        response.totalPremium ??
        (response.basePremium != null
          ? response.basePremium * (1 - responseDiscount / 100)
          : null);

      if (totalPremium == null || !Number.isFinite(totalPremium)) {
        throw new Error('Premium quote did not include a valid total premium.');
      }

      this.automaticDiscountPercent.set(automaticDiscount);
      this.appliedDiscountPercent.set(responseDiscount);
      this.premiumAmount.set(totalPremium);
      this.premiumQuoteReady.set(true);
    } catch {
      if (calculationId === this.premiumCalculationId) {
        this.dialogService.openDialog('Failed to calculate group premium', 'error');
      }
    } finally {
      if (calculationId === this.premiumCalculationId) {
        this.loadingPremium.set(false);
      }
    }
  }

  private getPremiumQuoteRequests() {
    const companyValues = this.companyInfoForm.getRawValue();
    return this.members.map((member) => ({
      destinationCountryCode: companyValues.destination,
      planType: 1,
      duration: Number(companyValues.period),
      passengerAge: new Date().getFullYear() - Number(member.birthDate.split('-')[0]),
      covidFlag: member.covidFlag,
      tripCancellationFlag: member.tripCancellationFlag,
      winterSkiFlag: member.winterSkiFlag,
    }));
  }
calculateAge(birthDate: string): number | string {
  if (!birthDate) return '-';

  const today = new Date();
  const dob = new Date(birthDate);

  if (Number.isNaN(dob.getTime()) || dob > today) return '-';

  let age = today.getFullYear() - dob.getFullYear();

  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() &&
      today.getDate() >= dob.getDate());

  if (!hasBirthdayPassed) {
    age--;
  }

  return age;
}
  get canRecalculateManualDiscount(): boolean {
    const control = this.policyInfoForm.get('manualDiscountPercent');
    return (
      control?.value !== null &&
      control?.value !== '' &&
      control?.valid === true &&
      !this.loadingPremium()
    );
  }

  get isDiscountEligible(): boolean {
    return this.members.length >= 10;
  }

  private getAutomaticGroupDiscountPercent(memberCount: number): number {
    if (memberCount < 10) return 0;
    if (memberCount <= 20) return 5;
    if (memberCount <= 50) return 10;
    if (memberCount <= 100) return 15;
    if (memberCount <= 250) return 20;
    return 25;
  }

  get isRole2(): boolean {
    return this.authorizationRepository.role === 2;
  }

  openAddMemberForm(): void {
    this.editingMemberIndex.set(undefined);
    this.memberToEdit.set(undefined);
    this.showMemberForm.set(true);
  }

  openEditMemberForm(index: number): void {
    this.editingMemberIndex.set(index);
    this.memberToEdit.set(this.members[index]);
    this.showMemberForm.set(true);
  }

  onMemberSave(member: GroupSubPolicy): void {
    const editIndex = this.editingMemberIndex();

    if (editIndex !== undefined) {
      this.members[editIndex] = member;
      this.dialogService.openDialog('Member updated successfully!', 'success');
    } else {
      this.members.push(member);
      this.dialogService.openDialog('Member added successfully!', 'success');
    }

    this.showMemberForm.set(false);
    this.editingMemberIndex.set(undefined);
    this.memberToEdit.set(undefined);
    this.showPremium();
  }

  onMemberFormCancel(): void {
    this.showMemberForm.set(false);
    this.editingMemberIndex.set(undefined);
    this.memberToEdit.set(undefined);
  }

  deleteMember(index: number): void {
    const member = this.members[index];
    const memberName = `${member.firstNameNative} ${member.lastNameNative}`;

    if (confirm(`Are you sure you want to delete ${memberName}?`)) {
      this.members.splice(index, 1);
      this.dialogService.openDialog('Member deleted successfully!', 'success');
    }

    this.showPremium();
  }

  get isUpdateMode(): boolean {
    return this.appService.updatePolicyContext() !== null;
  }

  async prefillFromCurrentPolicy(): Promise<void> {
    const policy = this.appService.currentPolicyToShow() as CustomerViewGroupPolicy;
    if (!policy) return;

    this.companyInfoForm.patchValue(
      {
        companyNameEnglish: policy.companyNameNative ?? '',
        companyNameArabic: policy.companyNameForeign ?? '',
        destination: policy.destinationCountryCode ?? '',
        inceptionDate: policy.startDate ?? '',
        period: String(policy.duration ?? ''),
      },
      { emitEvent: false },
    );

    if (policy.policies && policy.policies.length > 0) {
      this.members = policy.policies.map((p) => ({
        firstNameNative: p.firstName ?? '',
        lastNameNative: p.lastName ?? '',
        firstNameForeign: p.firstNameForeign ?? null,
        lastNameForeign: p.lastNameForeign ?? null,
        birthDate: p.birthDate ?? '',
        passportNumber: p.passportNumber ?? '',
        phoneNumber: p.phoneNumber ?? '',
        fax: p.fax ?? null,
        passengerGender: p.passengerGender ?? undefined,
        nationalityCountryCode: p.nationalityCountry ?? null,
        addressNative: p.addressNative ?? null,
        addressForeign: p.addressForeign ?? null,
        fatherNameNative: p.passengerFatherNameNative ?? null,
        fatherNameForeign: p.passengerFatherNameForeign ?? null,
        tripCancellationFlag: p.tripCancellationFlag ?? false,
        winterSkiFlag: p.winterSkiFlag ?? false,
        covidFlag: p.covidFlag ?? false,
      }));

      const savedPremiumTotal = policy.policies.reduce(
        (total, member) => total + (member.totalPremium ?? 0),
        0,
      );

      try {
        const quote = await this.policyRepository.calculatePremiumQuote(
          this.getPremiumQuoteRequests(),
        );
        const basePremium = quote.basePremium;
        if (basePremium == null || !Number.isFinite(basePremium) || basePremium <= 0) {
          throw new Error('Unable to determine the saved group discount.');
        }
        if (
          !Number.isFinite(savedPremiumTotal) ||
          savedPremiumTotal < 0 ||
          savedPremiumTotal > basePremium
        ) {
          throw new Error('Saved group premium is outside the expected range.');
        }

        const automaticDiscount =
          quote.automaticDiscountPercent ?? this.getAutomaticGroupDiscountPercent(this.members.length);
        const savedDiscount = Math.round((1 - savedPremiumTotal / basePremium) * 1000) / 10;
        const hasManualDiscount =
          this.isRole2 &&
          Math.abs(savedDiscount - automaticDiscount) > 0.05;
        const mode: GroupDiscountMode = hasManualDiscount ? 'manual' : 'automatic';
        const appliedDiscount = hasManualDiscount ? savedDiscount : automaticDiscount;

        this.discountMode.set(mode);
        this.policyInfoForm.patchValue(
          { manualDiscountPercent: hasManualDiscount ? savedDiscount : null },
          { emitEvent: false },
        );
        this.automaticDiscountPercent.set(automaticDiscount);
        this.appliedDiscountPercent.set(appliedDiscount);
        this.premiumAmount.set(basePremium * (1 - appliedDiscount / 100));
        this.premiumQuoteReady.set(true);
      } catch {
        this.dialogService.openDialog(
          'Failed to restore the saved group discount. Recalculate the premium before saving.',
          'error',
        );
        this.discountMode.set('automatic');
        this.policyInfoForm.patchValue({ manualDiscountPercent: null }, { emitEvent: false });
        this.showPremium('automatic');
      }
    }

    this.calculateExpiryDate();
  }

  async onSaveGroupPolicy(): Promise<void> {
    // if (!this.policyInfoForm.valid) {
    //   Object.keys(this.policyInfoForm.controls).forEach((key) => {
    //     this.policyInfoForm.get(key)?.markAsTouched();
    //   });
    //   this.dialogService.openDialog('Please fill all required fields', 'error');
    //   return;
    // }
    if (this.policyInfoForm.invalid) {
      this.showValidationErrors(this.policyInfoForm);
      return;
    }

    if (this.members.length === 0) {
      this.dialogService.openDialog('Please add at least one member to the group policy', 'error');
      return;
    }

    if (!this.premiumQuoteReady()) {
      this.dialogService.openDialog('Please recalculate the premium before saving the group policy', 'error');
      return;
    }

    const companyValues = this.companyInfoForm.getRawValue();

    const groupPolicyRequest: CreateGroupPolicyRequest = {
      planType: 3,
      destinationCountryCode: companyValues.destination,
      duration: Number(companyValues.period),
      originCountryCode: companyValues.departureFrom,

      startDate: companyValues.inceptionDate,
      companyNameNative: companyValues.companyNameEnglish,
      companyNameForeign: companyValues.companyNameArabic || null,
      policies: this.members,
      manualDiscountPercent: this.isDiscountEligible && this.isRole2 && this.discountMode() === 'manual'
        ? this.policyInfoForm.get('manualDiscountPercent')?.value ?? null
        : null,
    };

    const updateContext = this.appService.updatePolicyContext();

    if (updateContext) {
      this.appService.isLoading.set('Updating group policy...');
      const result = await this.policyRepository.updatePolicy(
        updateContext.refNumber,
        groupPolicyRequest,
      );

      if (result) {
        const originalStatus = (this.appService.currentPolicyToShow() as CustomerViewGroupPolicy)
          ?.policyStatus;
        this.appService.updatePolicyContext.set(null);
        this.appService.currentPolicyToShow.set(result);
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
        this.dialogService.openDialog('Failed to update group policy', 'error');
      }
    } else {
      this.appService.isLoading.set('Inserting group policy...');
      const result = await this.policyRepository.createPolicy(groupPolicyRequest);

      if (result) {
        this.appService.setPolicyInBuffer(3, result);
        this.appService.currentPolicyToShow.set(result);
        this.appService.selectedTabIndex.set(10);
      } else {
        this.appService.isLoading.set(null);
        this.dialogService.openDialog('Failed to insert group policy', 'error');
      }
    }
  }

  openAccountsWindow(): void {
    window.open('chooseaccount.jsp?tpp=1', '_blank');
  }

  openPolicyDocument(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Check if the group tab has saved data
   */
  get hasData(): boolean {
    return this.appService.hasPolicyInBuffer(3);
  }

  /**
   * Clear the saved policy data and reset the form
   */
  clearProgress(): void {
    this.appService.clearDataForTab(3); // Tab index 3 for Group Travel
    this.companyInfoForm.reset();
    this.policyInfoForm.reset();
    this.members = [];
    this.premiumQuoteReady.set(false);
    this.premiumAmount.set(0.0);
    this.automaticDiscountPercent.set(0);
    this.appliedDiscountPercent.set(0);
    this.discountMode.set('automatic');
    this.currentStep.set(0);
    // Reset default values
    this.companyInfoForm.patchValue({
      groupTravelType: '1',
      departureFrom: 'PAL',
    });
    this.policyInfoForm.patchValue({
      paymentMethod: '2',
      paymentReference: '1601A2A0069',
    });
    const today = new Date().toISOString().split('T')[0];
    this.companyInfoForm.patchValue({ issueDate: today });
  }
}
