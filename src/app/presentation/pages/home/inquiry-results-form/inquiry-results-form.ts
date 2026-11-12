import { Component, inject, input, output, ElementRef, OnInit, afterNextRender, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PolicyRepository } from '../../../../domain/policy';
import { AppService } from '../../../../core/services/app';
import { AgentViewGroupPolicy, AgentViewPolicy, AgentViewSinglePolicy, CustomerViewSinglePolicy } from '../../../../data/models';

export interface PolicyResult {
  issueDate: string;
  passportNo: string;
  lastName: string;
  firstName: string;
  policyNumber: string;
  policyType: string;
  agency: string;
  period: number;
  status: string;
  createdBy: string;
}

type IndividualPolicyDetails = CustomerViewSinglePolicy & {
  hasEndorsedVersion: boolean;
  originCountryCode?: string | null;
};

@Component({
  selector: 'app-inquiry-results-form',
  imports: [CommonModule],
  templateUrl: './inquiry-results-form.html',
  styleUrl: './inquiry-results-form.css',
})
export class InquiryResultsForm {
  private el = inject(ElementRef);
  policyRepository = inject(PolicyRepository)
  appService = inject(AppService)

  get allPolicies(): AgentViewPolicy[] {
    const policies = this.appService.inquiryResults() ?? [];

    return [...policies].sort((a, b) => this.getPolicyDateValue(b) - this.getPolicyDateValue(a));
  }

  private getPolicyDateValue(policy: Partial<AgentViewPolicy>): number {
    const rawValue = policy.issueDate?.trim() ?? '';
    if (!rawValue) return Number.NEGATIVE_INFINITY;

    const dayFirstDate = rawValue.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?\s*(AM|PM)?)?$/i
    );
    if (dayFirstDate) {
      const [, day, month, year, hour = '0', minute = '0', second = '0', fraction = '0', meridiem] = dayFirstDate;
      let hours = Number(hour);
      if (meridiem?.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;

      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hours,
        Number(minute),
        Number(second),
        Number(fraction.padEnd(3, '0').slice(0, 3))
      );
      if (
        hours >= 0 &&
        hours <= 23 &&
        Number(minute) <= 59 &&
        Number(second) <= 59 &&
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day)
      ) {
        return date.getTime();
      }
      return Number.NEGATIVE_INFINITY;
    }

    const timestamp = Date.parse(rawValue);
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
  }

  policyInquiry = output<string>()

  itemsPerPage = 10;
  currentPage = 1;

  private readonly ROW_HEIGHT = 45;
  private readonly HEADER_HEIGHT = 100;
  private readonly THEAD_HEIGHT = 42;
  private readonly PAGINATION_HEIGHT = 60;

  constructor() {
    afterNextRender(() => {
      this.calculateItemsPerPage();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateItemsPerPage();
  }

  private calculateItemsPerPage(): void {
    const containerHeight = this.el.nativeElement.offsetHeight;

    if (containerHeight === 0) return;
    const availableHeight = containerHeight - this.HEADER_HEIGHT - this.THEAD_HEIGHT - this.PAGINATION_HEIGHT;
    const newItemsPerPage = Math.max(1, Math.floor(availableHeight / this.ROW_HEIGHT) - 1);

    if (newItemsPerPage !== this.itemsPerPage) {
      this.itemsPerPage = newItemsPerPage;
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
      }
    }
  }

  get totalPages(): number {
    return this.allPolicies ? Math.ceil(this.allPolicies.length / this.itemsPerPage) : 0;
  }

  get paginatedPolicies(): AgentViewPolicy[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.allPolicies.slice(startIndex, endIndex);
  }

  get totalPolicies(): number {
    return this.allPolicies.length;
  }

  get isGroupPolicy(): boolean {
    if (!this.allPolicies || this.allPolicies.length === 0) {
      return false;
    }
    return (this.allPolicies[0] as AgentViewGroupPolicy).planType === 3;
  }

  get paginatedGroupPolicies(): AgentViewGroupPolicy[] {
    return this.paginatedPolicies as AgentViewGroupPolicy[];
  }

  get paginatedSinglePolicies(): AgentViewSinglePolicy[] {

    return this.paginatedPolicies as AgentViewSinglePolicy[];
  }

  backToInquiry(): void {
    this.appService.inquiryResults.set(null);
    this.appService.currentPolicyToShow.set(null);
    this.appService.selectedTabIndex.set(4);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (this.currentPage >= this.totalPages - 2) {
        for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  }

  getPolicyStatusClass(status: 0 | 1 | 2 | undefined): string {
    if (status === 0) return 'text-bg-secondary';
    if (status === 2) return 'text-bg-danger';
    return 'text-bg-success';
  }

  getPolicyStatusLabel(status: 0 | 1 | 2 | undefined): string {
    if (status === 0) return 'Draft';
    if (status === 2) return 'Endorsed';
    return 'Generated';
  }

  getPolicyTypeLabel(planType: number | null | undefined): string {
    const policyTypeLabels: Record<number, string> = {
      1: 'Individual',
      2: 'Family',
      3: 'Group',
      4: 'Hajj Basic',
      5: 'Hajj Plus',
      6: 'Hajj Extra',
      8: 'Individual Inbound',
      11: 'Student',
    };

    return planType == null ? '-' : policyTypeLabels[planType] ?? 'Unknown policy type';
  }

  private getBasePolicyReference(referenceKey: string | null | undefined): string {
    return (referenceKey ?? '')
      .trim()
      .replace(/\s+C$/i, '')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private hasEndorsedVersion(policy: AgentViewSinglePolicy): boolean {
    const baseReference = this.getBasePolicyReference(policy.referenceKey);
    if (!baseReference) return false;

    return (this.allPolicies as AgentViewSinglePolicy[]).some((candidate) => {
      const candidateStatus = candidate.policyStatus ?? candidate.status;

      return (
        candidate.referenceKey !== policy.referenceKey &&
        candidateStatus === 2 &&
        this.getBasePolicyReference(candidate.referenceKey) === baseReference
      );
    });
  }

  async onPolicyClick(policyNumber: string, policyType: "single" | "group"): Promise<void> {
    if (policyType === "single") {
      const policy = this.paginatedSinglePolicies.find(p => p.referenceKey === policyNumber)!;

      const informativePolicy: IndividualPolicyDetails = {
        referenceKey: policy.referenceKey,
        fullNameNative: [policy.firstName, policy.lastName].filter(Boolean).join(' ') || null,
        fullNameForeign: [policy.firstNameForeign, policy.lastNameForeign].filter(Boolean).join(' ') || null,
        birthDate: policy.birthDate,
        passengerGender: policy.passengerGender,
        nationalityCountry: policy.nationalityCountry,
        passportNumber: policy.passportNumber,
        duration: policy.duration,
        destinationCountryCode: policy.destinationCountryCode,
        originCountryCode: policy.originCountryCode,
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
        totalPremium: policy.totalPremium,
        covidFlag: policy.covidFlag,
        policyStatus: policy.policyStatus,
        hasEndorsedVersion: this.hasEndorsedVersion(policy),
      };

      this.appService.currentPolicyToShow.set(informativePolicy);
      this.appService.selectedTabIndex.set(10);
    } else {
      this.appService.isLoading.set("Loading Policy...");
      const policy = await this.policyRepository.getPolicyByRefNumber(policyNumber)
      this.appService.currentPolicyToShow.set(policy!)
      this.appService.selectedTabIndex.set(10);
    }
    this.policyInquiry.emit(policyNumber);
  }
}
