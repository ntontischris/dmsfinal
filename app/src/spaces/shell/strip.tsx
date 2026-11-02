import { NowTile, type Now } from "@/spaces/kit/now-tile";
import { StatGrid, type StatProps } from "@/spaces/kit/panel";

interface StripProps {
  stats: readonly StatProps[];
  now: Now | null;
}

// Η λωρίδα (screens2): έως 3 αριθμοί και το κίτρινο Τώρα τελευταίο. Χωρίς τίποτα, δεν πιάνει χώρο.
export function Strip({ stats, now }: StripProps) {
  if (stats.length === 0 && now === null) return null;
  return (
    <section className="strip" data-now={now !== null}>
      {stats.length > 0 && <StatGrid items={stats} />}
      {now && <NowTile now={now} />}
    </section>
  );
}
