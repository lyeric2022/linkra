import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Linkra - Startup League Table",
  description: "Rank startups head-to-head and trade virtual positions in a simulated market",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGuard>
            <Nav />
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
