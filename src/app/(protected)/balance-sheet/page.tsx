type BalanceSheetSection = {
  title: string;
  accounts: { name: string; cents: number }[];
};

const sections: BalanceSheetSection[] = [
  {
    title: "Assets",
    accounts: [
      { name: "Cash", cents: 125000 },
      { name: "Loans receivable", cents: 40000 },
    ],
  },
  {
    title: "Liabilities",
    accounts: [
      { name: "Member savings payable", cents: 20000 },
    ],
  },
  {
    title: "Equity",
    accounts: [
      { name: "Share capital", cents: 45000 },
      { name: "Retained earnings", cents: 100000 },
    ],
  },
];

const sectionTotals = sections.map((section) => ({
  ...section,
  totalCents: section.accounts.reduce((total, account) => total + account.cents, 0),
}));
const totalAssets = sectionTotals[0].totalCents;
const totalLiabilitiesAndEquity = sectionTotals[1].totalCents + sectionTotals[2].totalCents;
const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function BalanceSheetPage() {
  return (
    <main className="protected-content">
      <h1>Balance Sheet</h1>
      <p>Assets, liabilities, and equity.</p>
      <p className="chart-account-notice">Placeholder values for layout only. This is not live financial data.</p>
      <div className="member-ledger-wrapper">
        <table className="member-ledger balance-sheet-table">
          <caption>Illustrative balance sheet</caption>
          <tbody>
            {sectionTotals.map((section) => (
              <BalanceSheetRows key={section.title} section={section} />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total liabilities and equity</th>
              <td className="member-ledger-amount">{pesos.format(totalLiabilitiesAndEquity / 100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="balance-sheet-check" role="status">
        Total assets {pesos.format(totalAssets / 100)} · Total liabilities and equity {pesos.format(totalLiabilitiesAndEquity / 100)}
      </p>
    </main>
  );
}

function BalanceSheetRows({ section }: { section: BalanceSheetSection & { totalCents: number } }) {
  const sectionTotal = section.title === "Assets" ? "Total assets" : `Total ${section.title.toLowerCase()}`;
  return (
    <>
      <tr className="balance-sheet-section-heading"><th colSpan={2}>{section.title}</th></tr>
      {section.accounts.map((account) => (
        <tr key={account.name}>
          <th scope="row">{account.name}</th>
          <td className="member-ledger-amount">{pesos.format(account.cents / 100)}</td>
        </tr>
      ))}
      <tr className="balance-sheet-total">
        <th scope="row">{sectionTotal}</th>
        <td className="member-ledger-amount">{pesos.format(section.totalCents / 100)}</td>
      </tr>
    </>
  );
}