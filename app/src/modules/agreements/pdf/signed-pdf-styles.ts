import { StyleSheet } from "@react-pdf/renderer";

export const FAMILY = "InterTight";

// Τα χρώματα της εφαρμογής (spaces/styles/brand.css), στη φωτεινή εκδοχή για χαρτί.
const BRAND = {
  midnight: "#060d14",
  deep: "#0f192b",
  periwinkle: "#a3b1f1",
  yellow: "#ebd68e",
  muted: "#4a5468",
  rule: "#dfe3f0",
  raised: "#eef1fd",
};

export const s = StyleSheet.create({
  page: {
    fontFamily: FAMILY,
    fontSize: 9.5,
    color: BRAND.deep,
    paddingTop: 40,
    paddingBottom: 48,
    lineHeight: 1.45,
  },
  // Η μπάντα στην κορυφή της πρώτης σελίδας· οι επόμενες ξεκινούν με κενό 40pt.
  band: {
    marginTop: -40,
    backgroundColor: BRAND.midnight,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    borderBottomWidth: 3,
    borderBottomColor: BRAND.yellow,
  },
  brand: { color: BRAND.periwinkle, fontSize: 11, fontWeight: 600 },
  kicker: { color: "#ffffff", fontSize: 8, marginTop: 14, opacity: 0.7 },
  title: { color: "#ffffff", fontSize: 20, fontWeight: 600, marginTop: 2 },
  meta: { color: "#ffffff", fontSize: 8.5, marginTop: 4, opacity: 0.7 },
  body: { paddingHorizontal: 40, paddingTop: 18 },
  section: { marginTop: 14 },
  label: {
    fontSize: 7.5,
    fontWeight: 600,
    color: BRAND.muted,
    letterSpacing: 0.8,
    paddingBottom: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.rule,
  },
  sub: { fontWeight: 600, marginTop: 8, marginBottom: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.rule,
  },
  rowMain: { flexGrow: 1, flexShrink: 1, paddingRight: 12 },
  rowAside: { alignItems: "flex-end" },
  muted: { color: BRAND.muted, fontSize: 8.5 },
  strong: { fontWeight: 600 },
  bullet: { flexDirection: "row", marginTop: 2 },
  dot: { width: 10, color: BRAND.muted },
  signature: {
    marginTop: 18,
    padding: 12,
    backgroundColor: BRAND.raised,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.periwinkle,
  },
  legal: { marginTop: 16, color: BRAND.muted, fontSize: 7.5 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    color: BRAND.muted,
    fontSize: 7.5,
  },
});
