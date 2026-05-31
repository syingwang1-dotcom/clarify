interface ChipOption {
  label: string;
  value: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export function ChipGroup({
  options,
  value: selected,
  onChange,
  className = "",
}: ChipGroupProps) {
  return (
    <div className={["flex gap-4", className].join(" ")}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "pb-2 px-1 text-xs uppercase tracking-[0.1em] cursor-pointer transition-all border-b-2",
            selected === opt.value
              ? "text-[#1A1A1A] border-[#D4AF37]"
              : "text-[#6C6863] border-transparent hover:text-[#1A1A1A]",
          ].join(" ")}
          style={{
            transitionDuration: "500ms",
            transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
