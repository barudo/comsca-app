import type { Metadata } from "next";
import { headers } from "next/headers";
import { CommunityProvider } from "@/components/community-provider";
import { getCommunityValidation } from "@/lib/community-validation";
import { getCommunity } from "@/lib/community";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMSCA — Together, we save for more",
  description:
    "Community Managed Savings and Credit Association. Save together, grow together, and sign in to your COMSCA community.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const subdomain = getCommunity((await headers()).get("host"));

  const group = subdomain ? (await getCommunityValidation(subdomain)).group : null;

  return (
    <html lang="en">
      <body>
        <CommunityProvider subdomain={subdomain} group={group}><AuthProvider>{children}</AuthProvider></CommunityProvider>
      </body>
    </html>
  );
}
