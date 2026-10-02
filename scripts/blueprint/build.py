"""Builds one client-facing HTML page from docs/blueprint/*.md.

Open-question sections and sources are left out of the page.
Run: python scripts/blueprint/build.py  (needs `pip install markdown`)
"""

from __future__ import annotations

import html
import re
from pathlib import Path

import markdown

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] / "docs" / "blueprint"
OUT = HERE / "dist" / "dms-blueprint.html"
TEMPLATE = HERE / "template.html"

PARTS = [
    (
        "Α",
        "Άνθρωποι και σύστημα",
        "Ποιος μπαίνει, τι βλέπει και από ποιες περιοχές αποτελείται το σύστημα.",
        [
            "01-roles-and-permissions.md",
            "02-capability-map.md",
        ],
    ),
    (
        "Β",
        "Η δουλειά, βήμα βήμα",
        "Η διαδρομή κάθε πελάτη, από το πρώτο ενδιαφέρον ως την πληρωμή.",
        [
            "03-processes/01-backbone.md",
            "03-processes/02-sales.md",
            "03-processes/03-catalogue-agreement-cost.md",
            "03-processes/04-filming-and-calendar.md",
            "03-processes/05-deliverables.md",
            "03-processes/06-messages-and-requests.md",
            "03-processes/07-invoicing-and-payments.md",
            "03-processes/08-knowledge-and-assistant.md",
        ],
    ),
    (
        "Γ",
        "Πώς λειτουργεί",
        "Ειδοποιήσεις, ρυθμίσεις, συνδέσεις με άλλα εργαλεία και η Ιστοσελίδα.",
        [
            "04-notifications-and-automations.md",
            "05-settings-and-dynamic-configuration.md",
            "06-integrations.md",
            "09-website.md",
        ],
    ),
    (
        "Δ",
        "Στην πράξη",
        "Η μέρα κάθε ρόλου, οι οθόνες του, και πώς περνάμε στο νέο σύστημα.",
        [
            "08-role-guides.md",
            "07-foundation-and-cutover.md",
        ],
    ),
]

EMOJI = re.compile(
    r"[\u2190-\u21FF\u2300-\u23FF\u2600-\u27BF\U0001F300-\U0001FAFF\uFE0F]+\s*"
)
SOURCES = re.compile(r"<details[^>]*>\s*<summary>\s*Πηγές.*?</details>", re.S)
OPEN_Q = re.compile(
    r"^##\s+\S*\s*Ανοιχτά ερωτήματα.*?(?=^##\s|^<details|\Z)", re.S | re.M
)
MERMAID = re.compile(r'<pre><code class="language-mermaid">(.*?)</code></pre>', re.S)
MD_LINK = re.compile(
    r'href="(?:\.\./|\./)*(?:03-processes/)?([0-9][0-9a-z-]*)\.md(#[^"]*)?"'
)
OTHER_REL = re.compile(r'<a href="(?!https?:|#)[^"]*">(.*?)</a>', re.S)
H2_SPLIT = re.compile(r"(?=<h2>)")

KINDS = {
    "Σενάρια": "scenes",
    "Βήματα": "steps",
    "Φάσεις": "steps",
    "Εξαιρέσεις": "exceptions",
    "Ειδοποιήσεις": "notify",
    "Τι βλέπει ο πελάτης": "client",
    "Τι ρυθμίζει ο admin": "admin",
}


def slug(file: str) -> str:
    return "ch-" + Path(file).stem


def kind_of(heading: str) -> str:
    return next((k for key, k in KINDS.items() if heading.startswith(key)), "")


def scenes(section: str) -> str:
    """Turns each <h3> story in the Scenarios section into a numbered scene card."""
    head, *stories = re.split(r"(?=<h3>)", section)
    cards = [
        f'<article class="scene"><span class="take">ΣΚΗΝΗ {i:02d}</span>{s}</article>'
        for i, s in enumerate(stories, 1)
    ]
    return head + (f'<div class="scenes">{"".join(cards)}</div>' if cards else "")


