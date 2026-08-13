// SafeZone Guardians Modern Theme Configuration
// Colors based on app logo branding

export const theme = {
  colors: {
    // Primary Colors
    primary: "#1e3a8f",
    primaryLight: "#2563eb",
    primaryDark: "#1e40af",
    
    // Accent Colors
    accent: "#00bcd4",
    accentLight: "#4dd0e1",
    accentDark: "#0891b2",
    
    // Status Colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#06b6d4",
    
    // Background Colors
    bg: "#0f172a",
    bgLight: "#1e293b",
    bgSecondary: "#334155",
    bgTertiary: "#475569",
    
    // Text Colors
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textTertiary: "#94a3b8",
    
    // Border Colors
    border: "#334155",
    borderLight: "#475569",
    borderAccent: "#00bcd4",
    
    // Shadows (for elevation)
    shadowLight: "rgba(0, 0, 0, 0.1)",
    shadowMedium: "rgba(0, 0, 0, 0.2)",
    shadowHeavy: "rgba(0, 0, 0, 0.4)",
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: "700",
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    body: {
      fontSize: 16,
      fontWeight: "400",
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 24,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 20,
      letterSpacing: 0.2,
    },
    button: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      letterSpacing: 0.3,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 14,
    xl: 16,
    full: 20,
  },

  elevation: {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: "rgba(0, 0, 0, 0.1)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "rgba(0, 0, 0, 0.15)",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "rgba(0, 0, 0, 0.2)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
  },

  gradients: {
    primary: ["#2563eb", "#1e40af"],
    accent: ["#00bcd4", "#0891b2"],
    accentGlow: ["#4dd0e1", "#00bcd4"],
    success: ["#10b981", "#059669"],
    warning: ["#f59e0b", "#d97706"],
    error: ["#ef4444", "#dc2626"],
  },
};

export default theme;
