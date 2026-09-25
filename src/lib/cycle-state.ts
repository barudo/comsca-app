import type { Cycle } from "./cycles";

export type DraftDetails = {
  name: string;
  description: string;
  interestRate: string;
  interestType: "simple" | "compounded";
  startingSubscription: string;
  maximumMonthlyShares: number;
  costPerShare: string;
};

export type DisplayCycle = Cycle & { details?: DraftDetails };

// A distributing or active cycle takes precedence over any future drafts.
export function getCurrentCycle(cycles: DisplayCycle[]) {
  for (const status of ["DISTRIBUTING", "ACTIVE", "DRAFT"]) {
    const cycle = cycles.find((item) => item.status.trim().toUpperCase() === status);
    if (cycle) return { cycle, status: status.toLowerCase() as "distributing" | "active" | "draft" };
  }
  return null;
}
