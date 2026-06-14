import type { ObjectId } from 'mongodb';
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
export type ReportType = 'inDepth' | 'essential';
export type ClientStatus = 'onboarding' | 'trial' | 'active' | 'expired' | 'suspended';
export interface PaymentRecord {
    date: Date;
    amount: number;
    credits: number;
    method?: string;
    reference?: string;
    invoiceNumber?: string;
    note?: string;
    addedBy?: string;
}
export interface BrandingConfig {
    labName: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor?: string;
    accentHealthy?: string;
    accentMonitor?: string;
    accentAttention?: string;
    fontFamilyHeading?: string;
    fontFamilyBody?: string;
    headerHeight?: string;
    headerMargin?: string;
    footerHeight?: string;
    footerMargin?: string;
    footerText?: string;
    contactEmail?: string;
    contactPhone?: string;
    showPoweredBy?: boolean;
}
export interface ReportConfig {
    reportType: ReportType;
    pageOrder: string[];
    showCoverPage?: boolean;
    showBackPage?: boolean;
    showRecommendations?: boolean;
    showSummary?: boolean;
    profileContinuation?: boolean;
    strictMapping?: boolean;
    webViewer?: boolean;
    branding?: BrandingConfig;
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
    headingColor?: string;
    headerBase64?: string;
    footerBase64?: string;
    headerHeight?: string;
    footerHeight?: string;
    coverPageLink?: string;
    backPageLink?: string;
    logoUrl?: string;
    footerText?: string;
    showPoweredBy?: boolean;
    idMappingOverrides?: Record<string, string>;
    profileMappingOverrides?: Record<string, string>;
}
export interface WebhookConfig {
    url: string;
    secret?: string;
    format?: 'json' | 'multipart' | 'base64_only' | 'custom';
    enabled: boolean;
    lastDispatchAt?: Date;
    lastDispatchStatus?: 'success' | 'failed';
    failureCount?: number;
}
export interface ClientDocument {
    _id?: ObjectId;
    tenantId: string;
    labName: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    address?: string;
    city?: string;
    state?: string;
    website?: string;
    gstNumber?: string;
    plan?: PlanType;
    status?: ClientStatus;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    trialEndDate?: Date | null;
    trialCredits?: number;
    liveDate?: Date | null;
    expiryDate?: Date;
    autoRenew?: boolean;
    isLive: boolean;
    onboardedBy?: string;
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    payments?: PaymentRecord[];
    reportConfig?: ReportConfig;
    webhook?: WebhookConfig;
    webhookUrl?: string;
    webhookFormat?: string;
    totalReports: number;
    totalFailures?: number;
    lastReportAt?: Date;
    lastFailureAt?: Date;
    notes?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=client.types.d.ts.map