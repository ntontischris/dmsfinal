// Τα στοιχεία σύνδεσης με το Supabase. Τα γράφει στο Vercel η σύνδεση Supabase ↔ Vercel· ποτέ στον κώδικα.
// Χωρίς αυτά η εφαρμογή τρέχει, αλλά ό,τι θέλει βάση δείχνει «η βάση δεν έχει συνδεθεί».
export interface SupabaseConfig {
  url: string;
  key: string;
}

export const supabaseConfig = (): SupabaseConfig | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
};
