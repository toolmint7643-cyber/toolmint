type PageTitleProps = {
  title: string;
  description?: string;
};

export default function PageTitle({
  title,
  description,
}: PageTitleProps) {
  return (
    <div className="text-center mb-10">
      <h1 className="text-4xl md:text-5xl font-bold text-white">
        {title}
      </h1>

      {description && (
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
}