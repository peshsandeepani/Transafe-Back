import { StyleSheet } from "react-native";

export default StyleSheet.create({
  // Color Palette - SafeZone Guardians Modern Theme
  colors: {
    primary: "#1e3a8f",
    primaryLight: "#2563eb",
    primaryDark: "#1e40af",
    accent: "#00bcd4",
    accentLight: "#4dd0e1",
    accentDark: "#0891b2",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    bg: "#0f172a",
    bgLight: "#1e293b",
    bgSecondary: "#334155",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    border: "#334155",
  },

  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16,
  },

  loginContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 20,
  },

  title: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 40,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#cbd5e1",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },

  input: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#334155",
    fontWeight: "500",
  },

  inputFocused: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#00bcd4",
    fontWeight: "500",
  },

  textArea: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "#334155",
    fontWeight: "500",
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    elevation: 4,
    shadowColor: "rgba(37, 99, 235, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  buttonHover: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    elevation: 8,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    elevation: 4,
  },

  accentButton: {
    backgroundColor: "#00bcd4",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    elevation: 4,
  },

  successButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  warningButton: {
    backgroundColor: "#f59e0b",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  backButton: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#334155",
  },

  logoutButton: {
    backgroundColor: "#ef4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
    elevation: 4,
  },

  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  cardWithGradient: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#00bcd4",
    elevation: 4,
  },

  welcome: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  info: {
    color: "#cbd5e1",
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 24,
  },

  infoHighlight: {
    color: "#4dd0e1",
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "600",
  },

  sectionTitle: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    marginHorizontal: 12,
    letterSpacing: -0.3,
  },

  cardTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    alignSelf: "flex-start",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  detailColumn: {
    flex: 1,
  },

  detailLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },

  detailValue: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
  },

  officerCard: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 8,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  menuButton: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#334155",
    elevation: 2,
    marginBottom: 12,
    marginHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#334155",
    elevation: 2,
  },

  menuButtonActive: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00bcd4",
    elevation: 4,
  },

  screenContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingBottom: 120,
  },

  menuText: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  warningCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: "#ef4444",
  },

  warningTitle: {
    color: "#fca5a5",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },

  warningText: {
    color: "#f8fafc",
    fontSize: 16,
    marginBottom: 8,
  },

  errorCard: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ef4444",
  },

  successCard: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#10b981",
  },

  incidentCard: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 2,
  },

  incidentCardActive: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: "#00bcd4",
    elevation: 4,
  },

  incidentTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  activeText: {
    color: "#fca5a5",
    fontWeight: "700",
  },

  resolvedText: {
    color: "#86efac",
    fontWeight: "700",
  },

  pendingText: {
    color: "#fbbf24",
    fontWeight: "700",
  },

  mapBox: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    marginHorizontal: 12,
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
    elevation: 4,
  },

  map: {
    width: "100%",
    height: "100%",
  },

  fullMapBox: {
    height: 650,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
    elevation: 4,
  },

  header: {
    backgroundColor: "#1e293b",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#334155",
    elevation: 4,
  },

  headerText: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },

  badge: {
    backgroundColor: "#00bcd4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  badgeText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  errorBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  successBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  warningBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  footer: {
    backgroundColor: "#1e293b",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: "#334155",
    elevation: 4,
  },

  footerText: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  column: {
    flexDirection: "column",
  },

  spacer: {
    height: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 12,
    marginHorizontal: 12,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  accentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(0, 188, 212, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
});