type TrialBalanceRow = {
  code: string;
  account: string;
  debitCents: number;
  creditCents: number;
};

const rows: TrialBalanceRow[] = [
  { code: "1000", account: "Cash", debitCents: 125000, creditCents: 0 },
  { code: "1200", account: "Loans receivable", debitCents: 50000, creditCents: 0 },
  { code: "2000", account: "Member savings payable", debitCents: 0, creditCents: 25000 },
  { code: "3000", account: "Share capital", debitCents: 0, creditCents: 130000 },
  { code: "4000", account: "Interest income", debitCents: 0, creditCents: 30000 },
  { code: "5000", account: "Operating expenses", debitCents: 10000, creditCents: 0 },
];

const totals = rows.reduce(
  (result, row) => ({
    debitCents: result.debitCents + row.debitCents,
    creditCents: result.creditCents + row.creditCents,
  }),
  { debitCents: 0, creditCents: 0 },
);

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function formatAmount(cents: number) {
  return cents === 0 ? "—" : pesos.format(cents / 100);
}

export default function TrialBalancePage() {
  return (
    <main className="protected-content">
      <h1>Trial Balance</h1>
      <p>Debit and credit balances by account.</p>
      <p className="chart-account-notice">Placeholder values for layout only. This is not live financial data.</p>
      <div className="member-ledger-wrapper">
        <table className="member-ledger">
          <caption>Illustrative trial balance</caption>
          <thead>
            <tr>
              <th scope="col">Account code</th>
              <th scope="col">Account</th>
              <th scope="col" className="member-ledger-amount">Debit</th>
              <th scope="col" className="member-ledger-amount">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td>{row.code}</td>
                <th scope="row">{row.account}</th>
                <td className="member-ledger-amount">{formatAmount(row.debitCents)}</td>
                <td className="member-ledger-amount">{formatAmount(row.creditCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>Total</th>
              <td className="member-ledger-amount">{formatAmount(totals.debitCents)}</td>
              <td className="member-ledger-amount">{formatAmount(totals.creditCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}