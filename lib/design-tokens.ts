export const colors = {
  bg: "#F9F8F6",
  fg: "#1A1A1A",
  muted: "#6C6863",
  accent: "#D4AF37",
  surface: "#EBE5DE",
  border: "rgb(26 26 26 / 0.1)",
  borderStrong: "rgb(26 26 26 / 0.2)",
} as const;

export const fonts = {
  serif: "Playfair Display, ui-serif, Georgia, serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
} as const;

export const easing = "cubic-bezier(0.25, 0.46, 0.45, 0.94)" as const;

export const durations = {
  fast: "500ms",
  image: "1500ms",
  imageSlow: "2000ms",
} as const;

export const spacing = {
  section: "py-20",
  sectionLg: "py-32",
} as const;

export const tracking = {
  label: "0.1em",
  wide: "0.12em",
} as const;
