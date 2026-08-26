import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawback",
  description: "Your bills are negotiable. Your data shouldn't be.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="top">
          <Link href="/" className="brand">
            Claw<span>back</span>
          </Link>
          <Link href="/cases/new" className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
            Start a case
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
