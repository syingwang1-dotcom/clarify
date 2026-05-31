interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "bg-[#F9F8F6] border-t border-[#1A1A1A]/10 px-6 py-5",
        "transition-all hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:-translate-y-[1px]",
        className,
      ].join(" ")}
      style={{
        transitionDuration: "500ms",
        transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      {children}
    </div>
  );
}
