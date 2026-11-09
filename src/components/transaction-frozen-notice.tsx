import type { Cycle } from "@/lib/cycles";

export function TransactionFrozenNotice({ cycle }: { cycle: Cycle | null | undefined }) {
  if (cycle?.transactions_frozen !== true) return null;
  return (
    <aside className="transaction-frozen-notice" role="status" aria-live="polite">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="15.5" r="1" fill="currentColor" />
      </svg>
      <div>
        <strong>Transactions are currently frozen.</strong>
        <p>Financial transactions are temporarily disabled. Only the Group Owner or System Administrator can unfreeze transactions.</p>
        <p>Please contact your Group Owner if you need to record a transaction.</p>
      </div>
    </aside>
  );
}
