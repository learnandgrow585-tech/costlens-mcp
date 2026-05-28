import type { FocusRecord } from "./schema";

/**
 * Realistic sample FOCUS 1.2 data for demo + testing.
 * Two billing periods: current month (May 2026) and previous month (Apr 2026).
 *
 * When real cloud adapters are connected (Week 4+), these are replaced by
 * live data from AWS CUR, Azure Cost Management, GCP BigQuery billing export.
 */

const MAY_START = "2026-05-01T00:00:00Z";
const MAY_END   = "2026-05-31T23:59:59Z";
const APR_START = "2026-04-01T00:00:00Z";
const APR_END   = "2026-04-30T23:59:59Z";

export const SAMPLE_DATA: FocusRecord[] = [
  // ── AWS – May 2026 ──────────────────────────────────────────────────────
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Elastic Compute Cloud",
    ServiceCategory: "Compute",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 3240.50, EffectiveCost: 2916.45, ListCost: 3240.50,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "EC2 compute instances — r6i.xlarge, t3.medium"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Simple Storage Service",
    ServiceCategory: "Storage",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 445.20, EffectiveCost: 445.20, ListCost: 445.20,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "S3 standard storage and data transfer"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Relational Database Service",
    ServiceCategory: "Databases",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 1089.30, EffectiveCost: 980.37, ListCost: 1089.30,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "RDS PostgreSQL db.r6g.large Multi-AZ"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "AWS Lambda",
    ServiceCategory: "Compute",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 82.45, EffectiveCost: 82.45, ListCost: 82.45,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "Lambda invocations and compute duration"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon CloudFront",
    ServiceCategory: "Networking",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 228.90, EffectiveCost: 228.90, ListCost: 228.90,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "CloudFront data transfer and requests"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Bedrock",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 782.60, EffectiveCost: 782.60, ListCost: 782.60,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "Bedrock model invocations — Claude 3 Sonnet, Titan"
  },

  // ── Microsoft Azure – May 2026 ──────────────────────────────────────────
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure Virtual Machines",
    ServiceCategory: "Compute",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 2156.80, EffectiveCost: 1941.12, ListCost: 2156.80,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Virtual Machines — Standard_D4s_v3, Standard_B2s"
  },
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure OpenAI Service",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 1245.60, EffectiveCost: 1245.60, ListCost: 1245.60,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Azure OpenAI GPT-4o token usage"
  },
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure Blob Storage",
    ServiceCategory: "Storage",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 378.40, EffectiveCost: 378.40, ListCost: 378.40,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Blob storage LRS and data operations"
  },
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure SQL Database",
    ServiceCategory: "Databases",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 943.20, EffectiveCost: 848.88, ListCost: 943.20,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Azure SQL General Purpose, 4 vCores"
  },

  // ── Google Cloud – May 2026 ─────────────────────────────────────────────
  {
    ProviderName: "Google Cloud",
    ServiceName: "Compute Engine",
    ServiceCategory: "Compute",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 1823.40, EffectiveCost: 1641.06, ListCost: 1823.40,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-central1", RegionName: "Iowa",
    SubAccountId: "proj-costlens-prod", SubAccountName: "costlens-prod",
    ChargeDescription: "Compute Engine — n2-standard-4, e2-medium instances"
  },
  {
    ProviderName: "Google Cloud",
    ServiceName: "Cloud Storage",
    ServiceCategory: "Storage",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 287.90, EffectiveCost: 287.90, ListCost: 287.90,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-central1", RegionName: "Iowa",
    SubAccountId: "proj-costlens-prod", SubAccountName: "costlens-prod",
    ChargeDescription: "Cloud Storage standard class and egress"
  },
  {
    ProviderName: "Google Cloud",
    ServiceName: "BigQuery",
    ServiceCategory: "Databases",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 438.70, EffectiveCost: 438.70, ListCost: 438.70,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-central1", RegionName: "Iowa",
    SubAccountId: "proj-costlens-prod", SubAccountName: "costlens-prod",
    ChargeDescription: "BigQuery on-demand query processing and storage"
  },
  {
    ProviderName: "Google Cloud",
    ServiceName: "Vertex AI",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 654.30, EffectiveCost: 654.30, ListCost: 654.30,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-central1", RegionName: "Iowa",
    SubAccountId: "proj-costlens-prod", SubAccountName: "costlens-prod",
    ChargeDescription: "Vertex AI Gemini Pro prediction requests"
  },

  // ── AI Vendors – May 2026 ───────────────────────────────────────────────
  {
    ProviderName: "OpenAI",
    ServiceName: "OpenAI API",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 893.40, EffectiveCost: 893.40, ListCost: 893.40,
    BillingCurrency: "USD", ChargeType: "Usage",
    SubAccountName: "engineering-team",
    ChargeDescription: "GPT-4o, GPT-4o-mini token usage across all projects"
  },
  {
    ProviderName: "Anthropic",
    ServiceName: "Anthropic API",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: MAY_START, BillingPeriodEnd: MAY_END,
    BilledCost: 423.80, EffectiveCost: 423.80, ListCost: 423.80,
    BillingCurrency: "USD", ChargeType: "Usage",
    SubAccountName: "engineering-team",
    ChargeDescription: "Claude Sonnet 4.6 — code review, analysis, agents"
  },

  // ── AWS – April 2026 (previous month for comparison) ───────────────────
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Elastic Compute Cloud",
    ServiceCategory: "Compute",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 2980.20, EffectiveCost: 2682.18, ListCost: 2980.20,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "EC2 compute instances"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Simple Storage Service",
    ServiceCategory: "Storage",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 398.40, EffectiveCost: 398.40, ListCost: 398.40,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "S3 standard storage and data transfer"
  },
  {
    ProviderName: "Amazon Web Services",
    ServiceName: "Amazon Bedrock",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 540.20, EffectiveCost: 540.20, ListCost: 540.20,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-east-1", RegionName: "US East (N. Virginia)",
    SubAccountId: "123456789012", SubAccountName: "prod-account",
    ChargeDescription: "Bedrock model invocations"
  },

  // ── Azure – April 2026 ──────────────────────────────────────────────────
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure Virtual Machines",
    ServiceCategory: "Compute",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 1980.50, EffectiveCost: 1782.45, ListCost: 1980.50,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Virtual Machines"
  },
  {
    ProviderName: "Microsoft Azure",
    ServiceName: "Azure OpenAI Service",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 980.30, EffectiveCost: 980.30, ListCost: 980.30,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "eastus", RegionName: "East US",
    SubAccountId: "sub-a1b2c3d4", SubAccountName: "prod-subscription",
    ChargeDescription: "Azure OpenAI GPT-4o token usage"
  },

  // ── GCP – April 2026 ────────────────────────────────────────────────────
  {
    ProviderName: "Google Cloud",
    ServiceName: "Compute Engine",
    ServiceCategory: "Compute",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 1620.80, EffectiveCost: 1458.72, ListCost: 1620.80,
    BillingCurrency: "USD", ChargeType: "Usage",
    RegionId: "us-central1", RegionName: "Iowa",
    SubAccountId: "proj-costlens-prod", SubAccountName: "costlens-prod",
    ChargeDescription: "Compute Engine instances"
  },

  // ── AI Vendors – April 2026 ─────────────────────────────────────────────
  {
    ProviderName: "OpenAI",
    ServiceName: "OpenAI API",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 712.60, EffectiveCost: 712.60, ListCost: 712.60,
    BillingCurrency: "USD", ChargeType: "Usage",
    SubAccountName: "engineering-team",
    ChargeDescription: "GPT-4o, GPT-4o-mini token usage"
  },
  {
    ProviderName: "Anthropic",
    ServiceName: "Anthropic API",
    ServiceCategory: "AI and Machine Learning",
    BillingPeriodStart: APR_START, BillingPeriodEnd: APR_END,
    BilledCost: 318.90, EffectiveCost: 318.90, ListCost: 318.90,
    BillingCurrency: "USD", ChargeType: "Usage",
    SubAccountName: "engineering-team",
    ChargeDescription: "Claude Sonnet token usage"
  }
];
