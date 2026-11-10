import { Component, computed, inject, signal } from '@angular/core';
import { GeneralDataRepository } from '../../../domain/general-data';
import { AppService } from '../../../core/services/app';
import { PolicyRepository } from '../../../domain/policy';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../core/services/dialog';
import { CustomerViewGroupPolicy, CustomerViewSinglePolicy } from '../../../data/models';
import { FilesDownload } from '../files-download/files-download';
import { AuthorizationRepository } from '../../../domain/authorization';
import { Price } from '../price';

type IndividualPolicyDetails = CustomerViewSinglePolicy & {
  hasEndorsedVersion?: boolean;
};

@Component({
  selector: 'app-policy-details',
  imports: [FormsModule, CommonModule, FilesDownload, Price],
  templateUrl: './policy-details.html',
})
export class PolicyDetails {
  generalRepository = inject(GeneralDataRepository);
  policyRepository = inject(PolicyRepository);
  appService = inject(AppService);
  dialogService = inject(DialogService);
  authRepo = inject(AuthorizationRepository);

  isGroupPolicy = computed(() => {
    const p = this.appService.currentPolicyToShow();
    return p != null && Array.isArray((p as CustomerViewGroupPolicy).policies);
  });

  singlePolicy = computed(() => this.appService.currentPolicyToShow() as IndividualPolicyDetails);
  groupPolicy = computed(() => this.appService.currentPolicyToShow() as CustomerViewGroupPolicy);

  policy = computed(() => this.appService.currentPolicyToShow());
  hasEndorsedVersion = computed(
    () => !this.isGroupPolicy() && this.singlePolicy().hasEndorsedVersion === true,
  );
  printingBlocked = computed(() => this.hasEndorsedVersion());
  printRestrictionMessage =
    'This policy has an endorsed version. Print the endorsed policy instead.';
  sortedPolicies = computed(() =>
    [...(this.groupPolicy().policies ?? [])].sort((a, b) => (a.serial ?? 0) - (b.serial ?? 0)),
  );

  periodTextNative = signal<string>('');
  periodTextForeign = signal<string>('');

  destinationCountryNameNative = signal<string>('');
  destinationCountryNameForeign = signal<string>('');

  originCountryNameNative = signal<string>('');
  originCountryNameForeign = signal<string>('');

  typeofCoverageNameNative = signal<string>('');
  typeofCoverageNameForeign = signal<string>('');

  nationalityNameNative = signal<string>('');
  nationalityNameForeign = signal<string>('');

  expiryDate = signal<string>('');
  isDraft!: boolean;
  originalPolicyGenerated = false;
  selectedCoverages = computed(() => {
    if (this.singlePolicy().planType === 8) {
      return ['COVID-19 Coverage · Up to USD 10,000'];
    }

    return [
      { label: 'Trip Cancellation · Up to USD 5,000', selected: this.singlePolicy().tripCancellationFlag },
      { label: 'Winter Ski / Summer Sports', selected: this.singlePolicy().winterSkiFlag },
      { label: 'COVID-19 Coverage · Up to EUR 30,000', selected: this.singlePolicy().covidFlag },
    ]
      .filter((coverage) => coverage.selected === true)
      .map((coverage) => coverage.label);
  });

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const parts = iso.split('T')[0].split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  get totalPremium(): number {
    const policy = this.groupPolicy();
    if (!policy.policies) return 0;
    return policy.policies.reduce((sum, p) => sum + (p.totalPremium ?? 0), 0);
  }

  get membersCount(): number {
    return this.groupPolicy().policies?.length ?? 0;
  }

  async backToPreviousView(): Promise<void> {
    const subPolicyContext = this.appService.subPolicyContext();
    if (subPolicyContext) {
      this.appService.isLoading.set('Loading Group Policy');
      try {
        const groupPolicy = await this.policyRepository.getPolicyByRefNumber(
          subPolicyContext.refNumber,
        );
        if (groupPolicy) {
          this.appService.currentPolicyToShow.set(groupPolicy);
          this.appService.subPolicyContext.set(null);
        }
      } finally {
        this.appService.isLoading.set(null);
      }
      return;
    }

    const planType = this.isGroupPolicy() ? 3 : this.policy()?.planType;
    const formTabByPlanType: Record<number, number> = {
      1: 0,
      3: 3,
      8: 1,
      11: 2,
    };

    if (planType != null && this.appService.hasPolicyInBuffer(planType)) {
      this.appService.currentPolicyToShow.set(null);
      this.appService.clearDataForTab(formTabByPlanType[planType] ?? 4);
      return;
    }

    if ((this.appService.inquiryResults()?.length ?? 0) > 0) {
      this.appService.selectedTabIndex.set(11);
      return;
    }

    this.appService.selectedTabIndex.set(
      planType == null ? 4 : (formTabByPlanType[planType] ?? 4),
    );
  }

