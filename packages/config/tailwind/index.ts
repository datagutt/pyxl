/** @type {import('tailwindcss').Config} */

import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: [""],
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: "class", // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: colors.green,
        //secondary: colors.yellow,
        gray: {
          50: "#f4f4f4",
          100: "#e0e0e0",
          200: "#c6c6c6",
          300: "#a8a8a8",
          400: "#8d8d8d",
          500: "#6f6f6f",
          600: "#525252",
          700: "#393939",
          800: "#262626",
          900: "#161616",
        },
      },
      fontFamily: {
        sans: ["InterVariable", ...defaultTheme.fontFamily.sans],
      },
      maxHeight: {
        xs: "20rem",
        sm: "24rem",
        md: "28rem",
        lg: "32rem",
        xl: "36rem",
        "2xl": "42rem",
        "3xl": "48rem",
        "4xl": "56rem",
        "5xl": "64rem",
        "6xl": "72rem",
      },
      zIndex: {
        "-10": "-10",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
