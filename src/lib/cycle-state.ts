import type { Cycle } from "./cycles";

export const interestTypes = {
  compounded: {
    label: "Compound Interest",
    description: "Each month, interest is calculated on the principal plus any accumulated unpaid interest.",
  },
  simple: {
    label: "Simple Interest",
    description: "Each month, interest is calculated on the original principal only. Interest does not earn additional interest.",
  },
  reducing: {
    label: "Reducing Balance Method",
    description: "Each month, interest is calculated on the remaining principal. As the principal is repaid, the interest amount decreases.",
  },
};

export type InterestType = keyof typeof interestTypes;

export type DraftDetails = {
  name: string;
  description: string;
  interestRate: string;
  interestType: InterestType;
  startingSubscription: string;
  maximumMonthlyShares: number;
  costPerShare: string;
  absencePenalty: string;
  requiredMonthlyContribution: string;
};

export type DisplayCycle = Cycle;

// A distributing or active cycle takes precedence over any future drafts.
export function getCurrentCycle(cycles: DisplayCycle[]) {
  for (const status of ["DISTRIBUTING", "ACTIVE", "DRAFT"]) {
    const cycle = cycles.find((item) => item.status.trim().toUpperCase() === status);
    if (cycle) return { cycle, status: status.toLowerCase() as "distributing" | "active" | "draft" };
  }
  return null;
}
