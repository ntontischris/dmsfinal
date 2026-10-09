import { z } from "zod";

import { getViewer } from "@/modules/access";
import {
  agreementCaps,
  getAgreement,
  listProvisionKinds,
} from "@/modules/agreements";

import {
  AgreementBody,
  LoadError,
  Missing,
  NoAccess,
  loadExtras,
  requestOrigin,
} from "./page-parts";

export const metadata = { title: "Συμφωνία" };

// D2: η Συμφωνία. Κάθε πεδίο είναι πεδίο για όποιον μπορεί να το αλλάξει και κείμενο για τους άλλους· το τι επιτρέπεται το λέει
// το `can` που δίνει η βάση, και ό,τι ο θεατής δεν δικαιούται να δει (τιμές, ώρες, κόστος) φτάνει εδώ ως null.
export default async function AgreementPage({
  params,
}: {
  params: Promise<{ agreementId: string }>;
}) {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} />;

  const { agreementId } = await params;
  const id = z.uuid().safeParse(agreementId);
  if (!id.success) return <Missing />;

  const [found, kinds] = await Promise.all([
    getAgreement(id.data),
    listProvisionKinds(),
  ]);
  if (!found.ok || !kinds.ok) return <LoadError />;
  if (found.data === null) return <Missing />;

  const [extras, origin] = await Promise.all([
    loadExtras(found.data, caps),
    requestOrigin(),
  ]);
  return (
    <AgreementBody
      agreement={found.data}
      kinds={kinds.data}
      caps={caps}
      extras={extras}
      origin={origin}
    />
  );
}
