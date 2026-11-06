import type { ReactNode } from "react";
import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/keyword-suggestion-lite");

export default function KeywordSuggestionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
