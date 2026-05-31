import { easing } from "@/lib/design-tokens";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-8 py-3 text-sm uppercase tracking-[0.1em] cursor-pointer transition-all select-none active:scale-[0.98]";

  const variants: Record<ButtonVariant, string> = {
    primary: [
      "relative bg-[#1A1A1A] text-[#F9F8F6] overflow-hidden",
      "before:absolute before:inset-0 before:bg-[#D4AF37] before:translate-x-[-101%]",
      "hover:before:translate-x-0",
      "before:transition-transform",
    ].join(" "),
    secondary: [
      "bg-transparent text-[#1A1A1A] border border-[#1A1A1A]",
      "hover:bg-[#1A1A1A] hover:text-[#F9F8F6]",
    ].join(" "),
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={{ transitionDuration: easing === "cubic-bezier(0.25, 0.46, 0.45, 0.94)" ? "500ms" : "500ms" }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
