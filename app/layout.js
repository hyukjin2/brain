import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Brain Dashboard",
  description: "MATLAB 분석 결과를 시각화하는 웹 대시보드"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/params">Params</Link>
            <Link href="/training">Training</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
