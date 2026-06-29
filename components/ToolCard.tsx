type ToolCardProps = {
  children: React.ReactNode;
};

export default function ToolCard({
  children,
}: ToolCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
      {children}
    </div>
  );
}