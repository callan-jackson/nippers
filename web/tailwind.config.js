/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: { 50: "#EEF6FF", 100: "#D9EBFF", 200: "#B3D6FF", 300: "#7FBAF5", 400: "#4F9BE8", 500: "#2B7FD6", 600: "#1F66B3", 700: "#17508C", 800: "#123D6B" },
        sun: { 100: "#FFF3C4", 200: "#FFE99E", 300: "#FFE08A", 400: "#FFD24D", 500: "#FFC21A", 600: "#E5A800" },
        leaf: { 100: "#E3F5E7", 200: "#C2EBCB", 300: "#8ED9A2", 400: "#4CBF6B", 500: "#2FA653", 600: "#23854A", 700: "#1B6639" },
        coral: { 100: "#FFE5E0", 200: "#FFC9BF", 300: "#FFA290", 400: "#FF7A66", 500: "#F25C47", 600: "#D3452F" },
        ink: { 300: "#9AA7BC", 400: "#7A889F", 500: "#5B6B85", 700: "#2B3A55", 900: "#14213D" },
        cream: "#FFFBF4",
      },
      fontFamily: {
        display: ["Fredoka", "Nunito", "system-ui", "sans-serif"],
        sans: ["Nunito", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(20,33,61,0.18)",
        card: "0 2px 12px -2px rgba(20,33,61,0.10)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        pop: { "0%": { transform: "scale(0.96)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: { float: "float 6s ease-in-out infinite", pop: "pop .18s ease-out" },
    },
  },
  plugins: [],
};
