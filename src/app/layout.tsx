import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: {
    default: "VFX Machine — Modular Film Effects Workbench",
    template: "%s | VFX Machine",
  },
  description: "A modular post-production workbench for effect design, preview, and MCP-ready workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
