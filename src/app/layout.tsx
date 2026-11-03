import type { ReactNode } from "react";
import { Providers } from "./providers";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
export const metadata = {
  title: { default: "Amentorz Admin", template: "%s | Amentorz Admin" },
  description: "Amentorz administration portal",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
