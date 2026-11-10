import { SpacesFilmingQueue } from "@/modules/filming";

export const metadata = { title: "Ουρά έγκρισης" };

// E2: όσα περιμένουν απόφαση της ομάδας: νέες κρατήσεις και αιτήματα ακύρωσης.
export default function FilmingQueuePage() {
  return <SpacesFilmingQueue />;
}
