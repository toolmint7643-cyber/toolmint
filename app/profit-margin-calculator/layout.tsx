import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/profit-margin-calculator");

export default function ProfitMarginCalculatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
