import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "TasksAI",
  description: "Capture and explore tagged tasks with powerful search.",
};

function ThemeScript() {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('tasksai-theme');
        if (t === 'light') document.documentElement.classList.remove('dark');
        else document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
