type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger";
};

export default function Button({
  children,
  onClick,
  variant = "primary",
}: ButtonProps) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700",
    secondary: "bg-gray-600 hover:bg-gray-700",
    success: "bg-green-600 hover:bg-green-700",
    danger: "bg-red-600 hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      className={`${styles[variant]} px-5 py-3 rounded-lg text-white font-semibold transition`}
    >
      {children}
    </button>
  );
}