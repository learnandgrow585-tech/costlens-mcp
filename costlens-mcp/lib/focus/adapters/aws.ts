/**
 * AWS Cost Explorer → FOCUS 1.2 adapter.
 *
 * Requires env vars:
 *   AWS_ACCESS_KEY_ID      — IAM user access key
 *   AWS_SECRET_ACCESS_KEY  — IAM user secret
 *   AWS_REGION             — optional, defaults to us-east-1
 *
 * IAM policy needed (read-only, no billing data risk):
 *   { "Effect": "Allow", "Action": ["ce:GetCostAndUsage"], "Resource": "*" }
 *
 * Cost: ~$0.01 per API call to Cost Explorer.
 */

import type { FocusRecord, ServiceCategory } from "@/lib/focus/schema";
import { logger } from "@/lib/utils/logger";

// ── Service name → FOCUS ServiceCategory mapping ───────────────────────────

const SERVICE_CATEGORY_MAP: Record<string, ServiceCategory> = {
  "Amazon Elastic Compute Cloud":           "Compute",
  "Amazon EC2":                             "Compute",
  "AWS Lambda":                             "Compute",
  "Amazon Elastic Container Service":       "Compute",
  "Amazon Elastic Kubernetes Service":      "Compute",
  "AWS Fargate":                            "Compute",
  "Amazon Lightsail":                       "Compute",
  "Amazon Simple Storage Service":          "Storage",
  "Amazon S3":                              "Storage",
  "Amazon Elastic Block Store":             "Storage",
  "Amazon Elastic File System":             "Storage",
  "AWS Backup":                             "Storage",
  "Amazon Glacier":                         "Storage",
  "Amazon Relational Database Service":     "Databases",
  "Amazon DynamoDB":                        "Databases",
  "Amazon ElastiCache":                     "Databases",
  "Amazon Redshift":                        "Databases",
  "Amazon Aurora":                          "Databases",
  "Amazon DocumentDB":                      "Databases",
  "Amazon Neptune":                         "Databases",
  "Amazon CloudFront":                      "Networking",
  "Amazon Route 53":                        "Networking",
  "Amazon VPC":                             "Networking",
  "AWS Direct Connect":                     "Networking",
  "Amazon API Gateway":                     "Networking",
  "Elastic Load Balancing":                 "Networking",
  "Amazon Bedrock":                         "AI and Machine Learning",
  "Amazon SageMaker":                       "AI and Machine Learning",
  "Amazon Rekognition":                     "AI and Machine Learning",
  "Amazon Comprehend":                      "AI and Machine Learning",
  "Amazon Textract":                        "AI and Machine Learning",
  "Amazon Polly":                           "AI and Machine Learning",
  "Amazon Translate":                       "AI and Machine Learning",
  "AWS IAM":                                "Security",
  "AWS Key Management Service":             "Security",
  "AWS Secrets Manager":                    "Security",
  "Amazon Inspector":                       "Security",
  "Amazon GuardDuty":                       "Security",
  "Amazon CloudWatch":                      "Management",
  "AWS CloudTrail":                         "Management",
  "AWS CloudFormation":                     "Management",
  "AWS Config":                             "Management",
  "AWS Systems Manager":                    "Management",
  "AWS Cost Explorer":                      "Management",
  "Amazon Simple Notification Service":     "Developer Tools",
  "Amazon Simple Queue Service":            "Developer Tools",
  "Amazon EventBridge":                     "Developer Tools",
  "AWS CodeBuild":                          "Developer Tools",
  "AWS CodePipeline":                       "Developer Tools"
};

function getCategory(serviceName: string): ServiceCategory {
  // Exact match first
  if (SERVICE_CATEGORY_MAP[serviceName]) return SERVICE_CATEGORY_MAP[serviceName];
  // Partial match
  for (const [key, cat] of Object.entries(SERVICE_CATEGORY_MAP)) {
    if (serviceName.toLowerCase().includes(key.toLowerCase().split(" ").pop()!.toLowerCase())) {
      return cat;
    }
  }
  return "Other";
}

// ── Date helpers ───────────────────────────────────────────────────────────

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthRange(offset = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
}

// ── AWS CE API caller (raw fetch + SigV4 via SDK) ──────────────────────────

async function callCostExplorer(
  startDate: string,
  endDate: string
): Promise<FocusRecord[]> {
  // Dynamic import keeps cold-start bundle small
  const { CostExplorerClient, GetCostAndUsageCommand } = await import(
    "@aws-sdk/client-cost-explorer"
  );

  const client = new CostExplorerClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  });

  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: startDate, End: endDate },
    Granularity: "MONTHLY",
    Metrics: ["BlendedCost", "UnblendedCost"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
  });

  const response = await client.send(command);
  const records: FocusRecord[] = [];

  for (const period of response.ResultsByTime ?? []) {
    const periodStart = `${period.TimePeriod!.Start!}T00:00:00Z`;
    const periodEnd   = `${period.TimePeriod!.End!}T23:59:59Z`;

    for (const group of period.Groups ?? []) {
      const serviceName  = group.Keys?.[0] ?? "Unknown";
      const blendedCost  = parseFloat(group.Metrics?.BlendedCost?.Amount  ?? "0");
      const unblendedCost = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? "0");

      // Skip zero-cost records (credits, free tier that netted to zero)
      if (blendedCost <= 0) continue;

      records.push({
        ProviderName:       "Amazon Web Services",
        ServiceName:        serviceName,
        ServiceCategory:    getCategory(serviceName),
        BillingPeriodStart: periodStart,
        BillingPeriodEnd:   periodEnd,
        BilledCost:         Math.round(blendedCost   * 100) / 100,
        EffectiveCost:      Math.round(unblendedCost * 100) / 100,
        BillingCurrency:    group.Metrics?.BlendedCost?.Unit ?? "USD",
        ChargeType:         "Usage",
        ChargeDescription:  `${serviceName} usage`
      });
    }
  }

  return records;
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface AwsAdapterResult {
  records:  FocusRecord[];
  months:   string[];
  fetched:  boolean;
  error?:   string;
}

/**
 * Fetch 2 months of AWS cost data (current + previous).
 * Returns empty records + error string if credentials are missing or invalid.
 */
export async function fetchAwsRecords(): Promise<AwsAdapterResult> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { records: [], months: [], fetched: false, error: "AWS credentials not configured" };
  }

  try {
    const currentRange  = monthRange(0);
    const previousRange = monthRange(-1);

    logger.info({ currentRange, previousRange }, "fetching AWS Cost Explorer data");

    const [current, previous] = await Promise.all([
      callCostExplorer(currentRange.start,  currentRange.end),
      callCostExplorer(previousRange.start, previousRange.end)
    ]);

    const records = [...current, ...previous];
    logger.info({ count: records.length }, "AWS records fetched");

    return {
      records,
      months:  [previousRange.start.slice(0, 7), currentRange.start.slice(0, 7)],
      fetched: true
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "AWS Cost Explorer fetch failed");
    return { records: [], months: [], fetched: false, error: message };
  }
}

/** Quick connectivity check — low-cost way to verify credentials work. */
export async function checkAwsConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { connected: false, error: "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set" };
  }
  try {
    const today = toYYYYMMDD(new Date());
    await callCostExplorer(today, today);
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
