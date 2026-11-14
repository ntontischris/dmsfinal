import { StyleSheet } from "@react-pdf/renderer";

import { BRAND } from "@/lib/pdf/brand-styles";

// Μόνο ό,τι έχει η Συμφωνία· το πλαίσιο, τα χρώματα και η γραμματοσειρά είναι κοινά (src/lib/pdf).

export const s = StyleSheet.create({
  section: { marginTop: 22 },
  sub: { fontWeight: 600, marginTop: 10, marginBottom: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: BRAND.rule,
  },
  firstRow: { borderTopWidth: 0.75, borderTopColor: BRAND.midnight },
  rowMain: { flexGrow: 1, flexShrink: 1, paddingRight: 16 },
  rowAside: { alignItems: "flex-end" },
  muted: { color: BRAND.muted, fontSize: 8.5 },
  strong: { fontWeight: 600 },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: BRAND.rule,
  },
  totalValue: { fontSize: 16, fontWeight: 800, letterSpacing: -0.3 },
  bullet: { flexDirection: "row", marginTop: 3 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BRAND.periwinkle,
    marginTop: 5.5,
    marginRight: 9,
  },
  bulletText: { flex: 1 },
  signature: {
    marginTop: 26,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: BRAND.raised,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.periwinkle,
  },
  signatureText: { fontSize: 11, fontWeight: 600 },
});
