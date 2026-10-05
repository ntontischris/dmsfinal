# Σύγχρονες τεχνικές web design (Οκτώβριος 2026)

> Έρευνα για το [#56](https://github.com/ntontischris/dmsfinal/issues/56), μέρος του χάρτη [#54 «Wayfinder: Οθόνες»](https://github.com/ntontischris/dmsfinal/issues/54).
> Είσοδος για την **Οπτική κατεύθυνση**: τη δημόσια Ιστοσελίδα μιας ελληνικής εταιρείας παραγωγής video και την εσωτερική εφαρμογή διαχείρισης πίσω της, με **ένα κοινό σύνολο tokens και ύφος**.
> Στοίβα-στόχος: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui.
> Ημερομηνία έρευνας: 2026-10-05. Η υποστήριξη browsers προέρχεται από caniuse/MDN στη συγκεκριμένη ημερομηνία· οι αριθμοί αλλάζουν, οπότε να ξαναελεγχθούν πριν από κάθε απόφαση.

## Σύνοψη

| Τεχνική | Κατάσταση υποστήριξης | Κόστος απόδοσης | Κόστος προσβασιμότητας | Σύσταση |
|---|---|---|---|---|
| Variable fonts με ελληνικά | Καθολική | Χαμηλό (1 αρχείο αντί για πολλά) | Κανένα αν μένει αναγνώσιμο | **Ναι, βάση** |
| Fluid type με `clamp()` | Baseline widely available | Μηδενικό | Κίνδυνος στο zoom αν χρησιμοποιηθεί μόνο `vw` | **Ναι, με κανόνα rem + vw** |
| View Transitions (ίδιο έγγραφο) | Chrome 111+, Safari 18+, Firefox 144+ (~92%) | Χαμηλό (snapshots) | Χρειάζεται `prefers-reduced-motion` | **Ναι, μέσω React `<ViewTransition>`** |
| Scroll-driven animations | Chrome 115+, Safari 26+, Firefox 160+ (~87%)· MDN: όχι ακόμη Baseline | Χαμηλό αν μένει σε `transform`/`opacity` | Υψηλό αν κινεί μεγάλες επιφάνειες | **Μόνο στην Ιστοσελίδα, ως progressive enhancement** |
| Container size queries | Chrome 106+, Firefox 110+, Safari 16+ (~95%) | Αμελητέο | Κανένα | **Ναι, ειδικά στην εφαρμογή** |
| Container style queries | Πλήρης μόνο σε Firefox 151+· μερική (custom properties) σε Chrome/Safari | Αμελητέο | Κανένα | Περιορισμένα, μόνο σε custom properties |
| Subgrid | Chrome 117+, Firefox 71+, Safari 16+ (~93%) | Αμελητέο | Βελτιώνει τη σειρά DOM | **Ναι** |
| OKLCH | Baseline από 2023, πλέον widely available | Μηδενικό | Προβλέψιμη αντίθεση | **Ναι, ως μορφή όλων των tokens** |
| `color-mix()` | Baseline από 2023, widely available | Μηδενικό | Ελέγχεται η αντίθεση του αποτελέσματος | **Ναι** |
| Relative color syntax | Chrome 131+, Firefox 133+, Safari 18+ (~92%) | Μηδενικό | Όπως παραπάνω | Ναι, για παράγωγα χρώματα |
| `light-dark()` + `color-scheme` | Baseline από Μάιο 2024 | Μηδενικό | Σέβεται την προτίμηση του χρήστη | Ναι, ή shadcn `.dark` (βλ. §4) |

Πηγή όλων των ποσοστών: caniuse (σελίδες που παρατίθενται σε κάθε ενότητα). Ορισμός Baseline: «newly available» όταν το υποστηρίζουν όλοι οι βασικοί browsers, «widely available» 30 μήνες μετά ([web.dev/baseline](https://web.dev/baseline)).

---

## 1. Τυπογραφία

### 1.1 Variable fonts

- Ένα variable font αντικαθιστά πολλά στατικά αρχεία (βάρη, πλάτη, πλάγια). Το web.dev αναφέρει μείωση μεγέθους 88% όταν 48 στατικά αρχεία έγιναν ένα, με την επιφύλαξη ότι αν χρησιμοποιείς ένα μόνο βάρος, μπορεί να μην κερδίσεις τίποτα ([web.dev: Variable fonts](https://web.dev/articles/variable-fonts)).
- Το `next/font/google` κατεβάζει τις γραμματοσειρές **στο build** και τις σερβίρει από το ίδιο domain: «No requests are sent to Google by the browser». Δίνει `subsets` (π.χ. `['latin', 'greek']`), `axes` για επιπλέον άξονες πέρα από το `wght`, `variable` για CSS μεταβλητή και `adjustFontFallback` κατά του layout shift ([Next.js: Font Module](https://nextjs.org/docs/app/api-reference/components/font)). Ενσωματώνεται στο Tailwind v4 με `@theme inline { --font-sans: var(--font-…) }` (ίδια πηγή).
- Συμβουλή από το Next.js: λίγες οικογένειες, γιατί κάθε οικογένεια είναι επιπλέον λήψη (ίδια πηγή).

### 1.2 Γραμματοσειρές με ελληνικά (Google Fonts)

Έλεγχος στα επίσημα μεταδεδομένα του Google Fonts (`fonts.google.com/metadata/fonts`, 2026-10-05): υποσύνολο `greek` και διαθέσιμοι άξονες.

| Οικογένεια | Κατηγορία | Ελληνικά | Άξονες variable | Σχόλιο για το έργο |
|---|---|---|---|---|
| Inter | Sans | ναι | `opsz`, `wght` | Ασφαλής επιλογή για την εφαρμογή· ο άξονας `opsz` δίνει «display» εκδοχή για τίτλους |
| Inter Tight | Sans | ναι | `wght` | Πυκνότερη, για μεγάλους τίτλους |
| Roboto Flex | Sans | ναι | 13 άξονες (`wdth`, `opsz`, `GRAD`, `slnt` κ.ά.) | Πολύ εκφραστική για hero τυπογραφία· το `GRAD` αλλάζει πάχος χωρίς να αλλάζει πλάτος (χρήσιμο σε dark mode) |
| Commissioner | Sans | ναι | `wght`, `slnt`, `FLAR`, `VOLM` | Χαρακτήρας «studio» με μεταβλητές απολήξεις |
| Geologica | Sans | ναι | `wght`, `slnt`, `CRSV`, `SHRP` | Σύγχρονη, γεωμετρική, με άξονες για εκφραστικούς τίτλους |
| Manrope | Sans | ναι | `wght` | Καθαρή, «SaaS» αίσθηση |
| IBM Plex Sans | Sans | ναι | `wdth`, `wght` | Τεχνική, καλή για πίνακες δεδομένων |
| Noto Sans / Noto Serif | Sans / Serif | ναι | `wdth`, `wght` | Ευρύτατη κάλυψη, ουδέτερες |
| Literata | Serif | ναι | `opsz`, `wght` | Serif για εκδοτικά κείμενα και case studies |
| Source Serif 4 | Serif | ναι | `opsz`, `wght` | Serif με οπτικά μεγέθη |
| Piazzolla | Serif | ναι | `opsz`, `wght` | Εκφραστική serif με οπτικά μεγέθη |
| JetBrains Mono / Roboto Mono | Mono | ναι | `wght` | Για timecodes, κωδικούς, αριθμητικά πεδία |

**Δημοφιλείς σήμερα αλλά χωρίς ελληνικά στο Google Fonts** (να αποφευχθούν ή να ελεγχθεί άλλη πηγή): Geist, Geist Mono, Instrument Sans/Serif, Mona Sans, Hubot Sans, Bricolage Grotesque, Fraunces, Playfair Display, Montserrat, Newsreader, Unbounded, Onest. Με ελληνικά κείμενα ο browser θα έπεφτε σε fallback font για τα ελληνικά, με ανομοιόμορφο αποτέλεσμα.

### 1.3 Ελληνικά κεφαλαία

Το `text-transform: uppercase` αφαιρεί σωστά τους τόνους στα ελληνικά (εκτός από το διαζευκτικό «ή», και μετατρέπει τον τόνο δίφθογγου σε διαλυτικά, π.χ. `άι` → `ΑΪ`), **μόνο αν το στοιχείο έχει `lang="el"`** ([MDN: text-transform](https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform)). Συνεπώς: `<html lang="el">` και κεφαλαία μέσω CSS, όχι γραμμένα με το χέρι.

### 1.4 Fluid type

- Το `clamp()` αφήνει τα μεγέθη να κλιμακώνονται ομαλά με το πλάτος, χωρίς breakpoints. Το web.dev προειδοποιεί: «Using viewport or container-relative units on their own for `font-size` is always hostile to the user», γιατί το zoom δεν τα μεγαλώνει ([web.dev: Baseline in action, fluid type](https://web.dev/articles/baseline-in-action-fluid-type)).
- Κανόνας: όρια σε `rem`/`em`, μικρό τμήμα σε `vw`/`cqi`. Αν το μέγιστο είναι ≤ 2,5 φορές το ελάχιστο, το κείμενο περνά πάντα το WCAG 1.4.4 (200% zoom) (ίδια πηγή).
- Εργαλείο: [Utopia](https://utopia.fyi/), υπολογιστές fluid κλίμακας για type, space και grid, που βγάζουν έτοιμα custom properties για να μπουν στο `@theme` του Tailwind.
- Για την εφαρμογή: fluid μόνο στους τίτλους· το σώμα κειμένου σε πίνακες και φόρμες μένει σταθερό.

---

## 2. Κίνηση

### 2.1 View Transitions

- **Υποστήριξη (ίδιο έγγραφο):** Chrome/Edge 111+, Safari 18+, Firefox 144+, ~92% παγκοσμίως ([caniuse: view-transitions](https://caniuse.com/view-transitions)). **Μεταξύ εγγράφων (MPA):** Chrome 126+, Safari 18.2+, Firefox 144+ μερική, ~88% ([caniuse: cross-document-view-transitions](https://caniuse.com/cross-document-view-transitions)). Spec: CSS View Transitions Module Level 1 και 2 ([MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).
- **Στο Next.js 16:** λειτουργεί στο App Router «with no configuration», μέσω του `<ViewTransition>` του React (από `import { ViewTransition } from 'react'`). Οι πλοηγήσεις είναι transitions, άρα τα animations ενεργοποιούνται αυτόματα. Το `<Link transitionTypes={['nav-forward']}>` δίνει κατεύθυνση. Χωρίς υποστήριξη browser η εφαρμογή απλώς δεν κάνει animation ([Next.js: Designing view transitions](https://nextjs.org/docs/app/guides/view-transitions)).
- **Τα 4 μοτίβα του οδηγού**, που ταιριάζουν φυσικά σε εταιρεία video: shared element morph (thumbnail έργου → hero στη σελίδα έργου), Suspense reveal (skeleton → περιεχόμενο), κατευθυντική ολίσθηση, crossfade μέσα στην ίδια διαδρομή (tabs) (ίδια πηγή).
- **Απόδοση:** ο browser κρατά στιγμιότυπα (snapshots) της παλιάς και της νέας κατάστασης και κάνει animation σε αυτά, με χαμηλό κόστος. Το overlay πιάνει τα κλικ κατά τη διάρκεια του animation· ο οδηγός προτείνει `::view-transition { pointer-events: none; }` και σύντομες διάρκειες (ίδια πηγή).
- **Προσβασιμότητα:** οι ολισθήσεις είναι «the most common trigger for motion sensitivity»· τα crossfades είναι ηπιότερα. Υποχρεωτικό μπλοκ `@media (prefers-reduced-motion: reduce)` που μηδενίζει τις διάρκειες ή κρατά μόνο opacity (ίδια πηγή· [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), widely available από 2020).

### 2.2 Scroll-driven animations

- **Υποστήριξη:** Chrome/Edge 115+, Safari 26+, Firefox 160+, ~87% ([caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_scroll)). Το Safari 26.0 το πρόσθεσε μαζί με anchor positioning και `text-wrap: pretty` ([WebKit: Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Το MDN το δείχνει ακόμη **όχι Baseline** ([MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)), άρα μόνο πίσω από `@supports (animation-timeline: scroll())`.
- **Τι δίνει:** `scroll()` (πρόοδος κύλισης) και `view()` (πρόοδος ενός στοιχείου μέσα στο viewport): reveal εικόνων, parallax, progress bar, «scrubbing» ενός frame strip, όλα σε καθαρό CSS και χωρίς JS.
- **Απόδοση:** τρέχουν εκτός main thread «silky smooth… off the main thread» αν κινούνται μόνο `transform`/`opacity` (π.χ. `scaleX()` αντί για `width`) ([Chrome for Developers: Scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)). Αντικαθιστούν βιβλιοθήκες με scroll listeners.
- **Προσβασιμότητα:** το MDN επισημαίνει ότι η μεγέθυνση ή μετατόπιση μεγάλων αντικειμένων προκαλεί προβλήματα σε άτομα με αιθουσαίες διαταραχές ([MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)). Κανένα περιεχόμενο δεν πρέπει να είναι ορατό **μόνο** μετά από animation.
- **Σύσταση:** για την Ιστοσελίδα (showreel, case studies), όχι για την εφαρμογή διαχείρισης. Αναφορά: [scroll-driven-animations.style](https://scroll-driven-animations.style/) (demos και εργαλεία από τον Bramus, Chrome DevRel).

---

## 3. Διάταξη

### 3.1 Container queries

- **Size queries:** Chrome 106+, Firefox 110+, Safari 16+, ~95% ([caniuse: css-container-queries](https://caniuse.com/css-container-queries)). Ένα component (κάρτα έργου, widget dashboard) προσαρμόζεται στο **πλάτος του γονέα του**, όχι της οθόνης. Είναι ιδανικό για κοινά components ανάμεσα σε Ιστοσελίδα και εφαρμογή, που μπαίνουν σε πολύ διαφορετικά πλαίσια (πλάγια στήλη, modal, πλήρες πλάτος). Το Tailwind v4 έχει container queries ενσωματωμένα (`@container`, `@md:`).
- **Style queries:** πλήρης υποστήριξη μόνο στο Firefox 151+· στα Chrome 111+ και Safari 18+ είναι μερική (μόνο custom properties) ([caniuse: css-container-queries-style](https://caniuse.com/css-container-queries-style)). Χρήσιμα για «παραλλαγές» με βάση ένα token (π.χ. `--tone: inverse`), αλλά μόνο με custom properties.
- **Κόστος:** αμελητέο σε απόδοση και προσβασιμότητα. Μοναδική παγίδα: το `container-type: inline-size` απαιτεί ο γονέας να μην παίρνει πλάτος από τα παιδιά του.

### 3.2 Subgrid

- Chrome 117+, Firefox 71+, Safari 16+, ~93% ([caniuse: css-subgrid](https://caniuse.com/css-subgrid)). Τα παιδιά ενός grid item ευθυγραμμίζονται στις γραμμές του γονικού grid.
- Χρήση: κάρτες έργων με τίτλο, πελάτη και thumbnail ευθυγραμμισμένα μεταξύ τους, φόρμες με ευθυγραμμισμένες ετικέτες, εκδοτικό «baseline grid» στην Ιστοσελίδα.
- **Προσβασιμότητα:** θετικό, γιατί η ευθυγράμμιση γίνεται χωρίς αλλαγή σειράς στο DOM, άρα η σειρά ανάγνωσης για screen readers μένει σωστή.

---

## 4. Χρώμα και υλικότητα

### 4.1 OKLCH ως μορφή των tokens

- Το `oklch()` είναι Baseline από τον Μάιο 2023 ([MDN: oklch](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)). Είναι αντιληπτικά ομοιόμορφο: ίδιο `L` σημαίνει ίδια αντιληπτή φωτεινότητα σε κάθε απόχρωση, άρα κλίμακες και αντιθέσεις υπολογίζονται προβλέψιμα (ίδια πηγή).
- **Είναι ήδη η γλώσσα της στοίβας:** η προεπιλεγμένη παλέτα του Tailwind v4 είναι σε OKLCH (π.χ. `--color-blue-500: oklch(62.3% 0.214 259.815)`) και τα χρώματα ορίζονται/αντικαθίστανται μέσα στο `@theme` ([Tailwind: Colors](https://tailwindcss.com/docs/colors)). Τα θέματα του shadcn/ui είναι επίσης σε OKLCH (π.χ. `oklch(0.205 0 0)`) με σημασιολογικά tokens `background`, `foreground`, `primary`, εκτεθειμένα στο Tailwind μέσω `@theme inline` ([shadcn/ui: Theming](https://ui.shadcn.com/docs/theming)).
- Εργαλείο: [oklch.com](https://oklch.com/) (picker και converter από την Evil Martians), που δείχνει και τα όρια gamut sRGB/P3.

### 4.2 `color-mix()` και relative color syntax

- `color-mix()`: Baseline από τον Μάιο 2023, με προεπιλεγμένο χώρο ανάμιξης το `oklab` ([MDN: color-mix](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)). Παράγει hover/active/disabled καταστάσεις και διαφανή overlays από **ένα** token, χωρίς επιπλέον μεταβλητές.
- Relative color syntax (`oklch(from var(--brand) calc(l + 0.1) c h)`): Chrome 131+, Firefox 133+, Safari 18+, ~92% ([caniuse: css-relative-colors](https://caniuse.com/css-relative-colors)). Επιτρέπει να βγαίνει ολόκληρη κλίμακα από ένα βασικό χρώμα.
- **Μοτίβο αναφοράς:** η Linear ξανασχεδίασε το UI της ώστε κάθε θέμα να ορίζεται από **τρεις** μεταβλητές (base, accent, contrast) αντί για 98, σε αντιληπτικά ομοιόμορφο χώρο (LCH), με μεταβλητή contrast για θέματα υψηλής αντίθεσης ([Linear: How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)). Ακριβώς αυτό χρειάζεται ένα κοινό token set για Ιστοσελίδα και εφαρμογή.

### 4.3 Σκοτεινό και φωτεινό θέμα από tokens

- **`light-dark()`**: Baseline από τον Μάιο 2024· επιστρέφει τιμή ανάλογα με το ενεργό `color-scheme` χωρίς media query, αλλά απαιτεί `color-scheme: light dark` ([MDN: light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)).
- **shadcn/ui**: τα ίδια tokens ξαναορίζονται μέσα σε `.dark` ([shadcn/ui: Theming](https://ui.shadcn.com/docs/theming)). Αυτό επιτρέπει χειροκίνητη εναλλαγή από τον χρήστη (απαραίτητη για την εφαρμογή).
- **Πρόταση:** δύο επίπεδα tokens, (α) primitives σε OKLCH (κλίμακα ουδέτερων και ένα accent), (β) σημασιολογικά tokens του shadcn (`--background`, `--primary`, …) που δείχνουν στα primitives και αλλάζουν στο `.dark`. Η Ιστοσελίδα μπορεί να είναι εκ προεπιλογής σκοτεινή (ταιριάζει σε video), η εφαρμογή να ακολουθεί την προτίμηση του συστήματος, **με ίδια tokens**.
- **Προσβασιμότητα:** κάθε ζεύγος foreground/background ελέγχεται για αντίθεση WCAG στα **δύο** θέματα, ειδικά τα παράγωγα του `color-mix()`, που δεν ελέγχονται αυτόματα. Το Safari 26 πρόσθεσε `contrast-color()` ([WebKit: Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)), αλλά δεν είναι ακόμη διαθέσιμο σε όλους τους browsers και δεν πρέπει να στηριχτεί κάτι σε αυτό.

### 4.4 Υλικότητα

- **Βάθος από χρώμα, όχι από σκιές:** σε σκοτεινά θέματα οι επιφάνειες «ανεβαίνουν» με ελαφρώς υψηλότερο `L` σε OKLCH (π.χ. +0.03 ανά επίπεδο), που παράγεται με relative color syntax.
- **Ευρύ gamut (P3):** το OKLCH μπορεί να εκφράσει χρώματα έξω από το sRGB. Για accent σε οθόνες P3 να δηλώνεται fallback σε sRGB (`@media (color-gamut: p3)`). Αυτό είναι συμπέρασμα από τη φύση του OKLCH· τα όρια φαίνονται στο [oklch.com](https://oklch.com/).
- **Grain, blur, γυαλί:** το `backdrop-filter` και τα φίλτρα κοστίζουν σε GPU, ειδικά πάνω από video. Να μπαίνουν με μέτρο, σε μικρές επιφάνειες (π.χ. sticky header), και να μετριέται η απόδοση πριν υιοθετηθούν (δική μας εκτίμηση, όχι από πηγή).

---

## 5. Αναφορές για έμπνευση

1. **Linear** ([άρθρο redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)): SaaS με θέματα από 3 μεταβλητές σε αντιληπτικό χρωματικό χώρο, Inter Display για τίτλους και Inter για σώμα. Πρότυπο για την **εφαρμογή**· η Inter έχει ελληνικά και άξονα `opsz` στο Google Fonts.
2. **Next.js «Frames» demo** ([demo](https://react-view-transitions-demo.labs.vercel.dev), [οδηγός](https://nextjs.org/docs/app/guides/view-transitions)): gallery φωτογραφιών με morph thumbnail → hero και κατευθυντικές μεταβάσεις. Σχεδόν αυτούσιο μοτίβο για το **portfolio έργων** της Ιστοσελίδας, στην ίδια στοίβα.
3. **scroll-driven-animations.style** ([site](https://scroll-driven-animations.style/)): συλλογή demos και debugger για scroll-driven animations, για reveal και scrubbing στο showreel.
4. **Utopia** ([site](https://utopia.fyi/)): εργαλείο για fluid κλίμακες type και space που γίνονται κατευθείαν tokens.
5. **oklch.com** ([site](https://oklch.com/)): εργαλείο για τη σύνθεση της OKLCH παλέτας και τον έλεγχο gamut.

---

## 6. Συμπέρασμα για την Οπτική κατεύθυνση

- **Ασφαλής βάση για όλα (Ιστοσελίδα και εφαρμογή):** OKLCH tokens σε Tailwind v4 `@theme`, σημασιολογικά tokens του shadcn με `.dark`, `color-mix()` για καταστάσεις, container queries και subgrid για components, ένα variable font με `greek` subset μέσω `next/font`, `lang="el"`.
- **Ως progressive enhancement:** View Transitions με React `<ViewTransition>` (πλοήγηση έργων, Suspense reveals), scroll-driven animations μόνο στην Ιστοσελίδα, πίσω από `@supports`.
- **Υποχρεωτικοί κανόνες:** `prefers-reduced-motion` σε κάθε κίνηση· fluid type με όρια σε rem και λόγο μέγιστου/ελάχιστου ≤ 2,5· έλεγχος αντίθεσης και στα δύο θέματα· καμία πληροφορία ορατή μόνο μέσω animation.
- **Να αποφευχθεί:** δημοφιλείς γραμματοσειρές χωρίς ελληνικά (Geist, Instrument, Mona Sans, Fraunces κ.ά.)· style queries πέρα από custom properties· `contrast-color()` προς το παρόν.

## Ανοιχτά ερωτήματα

- Ποια γραμματοσειρά τίτλων δίνει την προσωπικότητα της εταιρείας; Υποψήφιες: Roboto Flex, Commissioner, Geologica, ή μια serif όπως η Literata. Θέλει δοκιμή με πραγματικά ελληνικά κείμενα (τόνοι, διαλυτικά, κεφαλαία).
- Σκοτεινό εκ προεπιλογής για την Ιστοσελίδα, ή προτίμηση συστήματος και στις δύο;
- Πόση κίνηση αντέχει η εφαρμογή διαχείρισης; Πρόταση: μόνο crossfades και Suspense reveals.
