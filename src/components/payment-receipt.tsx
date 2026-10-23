"use client";

import { useRef, useState } from "react";
import { pesosInWords, receiptCents, receiptParticular, receiptPayer } from "@/lib/payment-receipt";
import type { TransactionEntry } from "@/lib/transaction-entries";

const money = (cents: number) => "P" + (cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentReceipt({ transaction, entries, community }: {
  transaction: Record<string, unknown>; entries: TransactionEntry[]; community: string;
}) {
  const receipt = useRef<HTMLElement>(null);
  const [exportError, setExportError] = useState("");
  const amounts = entries.map((entry) => receiptCents(entry.amount));
  const sum = amounts.every((amount) => amount !== null) && entries.length ? amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0) : null;
  const total = receiptCents(transaction.amount) ?? (sum !== null && Number.isSafeInteger(sum) ? sum : null);
  const payer = receiptPayer(transaction, entries);
  const date = typeof transaction.occurred_at === "string" && !Number.isNaN(Date.parse(transaction.occurred_at))
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(transaction.occurred_at)) : "—";

  function exportPdf() {
    if (!receipt.current) return;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      setExportError("Please allow pop-ups to export the receipt.");
      return;
    }
    printWindow.opener = null;
    const doc = printWindow.document;
    doc.title = "Payment Receipt " + String(transaction.document_number ?? "");
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
      thead { display: table-header-group; } tr { break-inside: avoid; }
      tfoot { font-weight: bold; } .receipt-note { margin-top: 28px; }
    `;
    doc.head.append(style);
    doc.body.append(receipt.current.cloneNode(true));
    doc.close();
    printWindow.focus();
    printWindow.print();
  }

  return <>
    <article ref={receipt} className="payment-receipt">
      <header><p>{community}</p><h2>Payment Receipt</h2></header>
      <div className="receipt-meta"><span>No. <strong>{String(transaction.document_number ?? "—")}</strong></span><span>{date}</span></div>
      {Boolean(transaction.status) && <p>Status: {String(transaction.status).replace(/_/g, " ")}</p>}
      <p>Received from <strong className="receipt-payer">{payer || "____________________"}</strong> the amount of <strong>{total === null ? "__________" : money(total)}</strong> ({total === null ? "Amount unavailable" : pesosInWords(total)}) as payment of:</p>
      <table>
        <thead><tr><th scope="col">Particulars</th><th scope="col">Amount</th></tr></thead>
        <tbody>{entries.map((entry, index) => <tr key={index}><td>{receiptParticular(entry)}</td><td>{amounts[index] === null ? "—" : money(amounts[index])}</td></tr>)}
          {!entries.length && <tr><td colSpan={2}>No entries found.</td></tr>}
        </tbody>
        <tfoot><tr><th scope="row">Total</th><td>{total === null ? "—" : money(total)}</td></tr></tfoot>
      </table>
    </article>
    <div className="receipt-export">
      <button type="button" className="submit-button" onClick={exportPdf} disabled={total === null || !entries.length}>Export as PDF</button>
      <p>Select “Save as PDF” in the print dialog.</p>
      {exportError && <p role="alert">{exportError}</p>}
    </div>
  </>;
}
