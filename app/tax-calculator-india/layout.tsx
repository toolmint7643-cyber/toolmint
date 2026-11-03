import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/tax-calculator-india");

export default function ToolLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
