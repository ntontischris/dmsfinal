import { StateNotice } from "@/spaces/screens/shared";

import { deadMessagesOf, type D5DeadInput } from "./d5-adapter";

// Ο Σύνδεσμος που δεν δουλεύει πια (prototype `screens/D5.tsx` › DeadLink): έληξε, ανακλήθηκε, υπάρχει νεότερος,
// υπογράφηκε, έκλεισε, δεν υπάρχει. Ένα μήνυμα ανά γλώσσα (ο άγνωστος Σύνδεσμος δείχνει και τις δύο).
export function SpacesDeadLink(props: D5DeadInput) {
  return (
    <div className="d5-dead">
      {props.company && <p className="d5-brand">{props.company.name}</p>}
      {deadMessagesOf(props).map((message) => (
        <div key={message.language} lang={message.language}>
          <StateNotice kind="denied" title={message.title}>
            {message.contact && <p>{message.contact}</p>}
            {message.reach && <p>{message.reach}</p>}
          </StateNotice>
        </div>
      ))}
    </div>
  );
}
