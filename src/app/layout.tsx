import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brand Review Desk | Review with evidence",
  description: "A focused workspace for reviewing campaign content against approved brand sources, with a human in charge of the decision.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