  async ngOnInit() {
    this.isDraft = this.policy()?.policyStatus === 0;

    // When landing on a group policy, clear any stale sub-policy context
    if (this.isGroupPolicy()) {
      this.appService.subPolicyContext.set(null);
    }

    this.appService.isLoading.set('Loading Policy Details');
    await this.loadCountryTexts();
    await this.loadPeriodText();
    await this.loadTypeOfCoverageText();

    this.calculateExpiryDate();
    this.appService.isLoading.set(null);
  }

  calculateExpiryDate(): void {
    const policy = this.singlePolicy();
    if (policy.startDate && policy.duration) {
      const start = new Date(policy.startDate);
      start.setDate(start.getDate() + policy.duration - 1);
      this.expiryDate.set(start.toISOString().split('T')[0]);
    }
  }

  wordingDocumentNative = computed(() => {
    const planType = this.singlePolicy().planType;

    if (planType === 1) {
      return {
        label: 'Policy Wording',
        url: 'https://travel.trustgroup.net/testtravel/english_wording_8.pdf',
      };
    } else if (planType === 3) {
      return {
        label: 'Policy Wording - Group',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_group_8.pdf',
      };
    } else if (planType === 8) {
      return {
        label: 'Policy Wording - Inbound',
        url: 'https://travel.trustgroup.net/testtravel/english_wording_8_Inbound.pdf',
      };
    } else if (planType === 11) {
      return {
        label: 'Policy Wording - Student',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_stu_8.pdf',
      };
    }
    return { label: 'NOT FOUND', url: '' };
  });

  wordingDocumentForeign = computed(() => {
    const planType = this.singlePolicy().planType;
    if (planType === 1) {
      return {
        label: 'وثيقة العلاج والمساعدة الطبية',
        url: 'https://travel.trustgroup.net/testtravel/arabic_wording_8.pdf',
      };
    } else if (planType === 3) {
      return {
        label: 'وثيقة سفر جماعي',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_group_8.pdf',
      };
    } else if (planType === 8) {
      return {
        label: 'وثيقة العلاج والمساعدة الطبية - داخلي',
        url: 'https://travel.trustgroup.net/testtravel/arabic_wording_8_Inbound.pdf',
      };
    } else if (planType === 11) {
      return {
        label: 'وثيقة سفر طلاب',
        url: 'https://travel.trustgroup.net/testtravel/eng_wording_stu_8.pdf',
      };
    }
    return { label: 'NOT FOUND', url: '' };
  });

  get filesToDownload(): { label: string; url: string }[] {
    return [
      { label: this.wordingDocumentNative().label, url: this.wordingDocumentNative().url },
      { label: this.wordingDocumentForeign().label, url: this.wordingDocumentForeign().url },
    ];
  }

  async loadPeriodText(): Promise<void> {
    const periods = await this.generalRepository.getPeriods(1);
    if (periods) {
      const duration = this.singlePolicy().duration;
      const matchedPeriod = periods.find((p) => parseInt(p.periodId ?? '') === duration);
      this.periodTextNative.set(matchedPeriod?.periodNameNative ?? '');
      this.periodTextForeign.set(matchedPeriod?.periodNameForeign ?? '');
    }
  }

  async loadCountryTexts(): Promise<void> {
    const countries = await this.generalRepository.getCountries();
    if (!countries) return;

    const destCode = this.singlePolicy().destinationCountryCode;
    const destinationCountry = countries.find((p) => p.id === destCode);
    this.destinationCountryNameNative.set(destinationCountry?.nameInEnglish ?? '');
    this.destinationCountryNameForeign.set(destinationCountry?.nameInArabic ?? '');

    if (this.isGroupPolicy()) {
      const originCountry = countries.find((p) => p.id === this.groupPolicy().originCountryCode);
      this.originCountryNameNative.set(originCountry?.nameInEnglish ?? '');
      this.originCountryNameForeign.set(originCountry?.nameInArabic ?? '');
    } else {
      const nationalityCountry = countries.find(
        (p) => p.id === this.singlePolicy().nationalityCountry,
      );
      this.nationalityNameNative.set(nationalityCountry?.nameInEnglish ?? '');
      this.nationalityNameForeign.set(nationalityCountry?.nameInArabic ?? '');
    }
  }

