import { parseLang } from "@/data/website-access";
import { CaseBar, DeadLink, findCase } from "@/screens/r13-dead";
import { FriendlyError } from "@/screens/r9-card";
import { StateSwitcher, parseState, type ScreenProps } from "@/screens/shared";
import { SiteFrame } from "@/screens/w-site";

// R13 «Ο σύνδεσμος δεν ισχύει πια». Οι παλιές διαδρομές σελίδων κάνουν redirect και δεν φτάνουν εδώ.
export function R13({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const state = parseState(query.state);
  const deadCase = findCase(query.case);
  return (
    <>
      <StateSwitcher
        role={role}
        code="R13"
        state={state}
        keep={{ ...query, state: undefined }}
      />
      <CaseBar role={role} lang={lang} current={deadCase.id} />
      <SiteFrame
        role={role}
        code="R13"
        lang={lang}
        path="/link-expired"
        query={query}
        hasWidget={false}
      >
        {state === "error" ? (
          <FriendlyError lang={lang} />
        ) : (
          <DeadLink role={role} lang={lang} c={deadCase} />
        )}
      </SiteFrame>
    </>
  );
}
