import { inject, Injectable } from "@angular/core";
import { Api } from "../data/api";
import { CalculatePremiumRequestDto, CalculatePremiumResponseDto, CreateGroupPolicyRequest, CreateSinglePolicyRequest, InquiryGroupPolicyRequestDto, InquirySinglePolicyRequestDto, CustomerViewPolicy, AgentViewPolicy, CustomerViewSinglePolicy, RetrieveGroupPolicyRequestDto } from "../data/models";
import { policiesPost, policiesPremiumPost, reportsPolicyPost, policiesInquiryPost, policiesDeleteDraftDelete, reportsInsuredClientsGet, reportsTravelDataGet, policiesEndorsePolicyRefNumberPost, policiesPolicyRefNumberGet, policiesPut, policiesRetrievePost } from "../data/functions";

@Injectable({
    providedIn: 'root'
})
export class PolicyRepository {
    apiService = inject(Api);

    public async createPolicy(policyData: CreateSinglePolicyRequest | CreateGroupPolicyRequest): Promise<void | CustomerViewPolicy> {

        console.log(policyData);
        try {
            const response = await this.apiService.invoke(policiesPost, { body: policyData });
            return response;
        } catch (e) { }
    }

    /*
    * If serial was provided, then for sure it will be a single policy (or sub policy of the group policy), and in this case policyData must be CreateSinglePolicyRequest
    * If serial was not provided, then it will be group policy and policy data must be CreateGroupPolicyRequest
    * using the result for the updated policy returned from backend, show it using policy-details component
    */
    public async updatePolicy(policyRefNumber: string, policyData: CreateSinglePolicyRequest | CreateGroupPolicyRequest, serial?: number): Promise<void | CustomerViewPolicy> {
        // logs info before sending request
        console.log('Updating policy:', { policyRefNumber, policyData, serial });

        try {
            const response = await this.apiService.invoke(policiesPut, {
                body: policyData,
                policyRefNumber: policyRefNumber,
                serial: serial
            });
            return response;
        } catch (e) { }
    }

    public async printPolicy(policyRefNumber: string, isDraft: boolean): Promise<Blob | void> {
        try {
            const response = await this.apiService.invoke(reportsPolicyPost, {
                body: {
                    printAsDraft: isDraft,
                    policyNumber: policyRefNumber
                }
            })

            window.open(URL.createObjectURL(response))

            return response;
        } catch (e) { }
    }

    public async calculatePremium(data: CalculatePremiumRequestDto[]): Promise<number> {
        const respone = await this.calculatePremiumQuote(data);
        return respone.totalPremium!;
    }

    public async calculatePremiumQuote(
        data: CalculatePremiumRequestDto[],
        manualDiscountPercent?: number | null
    ): Promise<CalculatePremiumResponseDto> {
        return await this.apiService.invoke(policiesPremiumPost, {
            body: data,
            manualDiscountPercent: manualDiscountPercent ?? undefined
        });
    }

    public async getPolicyByRefNumber(policyRefNumber: string, serial?: number): Promise<CustomerViewPolicy | void> {
        try {

            const response = await this.apiService.invoke(policiesPolicyRefNumberGet, {
                PolicyRefNumber: policyRefNumber,
                serial: serial
            })
            return response;
        } catch (e) { }
    }

    public async getGroupPolicy(policyRefNumber: string, companyName: string): Promise<CustomerViewPolicy> {
        const body: RetrieveGroupPolicyRequestDto = { policyRefNumber, companyName };
        return await this.apiService.invoke(policiesRetrievePost, { body });
    }

    public async policyInquiry(data: InquirySinglePolicyRequestDto | InquiryGroupPolicyRequestDto): Promise<AgentViewPolicy[]> {
        try {
            const respone = await this.apiService.invoke(policiesInquiryPost, { body: data })

            return respone;
        } catch (e) {
            return [];
        }
    }

    public async deleteDraftPolicies(): Promise<void> {
        await this.apiService.invoke(policiesDeleteDraftDelete, {
            cgpId: 8
        })
    }

    public async exportCurrentInsuredClients(): Promise<void> {
        const response = await this.apiService.invoke(reportsInsuredClientsGet, {
            cgpId: 8
        })

        const a = document.createElement('a');
        a.href = URL.createObjectURL(response);
        a.download = 'insured_clients.csv';
        a.click();
    }

    public async ExportTravelData(fromDate: string, toDate: string): Promise<void> {
        const response = await this.apiService.invoke(reportsTravelDataGet, {
            cgpId: 8,
            fromDate: fromDate,
            toDate: toDate
        })

        const a = document.createElement('a');
        a.href = URL.createObjectURL(response);
        a.download = 'travel_data.csv';
        a.click();
    }

    public async endorsePolicy(policyRefNumber: string, justCheck: boolean): Promise<CustomerViewPolicy | null> {
        const response = await this.apiService.invoke(policiesEndorsePolicyRefNumberPost, {
            policyRefNumber: policyRefNumber,
            justCheck: justCheck
        });
        return response;
    }
}
