import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Financeiro · Controle de Cobranças",
  description: "Cérebro financeiro da consultoria — parcelas, inadimplência e reembolsos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-base text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
