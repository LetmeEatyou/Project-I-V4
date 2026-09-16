/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: "#FFFFFF",
    tint: "#FFFFFF",
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#111111",
    cardForeground: "#FFFFFF",
    primary: "#FFFFFF",
    primaryForeground: "#000000",
    secondary: "#1B1B1B",
    secondaryForeground: "#FFFFFF",
    muted: "#292929",
    mutedForeground: "#929292",
    accent: "#2947A5",
    accentForeground: "#FFFFFF",
    destructive: "#D98999",
    destructiveForeground: "#FFFFFF",
    border: "#222222",
    input: "#292929",
    success: "#FFFFFF",
    warning: "#D98999",
    deepCard: "#111111",
    brightCard: "#2947A5",
  },

  dark: {
    text: "#FFFFFF",
    tint: "#FFFFFF",
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#111111",
    cardForeground: "#FFFFFF",
    primary: "#FFFFFF",
    primaryForeground: "#000000",
    secondary: "#1B1B1B",
    secondaryForeground: "#FFFFFF",
    muted: "#292929",
    mutedForeground: "#929292",
    accent: "#2947A5",
    accentForeground: "#FFFFFF",
    destructive: "#D98999",
    destructiveForeground: "#FFFFFF",
    border: "#222222",
    input: "#292929",
    success: "#FFFFFF",
    warning: "#D98999",
    deepCard: "#111111",
    brightCard: "#2947A5",
  },

  radius: 22,
};

export default colors;
