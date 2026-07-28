import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Belle Perle, Korean Shopping",
    template: "%s | Belle Perle",
  },
  description: "Productos de skincare y K-pop disponibles durante nuestro viaje a Corea.",
  applicationName: "Belle Perle, Korean Shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
