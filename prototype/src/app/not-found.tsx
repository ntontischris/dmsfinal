import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="main">
      <h1>Δεν υπάρχει αυτή η σελίδα</h1>
      <p className="muted">Ο κωδικός οθόνης ή ο ρόλος δεν είναι στον κατάλογο.</p>
      <Link href="/owner">Πίσω στην αρχή</Link>
    </main>
  );
}
