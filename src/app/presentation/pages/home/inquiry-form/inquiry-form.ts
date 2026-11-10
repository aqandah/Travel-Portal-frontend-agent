import { Component, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormTextInput } from '../../../components/form-text-input';
import { AppService } from '../../../../core/services/app';
import { PolicyRepository } from '../../../../domain/policy';
import { InquiryGroupPolicyRequestDto, InquirySinglePolicyRequestDto, SelectMenuRecord } from '../../../../data/models';
import { OfficeRepository } from '../../../../domain/office';
import { englishOnlyValidator } from '../../../../core/validators/language';
import { passportValidator } from '../../../../core/validators/passport';

@Component({
  selector: 'app-inquiry-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormTextInput,
  ],
  templateUrl: './inquiry-form.html',
  styleUrl: './inquiry-form.css',
})
export class InquiryForm implements OnInit {
  selectedTab: 'individual' | 'group' = 'individual';
  individualForm!: FormGroup;
  groupForm!: FormGroup;
  officeRepo = inject(OfficeRepository)

  appService = inject(AppService)
  policyRepository = inject(PolicyRepository)

  policyTypes = [
    { label: 'Select policy type', code: '' },
    { label: 'Individual', code: '1' },
    { label: 'Student', code: '11' },
    { label: 'Family', code: '2' },
    { label: 'Group', code: '3' },
    { label: 'Hajj Basic', code: '4' },
    { label: 'Hajj Plus', code: '5' },
    { label: 'Hajj Extra', code: '6' },
    { label: 'Individual Inbound', code: '8' },
  ];

  periods = [
    { label: 'Select period', code: '' },
    { label: 'Upto 7 Days', code: '7' },
    { label: 'Upto 10 Days', code: '10' },
    { label: 'Upto 14 Days', code: '14' },
    { label: 'Upto 20 Days', code: '20' },
    { label: 'Upto 30 Days', code: '30' },
    { label: 'Upto 45 Days', code: '45' },
    { label: 'Upto 60 Days', code: '60' },
    { label: 'Upto 75 Days', code: '75' },
    { label: 'Upto 90 Days', code: '90' },
    { label: '120 days (120 days per trip)', code: '119' },
    { label: '120 Days (92 days/trip)', code: '120' },
    { label: '180 Days (max 180 days per trip)', code: '179' },
    { label: '180 Days (92 days/trip)', code: '180' },
    { label: 'Annual Multi Trip (max 180 days per trip)', code: '364' },
    { label: 'Annual Multi Trip (100 days/ trip)', code: '365' },
    { label: '2 Years (100 days/ trip)', code: '730' },
  ];

  offices: SelectMenuRecord[] = [];

  windowWidth = signal(window.innerWidth);

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
  }

  constructor(private fb: FormBuilder) { }

  async ngOnInit() {
    if (this.appService.hasDataForTab(4))
      this.appService.selectedTabIndex.set(11);
    else
      this.appService.isLoading.set("Loading Data...");

    this.individualForm = this.fb.group({
      lastName: ['', englishOnlyValidator()],
      firstName: ['', englishOnlyValidator()],
      passportNumber: ['', passportValidator()],
      policyType: [''],
      policyNumber: [''],
      period: [''],
      office: [''],
      fromDate: [null],
      toDate: [null],
    });

    this.groupForm = this.fb.group({
      companyName: ['', englishOnlyValidator()],
      policyNumber: [''],
      fromDate: [null],
      toDate: [null],
    });

    this.offices = await this.officeRepo.GetOfficesAsRecords();
    this.appService.isLoading.set(null)
  }

  selectTab(tab: 'individual' | 'group') {
    this.selectedTab = tab;
  }

  async onSubmitIndividual() {
    this.appService.isLoading.set("Loading Policies...");
    await new Promise(resolve => setTimeout(resolve, 10));

    const formValue = this.individualForm.value;

    const data: InquirySinglePolicyRequestDto = {
      single_group: "single",

      lastName: formValue.lastName,
      firstName: formValue.firstName,
      passportNumber: formValue.passportNumber,
      policyType: formValue.policyType ? Number(formValue.policyType) : undefined,
      policyRefNumber: formValue.policyNumber,
      period: formValue.period ? Number(formValue.period) : undefined,
      officeId: formValue.office,
      fromDate: formValue.fromDate,
      toDate: formValue.toDate,
    }

    const inquiryResults = await this.policyRepository.policyInquiry(data);

    this.appService.inquiryResults.set(inquiryResults);
    this.appService.isLoading.set(null);
    this.appService.selectedTabIndex.set(11);
  }

  async onSubmitGroup() {
    this.appService.isLoading.set("Loading Group Policies...");
    const formValue = this.groupForm.value;

    const data: InquiryGroupPolicyRequestDto = {
      single_group: "group",

      companyName: formValue.companyName,
      policyRefNumber: formValue.policyNumber,

      fromDate: formValue.fromDate,
      toDate: formValue.toDate,
    }

    const inquiryResults = await this.policyRepository.policyInquiry(data);

    this.appService.inquiryResults.set(inquiryResults);
    this.appService.isLoading.set(null);
    this.appService.selectedTabIndex.set(11);
  }
}