def wrap_sections(body: str) -> str:
    chunks = H2_SPLIT.split(body)
    out = [chunks[0]]
    for chunk in chunks[1:]:
        heading = re.match(r"<h2>(.*?)</h2>", chunk, re.S).group(1)
        kind = kind_of(heading)
        if kind == "scenes":
            chunk = scenes(chunk)
        out.append(f'<div class="sec {kind}">{chunk}</div>')
    return "".join(out)


def to_html(text: str) -> str:
    text = OPEN_Q.sub("", text)
    text = SOURCES.sub("", text)
    text = text.replace("<details>", '<details markdown="1">')
    body = markdown.markdown(
        text, extensions=["tables", "fenced_code", "md_in_html", "sane_lists"]
    )
    body = SOURCES.sub("", body)
    body = MERMAID.sub(lambda m: f'<pre class="mermaid">{m.group(1)}</pre>', body)
    body = re.sub(r"(<h[1-4][^>]*>)\s*" + EMOJI.pattern, r"\1", body)
    body = re.sub(r"(<(?:strong|summary)>)\s*" + EMOJI.pattern, r"\1", body)
    body = re.sub(
        r"<summary>Κανόνες που θα ελέγχονται</summary>",
        "<summary>Οι κανόνες που θα τηρεί το σύστημα</summary>",
        body,
    )
    body = MD_LINK.sub(lambda m: f'href="#ch-{m.group(1)}"', body)
    body = OTHER_REL.sub(r"\1", body)
    body = body.replace("<table>", '<div class="tbl"><table>').replace(
        "</table>", "</table></div>"
    )
    return wrap_sections(body)


def glance(body: str) -> str:
    match = re.search(r"<blockquote>(.*?)</blockquote>", body, re.S)
    if not match:
        return ""
    text = re.sub(r"<strong>\s*Με μια ματιά\s*</strong>", "", match.group(1))
    text = " ".join(re.sub(r"<[^>]+>", "", text).split())
    end = re.search(r"[.;!](?=\s+[Α-ΩΆ-ΏA-Z]|$)", text[25:])
    return text[: 25 + end.end()] if end else text


def chapter(num: str, file: str) -> dict[str, str]:
    raw = (ROOT / file).read_text(encoding="utf-8")
    title = EMOJI.sub("", re.search(r"^#\s+(.+)$", raw, re.M).group(1)).strip()
    body = to_html(re.sub(r"^#\s+.+$", "", raw, count=1, flags=re.M))
    sid = slug(file)
    return {
        "section": (
            f'<section class="chapter" id="{sid}"><header class="ch-head">'
            f'<span class="ch-num">{num}</span><h1>{html.escape(title)}</h1></header>{body}</section>'
        ),
        "nav": f'<li><a href="#{sid}"><span>{num}</span>{html.escape(title)}</a></li>',
        "card": (
            f'<li><a href="#{sid}"><span class="cn">{num}</span>'
            f"<b>{html.escape(title)}</b><em>{html.escape(glance(body))}</em></a></li>"
        ),
    }


def build_part(letter: str, name: str, blurb: str, files: list[str]) -> dict[str, str]:
    chs = [chapter(f"{letter}{i}", f) for i, f in enumerate(files, 1)]
    pid = f"part-{letter}"
    opener = (
        f'<div class="part" id="{pid}"><span class="part-letter">{letter}</span>'
        f'<div><span class="part-label">ΜΕΡΟΣ {letter}</span><h2>{name}</h2><p>{blurb}</p></div></div>'
    )
    return {
        "body": opener + "".join(c["section"] for c in chs),
        "nav": f'<li class="np"><a href="#{pid}">Μέρος {letter} · {name}</a></li>'
        + "".join(c["nav"] for c in chs),
        "overview": (
            f'<div class="ov-part"><h3><span>Μέρος {letter}</span>{name}</h3>'
            f'<ol class="ov-cards">{"".join(c["card"] for c in chs)}</ol></div>'
        ),
    }


def main() -> None:
    parts = [build_part(*p) for p in PARTS]
    page = TEMPLATE.read_text(encoding="utf-8")
    for key in ("nav", "overview", "body"):
        page = page.replace("{{" + key.upper() + "}}", "\n".join(p[key] for p in parts))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    count = sum(len(p[3]) for p in PARTS)
    print(f"{count} chapters -> {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
