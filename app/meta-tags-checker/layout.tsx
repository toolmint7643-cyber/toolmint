import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/meta-tags-checker");

export default function ToolLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
