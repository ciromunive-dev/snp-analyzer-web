import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable}`}>
      <body className="bg-background text-white antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
