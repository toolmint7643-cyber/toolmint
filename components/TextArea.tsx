type TextAreaProps = {
  value: string;
  onChange?: (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  readOnly?: boolean;
};

export default function TextArea({
  value,
  onChange,
  placeholder,
  readOnly = false,
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className="
        w-full
        h-80
        rounded-xl
        border
        border-slate-700
        bg-slate-900
        text-white
        p-4
        outline-none
        resize-none
        focus:border-blue-500
      "
    />
  );
}