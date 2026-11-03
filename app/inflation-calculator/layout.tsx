import { getToolMetadata } from "@/data/toolMetadata";

export const metadata = getToolMetadata("/inflation-calculator");

export default function InflationCalculatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
