"use client";

import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { canViewBusiness } from "@/lib/auth";

export default function TransactionManagementPage() {
  const { user } = useAuth();
  const { group, subdomain } = useCommunity();

  return (
    <main className="protected-content">
      <h1>Transaction Management</h1>
      {canViewBusiness(user) ? (
        <>
          <p>Manage transactions for {group?.name || subdomain || "your COMSCA community"}.</p>
          <p className="members-feedback" role="status">Transaction management tools are coming soon.</p>
        </>
      ) : (
        <p role="status">Transaction Management access is restricted to owners, admins, and treasurers with a verified profile.</p>
      )}
    </main>
  );
}
