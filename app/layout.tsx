import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Clarify",
    default: "Clarify — 从混乱到清晰",
  },
  description: "任务管理，从混乱到清晰",
  openGraph: {
    title: "Clarify",
    description: "任务管理，从混乱到清晰",
    siteName: "Clarify",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='25' font-size='24' font-family='Georgia,serif' font-weight='700' fill='%23D4AF37'%3EC%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
