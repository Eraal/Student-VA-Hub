import { Bricolage_Grotesque } from "next/font/google";

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
});

export const displayFontClass = bricolage.className;
