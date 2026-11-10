import { Injectable, signal } from "@angular/core";
import { CustomerViewPolicy, AgentViewPolicy } from "../../data/models";
import { GroupSubPolicy } from "../../data/models/group-sub-policy";

type AccountsReturnContext = {
    tabIndex: number;
    step: number;
    selectedAccountCode?: string;
    individual?: {
        personalDetails: object;
        policyInfo: object;
        premiumAmount: number;
    };
    group?: {
        companyInfo: object;
        policyInfo: object;
        members: GroupSubPolicy[];
        premiumAmount: number;
        manualDiscountPercent?: number | null;
        automaticDiscountPercent?: number;
        appliedDiscountPercent?: number;
        discountMode?: 'automatic' | 'manual';
    };
};

export type IndividualFormProgress = {
    personalDetails: Record<string, unknown>;
    policyInfo: Record<string, unknown>;
    premiumAmount: number;
    step: number;
};

export type GroupFormProgress = {
    companyInfo: Record<string, unknown>;
    policyInfo: Record<string, unknown>;
    members: GroupSubPolicy[];
    premiumAmount: number;
    automaticDiscountPercent: number;
    appliedDiscountPercent: number;
    discountMode: 'automatic' | 'manual';
    premiumQuoteReady: boolean;
    step: number;
};

@Injectable({
    providedIn: 'root'
})
export class AppService {
    public isLoading = signal<string | null>(null);
    currentTheme: 'light' | 'dark' = 'light';
    currentLanguage: 'en' | 'ar' = 'en';

    constructor() {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (savedTheme) {
            this.currentTheme = savedTheme;
            this.applyTheme();
        }

        const savedLang = localStorage.getItem('language') as 'en' | 'ar';
        if (savedLang) {
            this.currentLanguage = savedLang;
            this.applyLanguage();
        }
    }

    public toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }

    applyTheme(): void {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${this.currentTheme}-theme`);
    }

    public toggleLanguage(): void {
        this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
        localStorage.setItem('language', this.currentLanguage);
        this.applyLanguage();
    }

    applyLanguage(): void {
        document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    // --------------------------------------------------------
    // DASHBOARD TEMP DATA ------------------------------------
    // --------------------------------------------------------
    selectedTabIndex = signal(0);
    accountsReturnContext = signal<AccountsReturnContext | null>(null);
    individualFormProgress = signal<Map<number, IndividualFormProgress>>(new Map());
    groupFormProgress = signal<GroupFormProgress | null>(null);

    saveIndividualFormProgress(planType: number, progress: IndividualFormProgress): void {
        const drafts = new Map(this.individualFormProgress());
        drafts.set(planType, structuredClone(progress));
        this.individualFormProgress.set(drafts);
    }

    clearIndividualFormProgress(planType: number): void {
        const drafts = new Map(this.individualFormProgress());
        drafts.delete(planType);
        this.individualFormProgress.set(drafts);
    }

    saveGroupFormProgress(progress: GroupFormProgress): void {
        this.groupFormProgress.set(structuredClone(progress));
    }

    clearGroupFormProgress(): void {
        this.groupFormProgress.set(null);
    }

    consumeAccountsReturnContext(tabIndex: number): AccountsReturnContext | null {
        const context = this.accountsReturnContext();
        if (!context || context.tabIndex !== tabIndex) return null;

        this.accountsReturnContext.set(null);
        this.individualFormProgress.set(new Map());
        this.groupFormProgress.set(null);
        return context;
    }
    officeSearchQuery = signal<string | null>(null);
    currentPolicyToShow = signal<CustomerViewPolicy | null>(null);
    policiesBuffer = signal<Map<number, CustomerViewPolicy>>(new Map());
    inquiryResults = signal<AgentViewPolicy[] | null>(null);
    updatePolicyContext = signal<{ refNumber: string; serial?: number; } | null>(null);
    subPolicyContext = signal<{ refNumber: string; serial: number; } | null>(null);

    // Map tab index to planType for policiesBuffer lookup
    private tabToPlanType: Record<number, number> = {
        0: 1,   // Individual Travel -> planType 1
        1: 8,   // InBound/Individual -> planType 8
        2: 11,  // Student Plan -> planType 11
        3: 3,   // Group Travel -> planType 3
    };

    hasDataForTab(tabIndex: number): boolean {
        const planType = this.tabToPlanType[tabIndex];
        if (planType !== undefined) {
            return this.policiesBuffer().has(planType);
        }
        // Tab 4 (Inquiry) checks inquiryResults
        if (tabIndex === 4) {
            const results = this.inquiryResults();
            return results !== null && results.length > 0;
        }
        return false;
    }

    clearDataForTab(tabIndex: number): void {
        const planType = this.tabToPlanType[tabIndex];
        if (planType !== undefined) {
            const buffer = new Map(this.policiesBuffer());
            buffer.delete(planType);
            this.policiesBuffer.set(buffer);
        }
        if (tabIndex === 4) {
            this.inquiryResults.set(null);
        }
        this.selectedTabIndex.set(tabIndex);
    }

    resetDashboardState(): void {
        this.selectedTabIndex.set(0);
        this.accountsReturnContext.set(null);
        this.officeSearchQuery.set(null);
        this.currentPolicyToShow.set(null);
        this.policiesBuffer.set(new Map());
        this.inquiryResults.set(null);
        this.updatePolicyContext.set(null);
        this.subPolicyContext.set(null);
    }

    setPolicyInBuffer(planType: number, policy: CustomerViewPolicy): void {
        const buffer = new Map(this.policiesBuffer());
        buffer.set(planType, policy);
        this.policiesBuffer.set(buffer);
    }

    getPolicyFromBuffer(planType: number): CustomerViewPolicy | undefined {
        return this.policiesBuffer().get(planType);
    }

    hasPolicyInBuffer(planType: number): boolean {
        return this.policiesBuffer().has(planType);
    }
}
