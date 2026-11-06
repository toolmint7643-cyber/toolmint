import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/schema-validator-lite");

export default function ToolLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
