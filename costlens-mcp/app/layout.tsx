import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CostLens MCP — Ask your AI assistant about cloud + AI spend",
  description:
    "FOCUS-native MCP server. Unified cloud (AWS/Azure/GCP) and AI vendor (OpenAI/Anthropic) cost intelligence for Claude Desktop, Windsurf, Cursor, and Codex.",
  metadataBase: new URL("https://costlens.dev")
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              <span className="gradient-text">CostLens</span>
              <span className="text-fg-muted ml-1.5 text-sm font-normal">MCP</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="text-fg-muted hover:text-fg">
                Playground
              </Link>
              <Link href="/install" className="text-fg-muted hover:text-fg">
                Install
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-fg-muted hover:text-fg"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border mt-24">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-fg-subtle">
            <div>© {new Date().getFullYear()} CostLens MCP — MIT licensed</div>
            <div className="flex items-center gap-5">
              <Link href="/dashboard" className="hover:text-fg">
                Playground
              </Link>
              <Link href="/install" className="hover:text-fg">
                Install
              </Link>
              <a href="https://focus.finops.org" target="_blank" rel="noreferrer" className="hover:text-fg">
                FOCUS spec
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
