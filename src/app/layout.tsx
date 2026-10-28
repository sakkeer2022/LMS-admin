import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";
export const metadata = {
  title: { default: "Portal Foundation", template: "%s | Portal Foundation" },
  description: "Modular platform starter",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
