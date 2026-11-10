import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import { SharingProvider } from "@/lib/sharing";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Keel — break costly habits, keep the difference",
  description:
    "A private journal for cutting out drinking and impulse spending. Track money saved, ride out urges, plan for triggers and watch it get easier.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecf0ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0f191c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("keel:theme");if(t&&t!=="system")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Public+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AuthProvider>
          <StoreProvider>
            <SharingProvider>
              <Shell>{children}</Shell>
            </SharingProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
