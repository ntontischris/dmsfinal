import { getViewer } from "@/modules/access";
import {
  SpacesAgreement,
  SpacesClientAgreement,
  agreementCaps,
} from "@/modules/agreements";

export const metadata = { title: "Συμφωνία" };

// D2: η Συμφωνία. Ό,τι ο θεατής δεν δικαιούται να δει (τιμές, ώρες, κόστος) φτάνει ως null. Ο Χρήστης πελάτη έχει τη δική του όψη.
export default async function AgreementPage({
  params,
}: {
  params: Promise<{ agreementId: string }>;
}) {
  const [viewer, { agreementId }] = await Promise.all([getViewer(), params]);
  if (agreementCaps(viewer).isClient)
    return <SpacesClientAgreement agreementId={agreementId} />;
  return <SpacesAgreement agreementId={agreementId} />;
}
