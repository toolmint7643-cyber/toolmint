import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/break-even-calculator");

export default function BreakEvenCalculatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
