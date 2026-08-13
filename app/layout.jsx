import "./globals.css";

export const metadata={
  title:"UniPath 1.0 — Admissions Planning OS",
  description:"Persistent applicant intelligence, college intelligence, strategy, projects, roadmap and admissions planning."
};

export default function RootLayout({children}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
