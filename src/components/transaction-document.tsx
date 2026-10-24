"use client";

import { useRef, useState } from "react";
import { pesosInWords, receiptCents, receiptParticular, receiptPayer, voucherPayee } from "@/lib/payment-receipt";
import type { RegisterDocument } from "@/lib/transaction-registers";
import type { TransactionEntry } from "@/lib/transaction-entries";

function journalAccount(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim() || "—";
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";
  const account = value as Record<string, unknown>;
  const name = account.name ?? account.account_name;
  const code = account.code ?? account.account_code;
  const parts = [code, name].filter((part) => (typeof part === "string" && part.trim()) || typeof part === "number");
  return parts.length ? parts.join(" · ") : "—";
}

const money = (cents: number) => "P" + (cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TransactionDocument({ transaction, entries, community, documentType }: {
  transaction: Record<string, unknown>; entries: TransactionEntry[]; community: string; documentType: RegisterDocument;
}) {
  const isJournal = documentType === "JV";
  const isVoucher = documentType === "DV";
  const title = isJournal ? "Journal Voucher" : isVoucher ? "Disbursement Voucher" : "Payment Receipt";
  const documentLabel = isJournal || isVoucher ? "voucher" : "receipt";
  const receipt = useRef<HTMLElement>(null);
  const [exportError, setExportError] = useState("");
  const amounts = entries.map((entry) => receiptCents(entry.amount));
  const sum = amounts.every((amount) => amount !== null) && entries.length ? amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0) : null;
  const total = receiptCents(transaction.amount) ?? (sum !== null && Number.isSafeInteger(sum) ? sum : null);
  const payer = isVoucher ? voucherPayee(transaction, entries) : receiptPayer(transaction, entries);
  const date = typeof transaction.occurred_at === "string" && !Number.isNaN(Date.parse(transaction.occurred_at))
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(transaction.occurred_at)) : "—";

  function printDocument() {
    if (!receipt.current) return;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      setExportError(`Please allow pop-ups to print the ${documentLabel}.`);
      return;
    }
    printWindow.opener = null;
    const doc = printWindow.document;
    doc.title = title + " " + String(transaction.document_number ?? "");
    const style = doc.createElement("style");
    style.textContent = `
      @page { size: A4; margin: 20mm; }
      body { font: 14px/1.7 Arial, sans-serif; color: #172337; margin: 24px; }
      header { text-align: center; border-bottom: 2px solid #172337; padding-bottom: 16px; }
      h2 { text-transform: uppercase; letter-spacing: 2px; }
      .receipt-meta { display: flex; justify-content: space-between; gap: 20px; margin: 20px 0; }
      .receipt-payer { border-bottom: 1px solid; padding: 0 8px; }
      table { border-collapse: collapse; width: 100%; margin-top: 24px; table-layout: fixed; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #cbd5e1; overflow-wrap: anywhere; }
      th:last-child, td:last-child { text-align: right; width: 28%; }
      .journal-voucher th:last-child, .journal-voucher td:last-child { width: 22%; }
      thead { display: table-header-group; } tr { break-inside: avoid; }
      tfoot { font-weight: bold; } .receipt-note { margin-top: 28px; }
      .payment-receipt { position: relative; overflow: hidden; }
      .document-void-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1; }
      .document-void-watermark span { color: rgba(185, 28, 28, 0.28); font-size: 100px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; transform: rotate(-30deg); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    `;
    doc.head.append(style);
    doc.body.append(receipt.current.cloneNode(true));
    doc.close();
    printWindow.focus();
    printWindow.print();
  }

  return <>
    <article ref={receipt} className={isJournal ? "payment-receipt journal-voucher" : "payment-receipt"}>
      {String(transaction.status).toLowerCase() === "voided" && <div className="document-void-watermark" aria-hidden="true"><span>Voided</span></div>}
      <header><p>{community}</p><h2>{title}</h2></header>
      <div className="receipt-meta"><span>No. <strong>{String(transaction.document_number ?? "—")}</strong></span><span>{date}</span></div>
      {Boolean(transaction.status) && <p>Status: {String(transaction.status).replace(/_/g, " ")}</p>}
      {isJournal ? <><p>To record the following journal entries:</p>{typeof transaction.description === "string" && transaction.description.trim() && <p>{transaction.description}</p>}</> : <p>{isVoucher ? "Pay to" : "Received from"} <strong className="receipt-payer">{payer || "____________________"}</strong> the amount of <strong>{total === null ? "__________" : money(total)}</strong> ({total === null ? "Amount unavailable" : pesosInWords(total)}) as payment of:</p>}
      <table>
        <thead><tr><th scope="col">Particulars</th>{isJournal && <><th scope="col">Debit account</th><th scope="col">Credit account</th></>}<th scope="col">Amount</th></tr></thead>
        <tbody>{entries.map((entry, index) => <tr key={index}><td>{receiptParticular(entry)}</td>{isJournal && <><td>{journalAccount(entry.debit_account ?? entry.debit_account_name ?? entry.debit)}</td><td>{journalAccount(entry.credit_account ?? entry.credit_account_name ?? entry.credit)}</td></>}<td>{amounts[index] === null ? "—" : money(amounts[index])}</td></tr>)}
          {!entries.length && <tr><td colSpan={isJournal ? 4 : 2}>No entries found.</td></tr>}
        </tbody>
        <tfoot><tr><th scope="row" colSpan={isJournal ? 3 : 1}>Total</th><td>{total === null ? "—" : money(total)}</td></tr></tfoot>
      </table>
    </article>
    <div className="receipt-export">
      <button type="button" className="submit-button" onClick={printDocument} disabled={total === null || !entries.length}>Print</button>
      <p>Print the {documentLabel} or select “Save as PDF” in the print dialog.</p>
      {exportError && <p role="alert">{exportError}</p>}
    </div>
  </>;
}
