import "./globals.css";

export const metadata = {
  title: "UniPath AI",
  description: "AI-assisted college admissions planning",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
