interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-xs uppercase tracking-[0.1em] text-[#6C6863]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          "w-full py-3 bg-transparent border-0 border-b border-[#1A1A1A]/20",
          "font-sans text-[#1A1A1A] placeholder:font-serif placeholder:italic placeholder:text-[#6C6863]/60",
          "focus:outline-none focus:border-[#D4AF37]",
          "transition-all",
          className,
        ].join(" ")}
        style={{ transitionDuration: "500ms", transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        {...props}
      />
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", id, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-xs uppercase tracking-[0.1em] text-[#6C6863]"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={[
          "w-full py-3 bg-transparent border-0 border-b border-[#1A1A1A]/20",
          "font-sans text-[#1A1A1A] placeholder:font-serif placeholder:italic placeholder:text-[#6C6863]/60",
          "focus:outline-none focus:border-[#D4AF37]",
          "transition-all resize-none",
          className,
        ].join(" ")}
        style={{ transitionDuration: "500ms", transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        {...props}
      />
    </div>
  );
}
