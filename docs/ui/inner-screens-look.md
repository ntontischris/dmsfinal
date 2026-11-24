# Inner screens look

How a screen inside a Space (lists, records, settings, forms) is built. The classes live in
`app/src/modules/finance/spaces/money-lines.css`. A module imports that file itself, because it is not global.
Colours come only from tokens, and red is kept for the main CTA, the status dot and the rec indicator.

## Building blocks

| Class | Use it for | Example |
|---|---|---|
| `.ml-head`, `.ml-cta` | screen intro + the one main action | `<header class="ml-head">…<a class="ml-cta">` |
| `.ml-list` / `.ml-line` | a list of records as rows | `<ul class="ml-list"><li class="ml-line">…` |
| `.ml-hero` | the top card of a record page | `<header class="ml-hero"><div><h1 data-page-title>…` |
| `.ml-box`, `.ml-stack` | a closed box of related content | `<section class="ml-box">…` |
| `.ml-meter` | a thin progress bar with a label and a number; width comes from `--v`, `data-tone="warn"` makes it yellow | `<div class="ml-meter" style="--v:62%"><span>Πληρώθηκε</span><i><b></b></i><strong>62%</strong></div>` |
| `.ml-avatars` | a stack of overlapping initials | `<span class="ml-avatars"><span>ΜΚ</span><span>ΓΠ</span></span>` |
| `.ml-empty` | an empty state, one sentence | `<p class="ml-empty">Δεν υπάρχουν εισπράξεις ακόμα.</p>` |
| `.ml-fields` / `.ml-field` | a form grid with 2 columns (1 on mobile); add `data-wide` for a full-width field; `small` is a hint | `<div class="ml-fields"><label class="ml-field"><span>Όνομα</span><input></label></div>` |
| `.ml-actions` | the form's last row, with exactly one `[data-primary]` | `<div class="ml-actions"><button>Άκυρο</button><button data-primary>Αποθήκευση</button></div>` |
| `.ml-kv` | label: value pairs (replaces `.dl`) | `<dl class="ml-kv"><dt>ΑΦΜ</dt><dd>…</dd></dl>` |

Native `select`, `input[type=file]` and date/time inputs inside `.input` or `.ml-fields` already match text
inputs in both themes. Don't restyle them per screen.

## One h1 per page

- **List screens** (a deck card or a «more» item): the shell writes the h1 with the section's name. The screen writes no h1.
- **Detail screens** (routes in `DETAIL_SCREENS`): the shell writes only the «section / title» eyebrow. The screen writes its own `<h1>`.
- **Record pages under a list route** (e.g. `/app/team/[userId]`, `/app/knowledge/[id]`): the screen writes
  `<h1 data-page-title>{record name}</h1>`. The shell's h1 is then hidden and a «section /» back link takes its place.
