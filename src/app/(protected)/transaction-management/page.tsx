"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchTransactionRegisters, type RegisterPage } from "@/lib/transaction-registers";
import { canViewBusiness } from "@/lib/auth";

const tabs = [
  { label: "Payment Receipts", document: "PR" },
  { label: "Disbursement Vouchers", document: "DV" },
  { label: "Journal Vouchers", document: "JV" },
] as const;

const columns = [
  ["document_number", "Document No."], ["occurred_at", "Date"],
  ["type", "Type"], ["amount", "Amount"],
  ["status", "Status"],
] as const;
const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

function displayValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "amount" && (typeof value === "string" || typeof value === "number") && Number.isFinite(Number(value))) return currency.format(Number(value));
  if (field === "occurred_at" && typeof value === "string" && !Number.isNaN(Date.parse(value))) return dateFormat.format(new Date(value));
  if (["type", "status", "expense_payment_status"].includes(field)) return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return String(value);
}

function VoidDocumentDrawer({ documentNumber, onClose }: { documentNumber: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    panel?.showModal();
    cancelButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="void-document-title" aria-describedby="void-document-confirmation" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="cycle-drawer-header"><h2 id="void-document-title">Void Document {documentNumber}</h2></div>
      <p id="void-document-confirmation">Are you sure you want to void this document?</p>
      <div className="cycle-drawer-footer">
        <button ref={cancelButton} type="button" className="cycle-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="submit-button">Void Document</button>
      </div>
    </dialog>
  );
}

export default function TransactionManagementPage() {
  const { user, session } = useAuth();
  const { group, subdomain } = useCommunity();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [voidDocument, setVoidDocument] = useState<{ key: string; number: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data: RegisterPage } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  const allowed = canViewBusiness(user);
  const document = tabs[activeTab].document;
  const requestKey = allowed && accessToken && groupSlug ? `${accessToken}:${groupSlug}:${document}:${page}:${retry}` : null;
  const documents = result?.key === requestKey ? result.data.documents : null;
  const currentError = error?.key === requestKey ? error.message : "";
  const pagination = result?.key === requestKey ? result.data.pagination : null;

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    fetchTransactionRegisters(accessToken, groupSlug, document, controller.signal, page)
      .then((loaded) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: loaded });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError({ key: requestKey, message: cause instanceof Error ? cause.message : "Unable to load transaction documents." });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, document, page, requestKey]);
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
                key={tab.document}
                ref={(element) => { tabRefs.current[index] = element; }}
                type="button"
                role="tab"
                id={`transaction-tab-${index}`}
                aria-controls={`transaction-panel-${index}`}
                aria-selected={activeTab === index}
                tabIndex={activeTab === index ? 0 : -1}
                onClick={() => { setActiveTab(index); setPage(1); }}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
                  else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = tabs.length - 1;
                  else return;
                  event.preventDefault();
                  setActiveTab(next);
                  setPage(1);
                  tabRefs.current[next]?.focus();
                }}
              >{tab.label}</button>
            ))}
          </div>
          <section role="tabpanel" id={`transaction-panel-${activeTab}`} aria-labelledby={`transaction-tab-${activeTab}`} tabIndex={0}>
            {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to load documents.</p>}
            {requestKey && !documents && !currentError && <p className="members-feedback" role="status">Loading {tabs[activeTab].label.toLowerCase()}…</p>}
            {currentError && <p className="members-feedback" role="alert">{currentError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
            {documents && <div className="members-table-wrapper">
              <table className="members-table">
                <caption>{tabs[activeTab].label}</caption>
                <thead><tr><th scope="col">#</th>{columns.map(([field, label]) => <th key={field} scope="col">{label}</th>)}<th scope="col">Actions</th></tr></thead>
                <tbody>
                  {documents.length === 0 && <tr><td colSpan={columns.length + 2}>No {tabs[activeTab].label.toLowerCase()} found.</td></tr>}
                  {documents.map((row, index) => <tr key={String(row.id ?? index)}><th scope="row">{((pagination?.page ?? 1) - 1) * (pagination?.per_page ?? 0) + index + 1}</th>{columns.map(([field]) => <td key={field}>{displayValue(field, row[field])}</td>)}<td><button type="button" className="text-button" aria-label={`Void document ${displayValue("document_number", row.document_number)}`} onClick={() => { if (requestKey) setVoidDocument({ key: requestKey, number: displayValue("document_number", row.document_number) }); }}>void</button></td></tr>)}
                </tbody>
              </table>
            </div>}
            {pagination && <nav aria-label="Document pages" className="members-pagination">
              <button className="text-button" type="button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Previous</button>
              <span role="status"> Page {pagination.page} of {Math.max(1, pagination.total_pages)} · {pagination.total} documents </span>
              <button className="text-button" type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPage(pagination.page + 1)}>Next</button>
            </nav>}
          </section>
          {voidDocument?.key === requestKey && <VoidDocumentDrawer documentNumber={voidDocument.number} onClose={() => setVoidDocument(null)} />}
        </>
      ) : (
        <p role="status">Transaction Management access is restricted to owners, admins, and treasurers with a verified profile.</p>
      )}
    </main>
  );
}
