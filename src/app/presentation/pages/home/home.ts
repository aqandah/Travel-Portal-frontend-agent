import { Component, HostListener, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoLoading } from "../../components/logo-loading/logo-loading";
import { DialogService } from '../../../core/services/dialog';
import { IndividualForm } from "./individual-form/individual-form";
import { AdministratorForm } from "./administrator-form/administrator-form";
import { AuthorizationRepository } from '../../../domain/authorization';
import { Router } from '@angular/router';
import { PolicyDetails } from "../../components/policy-details/policy-details";
import { InquiryForm } from "./inquiry-form/inquiry-form";
import { AppService } from '../../../core/services/app';
import { InquiryResultsForm } from "./inquiry-results-form/inquiry-results-form";
import { CurrencyRatesTab } from "./administrator-form/currency-rates-tab/currency-rates-tab";
import { GroupForm } from "./group-form/group-form";
import { ExportTravelDataTab } from "./administrator-form/export-travel-data-tab/export-travel-data-tab";
import { CancelPolicyTab } from "./administrator-form/cancel-policy-tab/cancel-policy-tab";
import { AccountsTab } from "./administrator-form/accounts-tab/accounts-tab";
import { CompanyOfficesTab } from "./administrator-form/company-offices-tab/company-offices-tab";
import { TravelAgenciesTab } from "./administrator-form/travel-agencies-tab/travel-agencies-tab";
import { TravelPricesTab } from "./administrator-form/travel-prices-tab/travel-prices-tab";
import { UsersTab } from "./administrator-form/users-tab/users-tab";
import { AgencyCommissionsTab } from "./administrator-form/agency-commissions-tab/agency-commissions-tab";
import { ReportsForm } from "./reports-form/reports-form";
import { PremiumCalculatorForm } from "./premium-calculator-form/premium-calculator-form";
import { HelpForm } from "./help-form/help-form";
import { HasRoleDirective } from "../../../core/directives/has-role-directive";
import { BiReportsForm } from "./bi-reports-form/bi-reports-form";
import { AiForm } from "./ai-form/ai-form";

interface NavItem {
  icon: string;
  label: string;
  roles?: number[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LogoLoading, IndividualForm, AdministratorForm, PolicyDetails, InquiryForm, InquiryResultsForm, CurrencyRatesTab, GroupForm, ExportTravelDataTab, CancelPolicyTab, AccountsTab, CompanyOfficesTab, TravelAgenciesTab, TravelPricesTab, UsersTab, AgencyCommissionsTab, ReportsForm, PremiumCalculatorForm, HasRoleDirective, BiReportsForm, AiForm],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  router = inject(Router);
  authRepository = inject(AuthorizationRepository)
  appService = inject(AppService);

  navItems: NavItem[] = [
    { icon: 'person', label: 'Individual Travel' },
    { icon: 'flight', label: 'InBound/Individual' },
    { icon: 'school', label: 'Student Plan' },
    { icon: 'groups', label: 'Group Travel' },
    { icon: 'search', label: 'Inquiry' },
    { icon: 'chart', label: 'Reports' },
    { icon: 'admin', label: 'Administrator', roles: [2, 3] },
    { icon: 'calculator', label: 'Premium Calculator' }
  ];

  async ngOnInit() {
    this.authRepository.goToSuitablePage()
  }

  get selectedIndex(): number {
    return this.appService.selectedTabIndex();
  }

  dialogService = inject(DialogService);
  showLogoutConfirmation = false;
  showUnsavedChangesConfirmation = false;
  pendingNavigationIndex: number | null = null;
  mobileNavOpen = false;
  individualForm = viewChild(IndividualForm);
  groupForm = viewChild(GroupForm);

  constructor() {
    if (!this.authRepository.isAuthenticated)
      this.router.navigate(['/login']);
  }

  selectNavItem(index: number): void {
    if (index === this.selectedIndex) {
      this.closeMobileNav();
      return;
    }

    const activeForm = this.individualForm() ?? this.groupForm();
    if (activeForm?.hasUnsavedChanges()) {
      this.pendingNavigationIndex = index;
      this.showUnsavedChangesConfirmation = true;
      this.closeMobileNav();
      return;
    }

    this.completeNavigation(index);
  }

  private completeNavigation(index: number): void {
    if (this.selectedIndex === 10 && index !== 10) {
      this.appService.policyFormReturnContext.set(null);
    }
    this.appService.selectedTabIndex.set(index);
    this.closeMobileNav();
  }

  leaveWithoutSaving(): void {
    this.finishPendingNavigation();
  }

  stayOnCurrentForm(): void {
    this.showUnsavedChangesConfirmation = false;
    this.pendingNavigationIndex = null;
  }

  private finishPendingNavigation(): void {
    const targetIndex = this.pendingNavigationIndex;
    this.showUnsavedChangesConfirmation = false;
    this.pendingNavigationIndex = null;
    if (targetIndex !== null) this.completeNavigation(targetIndex);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  goToAdministratorTab(tabIndex: number): void {
    this.selectNavItem(tabIndex);
  }

  openLogoutConfirmation(): void {
    this.showLogoutConfirmation = true;
  }

  closeLogoutConfirmation(): void {
    this.showLogoutConfirmation = false;
  }

  @HostListener('document:keydown.escape')
  closeLogoutConfirmationOnEscape(): void {
    if (this.showLogoutConfirmation) {
      this.closeLogoutConfirmation();
    }
    if (this.showUnsavedChangesConfirmation) {
      this.stayOnCurrentForm();
    }
    this.closeMobileNav();
  }

  logout(): void {
    this.closeLogoutConfirmation();
    this.authRepository.logout()
    this.appService.selectedTabIndex.set(0);
    
    this.router.navigate(['/login']);
  }

  toggleTheme(): void {
    this.appService.toggleTheme();
  }

  clearTabData(tabIndex: number, event: Event): void {
    event.stopPropagation();
    this.appService.clearDataForTab(tabIndex);
  }
}
