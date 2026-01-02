import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "SNP Analyzer - Analiza variantes geneticas en tu ADN",
  description:
    "Aplicacion web para analisis de variantes geneticas (SNPs) en ADN humano. Detecta y anota funcionalmente variantes con informacion clinica.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: [
    "SNP",
    "variantes geneticas",
    "ADN",
    "bioinformatica",
    "BLAST",
    "ClinVar",
    "gnomAD",
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="es" className={`${geist.variable}`}>
      <body className="bg-background text-text antialiased">
        <SessionProvider session={session}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
