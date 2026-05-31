"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { id: "input" as const, label: "输入", href: "/" },
  { id: "execute" as const, label: "执行", href: "/exec" },
  { id: "review" as const, label: "复盘", href: "/review" },
];

export function NavHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="flex justify-between items-end pb-8 border-b border-[#1A1A1A]/10">
      <Link
        href="/"
        className="font-serif italic text-2xl text-[#1A1A1A] tracking-tight transition-all hover:text-[#D4AF37]"
        style={{
          transitionDuration: "500ms",
          transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        Clarify
      </Link>
      <nav className="flex gap-8">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={[
              "pb-1 text-xs uppercase tracking-[0.12em] transition-all border-b-2",
              isActive(tab.href)
                ? "text-[#1A1A1A] border-[#D4AF37]"
                : "text-[#6C6863] border-transparent hover:text-[#D4AF37]",
            ].join(" ")}
            style={{
              transitionDuration: "500ms",
              transitionTimingFunction:
                "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
