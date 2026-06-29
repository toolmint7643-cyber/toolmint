type AgeStatCardProps = {
  value: number;
  label: string;
};

export default function AgeStatCard({
  value,
  label,
}: AgeStatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">

      <div className="text-4xl font-extrabold text-blue-400">
        {value}
      </div>

      <div className="mt-2 text-slate-400">
        {label}
      </div>

    </div>
  );
}