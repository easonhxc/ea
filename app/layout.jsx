import "./globals.css";
import "./upgrade.css";

export const metadata={
  title:"UniPath — Admissions Planning Workspace",
  description:"A focused workspace for applicant evidence, college fit, projects, roadmap and application strategy."
};

export default function RootLayout({children}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
