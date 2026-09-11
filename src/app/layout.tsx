import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMSCA — Together, we save for more",
  description:
    "Community Managed Savings and Credit Association. Save together, grow together, and sign in to your COMSCA community.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
