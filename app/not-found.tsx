import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="font-serif italic text-6xl text-[#EBE5DE] mb-6">404</p>
      <p className="font-serif italic text-[#6C6863] text-lg mb-10">
        这个页面不存在
      </p>
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.1em] text-[#1A1A1A] underline underline-offset-4 transition-all hover:text-[#D4AF37]"
        style={{
          transitionDuration: "500ms",
          transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        回到首页
      </Link>
    </div>
  );
}
