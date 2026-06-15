import type { Metadata } from "next";
import {
  Inter,
  Source_Code_Pro,
  Orbitron,
  Courier_Prime,
} from "next/font/google";
import { RootProvider } from "./rootProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  // Base metadata for all contexts
  const baseMetadata: Metadata = {
    title: "Spaceship",
    description:
      "Spaceship - Multiply your fund with fun. Play the crash game on Base.",
    icons: {
      icon: "/logo.png",
    },
  };

  return {
    ...baseMetadata,
    other: {
      "base:app_id": "6963ca59b8395f034ac224a2",
      "talentapp:project_verification":
        "a7cc46e178fd79b0de428df4f8ca8869c527df0cddfb569d1f1e9f4a0b1ac5cc2f3948a307974b1c7e16708d8d0dcb007c8cb942ef676f20596e8085011b263a",
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: "https://spaceship-sand.vercel.app/embed-image",
        button: {
          title: `Launch Spaceship`,
          action: {
            type: "launch_miniapp",
            name: "Spaceship",
            url: "https://spaceship-sand.vercel.app",
            splashImageUrl: "https://spaceship-sand.vercel.app/splash-image",
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sourceCodePro.variable} ${orbitron.variable} ${courierPrime.variable}`}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
