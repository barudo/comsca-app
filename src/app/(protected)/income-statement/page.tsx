type IncomeStatementEntry = { name: string; cents: number };

const incomeEntries: IncomeStatementEntry[] = [
  { name: "Interest income", cents: 3740 },
];
const expenseEntries: IncomeStatementEntry[] = [
  { name: "Operating expenses", cents: 1000 },
];
const totalIncome = incomeEntries.reduce((total, entry) => total + entry.cents, 0);
const totalExpenses = expenseEntries.reduce((total, entry) => total + entry.cents, 0);
const netIncome = totalIncome - totalExpenses;
const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function IncomeStatementPage() {
  return (
    <main className="protected-content">
      <h1>Income Statement</h1>
      <p>Income and expenses for the reporting period.</p>
      <p className="chart-account-notice">Placeholder values for layout only. This is not live financial data.</p>
      <section className="trial-balance-summary" aria-label="Income statement summary">
        <div><h2>Total income</h2><p>{pesos.format(totalIncome / 100)}</p></div>
        <div><h2>Total expenses</h2><p>{pesos.format(totalExpenses / 100)}</p></div>
        <div><h2>Net income</h2><p>{pesos.format(netIncome / 100)}</p></div>
      </section>
      <div className="member-ledger-wrapper">
        <table className="member-ledger balance-sheet-table">
          <caption>Illustrative income statement</caption>
          <tbody>
            <IncomeStatementRows title="Income" entries={incomeEntries} totalLabel="Total income" total={totalIncome} />
            <IncomeStatementRows title="Expenses" entries={expenseEntries} totalLabel="Total expenses" total={totalExpenses} />
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Net income</th>
              <td className="member-ledger-amount">{pesos.format(netIncome / 100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}

function IncomeStatementRows({
  title,
  entries,
  totalLabel,
  total,
}: {
  title: string;
  entries: IncomeStatementEntry[];
  totalLabel: string;
  total: number;
}) {
  return (
    <>
      <tr className="balance-sheet-section-heading"><th colSpan={2}>{title}</th></tr>
      {entries.map((entry) => (
        <tr key={entry.name}>
          <th scope="row">{entry.name}</th>
          <td className="member-ledger-amount">{pesos.format(entry.cents / 100)}</td>
        </tr>
      ))}
      <tr className="balance-sheet-total">
        <th scope="row">{totalLabel}</th>
        <td className="member-ledger-amount">{pesos.format(total / 100)}</td>
      </tr>
    </>
  );
}