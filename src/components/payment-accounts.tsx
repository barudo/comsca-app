"use client";

import type { LedgerAccount } from "@/lib/accounts";

type Props = {
  accounts: LedgerAccount[];
  creditType: "ASSET" | "EQUITY";
  creditLabel: string;
  debitLabel?: string;
  fundsAccountId: string;
  creditAccountId: string;
  onFundsAccountChange: (id: string) => void;
  onCreditAccountChange: (id: string) => void;
};

export function PaymentAccounts({ accounts, creditType, creditLabel, debitLabel = "Funds Received Into", fundsAccountId, creditAccountId, onFundsAccountChange, onCreditAccountChange }: Props) {
  const assetAccounts = accounts.filter((account) => account.type.trim().toUpperCase() === "ASSET");
  const creditAccounts = accounts.filter((account) => account.type.trim().toUpperCase() === creditType);
  const creditKind = creditType === "ASSET" ? "asset" : "equity";

  return (
    <div className="share-purchase-accounts">
      <div className="field">
        <label htmlFor="payment-funds-account">{debitLabel}</label>
        <select id="payment-funds-account" name="funds_account_id" required value={fundsAccountId} onChange={(event) => onFundsAccountChange(event.target.value)} aria-describedby="payment-funds-account-hint">
          <option value="">Select an asset account</option>
          {assetAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
        </select>
        <p id="payment-funds-account-hint" className="cycle-field-hint">Debit account.{assetAccounts.length === 0 && " No asset accounts available."}</p>
      </div>
      <div className="field">
        <label htmlFor="payment-credit-account">{creditLabel}</label>
        <select id="payment-credit-account" name="credit_account_id" required value={creditAccountId} onChange={(event) => onCreditAccountChange(event.target.value)} aria-describedby="payment-credit-account-hint">
          <option value="">Select an {creditKind} account</option>
          {creditAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
        </select>
        <p id="payment-credit-account-hint" className="cycle-field-hint">Credit account.{creditAccounts.length === 0 && ` No ${creditKind} accounts available.`}</p>
      </div>
    </div>
  );
}
