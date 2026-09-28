"use client";

import type { LedgerAccount } from "@/lib/accounts";

type Props = {
  accounts: LedgerAccount[];
  fundsAccountId: string;
  capitalAccountId: string;
  onFundsAccountChange: (id: string) => void;
  onCapitalAccountChange: (id: string) => void;
};

export function SharePurchaseAccounts({ accounts, fundsAccountId, capitalAccountId, onFundsAccountChange, onCapitalAccountChange }: Props) {
  const assetAccounts = accounts.filter((account) => account.type.trim().toUpperCase() === "ASSET");
  const equityAccounts = accounts.filter((account) => account.type.trim().toUpperCase() === "EQUITY");

  return (
    <div className="share-purchase-accounts">
      <div className="field">
        <label htmlFor="share-funds-account">Funds Received Into</label>
        <select id="share-funds-account" name="funds_account_id" required value={fundsAccountId} onChange={(event) => onFundsAccountChange(event.target.value)} aria-describedby="share-funds-account-hint">
          <option value="">Select an asset account</option>
          {assetAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
        </select>
        <p id="share-funds-account-hint" className="cycle-field-hint">Debit account.{assetAccounts.length === 0 && " No asset accounts available."}</p>
      </div>
      <div className="field">
        <label htmlFor="share-capital-account">Share Capital Account</label>
        <select id="share-capital-account" name="share_capital_account_id" required value={capitalAccountId} onChange={(event) => onCapitalAccountChange(event.target.value)} aria-describedby="share-capital-account-hint">
          <option value="">Select an equity account</option>
          {equityAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
        </select>
        <p id="share-capital-account-hint" className="cycle-field-hint">Credit account.{equityAccounts.length === 0 && " No equity accounts available."}</p>
      </div>
    </div>
  );
}