  async loadTypeOfCoverageText(): Promise<void> {
    const types = await this.generalRepository.getTypesOfCoverage(1);
    if (types) {
      const typeOfCoverage = this.singlePolicy().typeOfCoverage;
      const matchedType = types.find((p) => parseInt(p.typeOfCoverageId ?? '') === typeOfCoverage);
      this.typeofCoverageNameNative.set(matchedType?.typeOfCoverageNameNative ?? '');
      this.typeofCoverageNameForeign.set(matchedType?.typeOfCoverageNameForeign ?? '');
    }
  }

  async handleMemberClick(referenceKey: string): Promise<void> {
    this.appService.isLoading.set('Loading Sub Policy Details');
    const policy = this.groupPolicy().policies?.find((p) => p.referenceKey === referenceKey)!;

    // Store the group ref number and member serial separately before the display string is built
    this.appService.subPolicyContext.set({
      refNumber: policy.referenceKey ?? '',
      serial: policy.serial ?? 0,
    });

    const informativePolicy: CustomerViewSinglePolicy = {
      referenceKey: policy.referenceKey + ' ' + policy.serial,
      fullNameNative: [policy.firstName, policy.lastName].filter(Boolean).join(' ') || null,
      fullNameForeign:
        [policy.firstNameForeign, policy.lastNameForeign].filter(Boolean).join(' ') || null,
      birthDate: policy.birthDate,
      passengerGender: policy.passengerGender,
      nationalityCountry: policy.nationalityCountry,
      passportNumber: policy.passportNumber,
      duration: policy.duration,
      destinationCountryCode: policy.destinationCountryCode,
      startDate: policy.startDate,
      firstName: policy.firstName,
      lastName: policy.lastName,
      firstNameForeign: policy.firstNameForeign,
      lastNameForeign: policy.lastNameForeign,
      typeOfCoverage: policy.typeOfCoverage,
      addressNative: policy.addressNative,
      addressForeign: policy.addressForeign,
      phoneNumber: policy.phoneNumber,
      planType: policy.planType,
      tripCancellationFlag: policy.tripCancellationFlag,
      winterSkiFlag: policy.winterSkiFlag,
      covidFlag: policy.covidFlag,
      totalPremium: policy.totalPremium,
    };
    this.appService.currentPolicyToShow.set(informativePolicy);
    this.appService.isLoading.set(null);
    this.appService.selectedTabIndex.set(10);
  }

  getGenderText(gender: number | null | undefined): { en: string; ar: string } {
    if (gender === 1) return { en: 'Male', ar: 'ذكر' };
    if (gender === 2) return { en: 'Female', ar: 'أنثى' };
    return { en: 'N/A', ar: 'غير محدد' };
  }

  async requestPrintPolicy(): Promise<void> {
    if (this.printingBlocked()) {
      this.dialogService.openDialog(this.printRestrictionMessage, 'error');
      return;
    }

  this.appService.isLoading.set('Preparing Policy Document');

  const key = this.isGroupPolicy()
    ? (this.groupPolicy().policyNumber ?? '')
    : (this.singlePolicy().referenceKey ?? '');

  try {
    await this.policyRepository.printPolicy(key, this.isDraft);

    // Hide Draft and Update Policy only after printing Original.
    if (!this.isDraft) {
      this.originalPolicyGenerated = true;
    }
  } finally {
    this.appService.isLoading.set(null);
  }
}

  updatePolicy(): void {
    if (this.isGroupPolicy()) {
      // Full group policy update — no serial needed
      this.appService.updatePolicyContext.set({ refNumber: this.groupPolicy().policyNumber ?? '' });
      this.appService.selectedTabIndex.set(3);
    } else {
      const planType = this.singlePolicy().planType ?? 1;
      const tabIndex = planType === 8 ? 1 : planType === 11 ? 2 : 0;

      const subCtx = this.appService.subPolicyContext();
      if (subCtx) {
        // Sub-policy (member of a group): use the stored group ref number and real serial
        this.appService.updatePolicyContext.set({
          refNumber: subCtx.refNumber,
          serial: subCtx.serial,
        });
      } else {
        // Standalone single policy: use the referenceKey as-is, serial = 0
        this.appService.updatePolicyContext.set({
          refNumber: this.singlePolicy().referenceKey ?? '',
          serial: 0,
        });
      }

      this.appService.selectedTabIndex.set(tabIndex);
    }
  }
}
