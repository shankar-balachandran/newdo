import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const title = "newdo";
const description =
  "The list is an output, never an input. Type what you owe in plain words; newdo works out who, when, and how big, and shows you the five things that matter today, with a reason.";

export const metadata: Metadata = {
  metadataBase: new URL("https://newdo.beaverminds.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://newdo.beaverminds.com",
    siteName: "newdo",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "newdo: the list is an output, never an input." }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
