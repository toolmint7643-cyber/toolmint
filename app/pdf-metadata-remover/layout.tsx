import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/pdf-metadata-remover");

export default function ToolLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
