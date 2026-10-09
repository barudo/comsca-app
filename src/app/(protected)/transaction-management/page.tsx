"use client";

import { Fragment, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { canViewBusiness } from "@/lib/auth";

const tabs = ["Payment Receipts", "Disbursements"] as const;
const receipts = [
  { id: "PR-0001", date: "Oct 9, 2026", member: "Sample Member A", entries: [
    { id: "TX-0001", description: "Savings contribution", amount: 500 },
    { id: "TX-0002", description: "Social fund contribution", amount: 50 },
  ] },
  { id: "PR-0002", date: "Oct 9, 2026", member: "Sample Member B", entries: [
    { id: "TX-0003", description: "Loan principal payment", amount: 1000 },
    { id: "TX-0004", description: "Loan interest payment", amount: 100 },
  ] },
  { id: "PR-0003", date: "Oct 8, 2026", member: "Sample Member C", entries: [
    { id: "TX-0005", description: "Savings contribution", amount: 250 },
  ] },
];
const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function TransactionManagementPage() {
  const { user } = useAuth();
  const { group, subdomain } = useCommunity();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedReceipts, setExpandedReceipts] = useState<string[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <main className="protected-content">
      <h1>Transaction Management</h1>
      {canViewBusiness(user) ? (
        <>
          <p>Manage transactions for {group?.name || subdomain || "your COMSCA community"}.</p>
          <div className="account-tabs" role="tablist" aria-label="Transaction types">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                ref={(element) => { tabRefs.current[index] = element; }}
                type="button"
                role="tab"
                id={`transaction-tab-${index}`}
                aria-controls={`transaction-panel-${index}`}
                aria-selected={activeTab === index}
                tabIndex={activeTab === index ? 0 : -1}
                onClick={() => setActiveTab(index)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
                  else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = tabs.length - 1;
                  else return;
                  event.preventDefault();
                  setActiveTab(next);
                  tabRefs.current[next]?.focus();
                }}
              >{tab}</button>
            ))}
          </div>
          <section role="tabpanel" id="transaction-panel-0" aria-labelledby="transaction-tab-0" hidden={activeTab !== 0} tabIndex={0}>
            <p className="members-feedback">Sample receipts only. Expand a receipt to view its transaction entries.</p>
            <div className="members-table-wrapper">
              <table className="members-table receipt-table">
                <caption>Payment receipts — placeholder data</caption>
                <thead><tr><th scope="col" className="receipt-toggle-cell"><span className="receipt-sr-only">Expand</span></th><th scope="col">Receipt No.</th><th scope="col">Date</th><th scope="col">Member</th><th scope="col" className="receipt-amount">Total Amount</th></tr></thead>
                <tbody>
                  {receipts.map((receipt) => {
                    const expanded = expandedReceipts.includes(receipt.id);
                    return (
                      <Fragment key={receipt.id}>
                        <tr>
                          <td className="receipt-toggle-cell">
                            <button type="button" className="receipt-toggle" aria-label={`${expanded ? "Collapse" : "Expand"} receipt ${receipt.id}`} aria-expanded={expanded} aria-controls={`entries-${receipt.id}`} onClick={() => setExpandedReceipts((current) => expanded ? current.filter((id) => id !== receipt.id) : [...current, receipt.id])}>
                              <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                            </button>
                          </td>
                          <th scope="row">{receipt.id}</th><td>{receipt.date}</td><td>{receipt.member}</td><td className="receipt-amount">{currency.format(receipt.entries.reduce((sum, entry) => sum + entry.amount, 0))}</td>
                        </tr>
                        <tr id={`entries-${receipt.id}`} hidden={!expanded} className="receipt-details">
                          <td colSpan={5}>
                            <table className="members-table receipt-entries">
                              <caption>Transaction entries for {receipt.id}</caption>
                              <thead><tr><th scope="col">Transaction No.</th><th scope="col">Description</th><th scope="col" className="receipt-amount">Amount</th></tr></thead>
                              <tbody>{receipt.entries.map((entry) => <tr key={entry.id}><th scope="row">{entry.id}</th><td>{entry.description}</td><td className="receipt-amount">{currency.format(entry.amount)}</td></tr>)}</tbody>
                            </table>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section role="tabpanel" id="transaction-panel-1" aria-labelledby="transaction-tab-1" hidden={activeTab !== 1} tabIndex={0}>
            <p className="members-feedback">Sample disbursements only. These are placeholder records.</p>
            <div className="members-table-wrapper">
              <table className="members-table">
                <caption>Disbursements — placeholder data</caption>
                <thead><tr><th scope="col">Disbursement No.</th><th scope="col">Date</th><th scope="col">Payee</th><th scope="col">Description</th><th scope="col" className="receipt-amount">Amount</th></tr></thead>
                <tbody>
                  <tr><th scope="row">DS-0001</th><td>Oct 9, 2026</td><td>Sample Member A</td><td>Loan disbursement</td><td className="receipt-amount">{currency.format(5000)}</td></tr>
                  <tr><th scope="row">DS-0002</th><td>Oct 8, 2026</td><td>Sample Supplier</td><td>Office supplies</td><td className="receipt-amount">{currency.format(350)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p role="status">Transaction Management access is restricted to owners, admins, and treasurers with a verified profile.</p>
      )}
    </main>
  );
}
