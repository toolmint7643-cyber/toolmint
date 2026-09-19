import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/watermark-pdf");

export default function ToolLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
