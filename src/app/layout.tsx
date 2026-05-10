import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pickd — Pick a film, not a fight.",
  description: "Swipe or match your Letterboxd watchlists with friends and pick a film to watch tonight.",
  openGraph: {
    title: "Pickd",
    description: "Pick a film, not a fight.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="film-grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
