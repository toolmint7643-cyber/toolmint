import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/color-picker");

export default function ToolLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
