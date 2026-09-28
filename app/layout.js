import { Nunito } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { getUserTimeZone } from "@/lib/timezone";
import { TimeZoneProvider } from "@/lib/timezone-client";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "VibeLearning",
  description: "Tu estudio, más fácil y dinámico: transcripción en vivo, active recall y resumen con IA.",
};

// Aplica el tema guardado (o el del sistema) antes del primer pintado, para que no parpadee.
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("vl-theme")||"system";var d=p==="dark"||(p==="system"&&!window.matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

export default async function RootLayout({ children }) {
  const tz = await getUserTimeZone();
  return (
    <html lang="es" className={`${nunito.variable} h-full`} suppressHydrationWarning>
      <head>
        <Script id="vl-theme" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <TimeZoneProvider tz={tz}>{children}</TimeZoneProvider>
      </body>
    </html>
  );
}
