import type { RoleId } from "@/data/roles";
import type { Lang, Work } from "@/data/website";
import {
  isCaseStudy,
  publicSectors,
  sectorName,
  workTitle,
} from "@/data/website-access";
import type { Clip } from "@/screens/r1-clip";
import type { SceneKind } from "@/screens/r1-footage";
import { siteHref, tr } from "@/screens/w-site";

// R1: οι Επιλεγμένες Δουλειές ως κλιπ της αίθουσας μοντάζ (στον server).

// Ένα «πλάνο» ανά Δουλειά· άγνωστη Δουλειά παίρνει σκηνή με τη σειρά.
const SCENE_OF: Readonly<Record<string, { scene: SceneKind; hue: number }>> = {
  "showreel-2026": { scene: "stage", hue: 20 },
  "kinisi-gym-launch": { scene: "bakery", hue: 80 },
  "kypseli-cafe": { scene: "cafe", hue: 55 },
  "armyra-summer": { scene: "shore", hue: 220 },
  "athina-coffee": { scene: "cafe", hue: 35 },
};
const FALLBACK: readonly { scene: SceneKind; hue: number }[] = [
  { scene: "harbour", hue: 250 },
  { scene: "shore", hue: 220 },
  { scene: "stage", hue: 300 },
];

const kindOf = (work: Work, lang: Lang): string => {
  const names = publicSectors(lang)
    .filter((s) => work.sectorIds.includes(s.id))
    .map((s) => sectorName(s, lang));
  return names.length > 0
    ? names.join(", ")
    : tr(lang, "Δική μας παραγωγή", "Our own production");
};

export const clipsOf = (
  works: readonly Work[],
  role: RoleId,
  lang: Lang,
): readonly Clip[] => {
  const slot = 100 / Math.max(works.length, 1);
  return works.map((work, i) => {
    const isCase = isCaseStudy(work, lang);
    const look = SCENE_OF[work.slug] ?? FALLBACK[i % FALLBACK.length];
    return {
      id: work.id,
      code: `A00${i + 1}_C0${12 + i * 7}`,
      title: workTitle(work, lang),
      summary:
        lang === "en" ? (work.summaryEn ?? work.summaryEl) : work.summaryEl,
      kind: kindOf(work, lang),
      host: work.video.host,
      href: isCase
        ? siteHref(role, "R4", lang, { work: work.slug })
        : siteHref(role, "R3", lang, { play: work.slug }),
      linkLabel: isCase
        ? tr(lang, "Μελέτη περίπτωσης →", "Case study →")
        : `▶ ${work.video.host}`,
      ...look,
      start: i * slot + 0.5,
      length: slot - 1,
    };
  });
};
