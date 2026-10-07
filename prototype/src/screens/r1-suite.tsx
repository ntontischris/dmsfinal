"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Lang } from "@/data/website";
import { Inspector } from "@/kit/inspector";
import { timecode, type Clip } from "@/screens/r1-clip";
import { FootageScene } from "@/screens/r1-footage";
import { Timeline } from "@/screens/r1-timeline";

// R1: η αίθουσα μοντάζ. Το playhead παίζει μόνο του (όχι με prefers-reduced-motion)·
// κλικ σε κλιπ αλλάζει το πλάνο στο monitor. Χωρίς Δουλειές: monitor και transport μόνο.

interface SuiteProps {
  lang: Lang;
  eyebrow: string;
  title: string;
  text: string;
  clips: readonly Clip[];
  quoteHref: string;
  worksHref: string;
}

const LOOP_MS = 45000;
const clipAt = (clips: readonly Clip[], pos: number) =>
  clips.reduce((found, clip, i) => (pos * 100 >= clip.start ? i : found), 0);

export function Suite(props: SuiteProps) {
  const { lang, eyebrow, title, text, clips, quoteHref, worksHref } = props;
  const t = (el: string, en: string) => (lang === "en" ? en : el);
  const tracksRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef(0);
  const [active, setActive] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasClips = clips.length > 0;

  const apply = useCallback(
    (pos: number) => {
      posRef.current = pos;
      tracksRef.current?.style.setProperty("--pos", String(pos));
      if (tcRef.current) tcRef.current.textContent = timecode(pos);
      setActive(clipAt(clips, pos));
    },
    [clips],
  );

  useEffect(() => {
    const isCalm = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (hasClips && !isCalm) setIsPlaying(true);
  }, [hasClips]);

  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      apply((posRef.current + (now - last) / LOOP_MS) % 1);
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, apply]);

  const jumpTo = (index: number) => {
    setIsPlaying(false);
    apply((clips[index].start + 0.5) / 100);
  };
  const clip = hasClips ? clips[active] : undefined;

  return (
    <section className="r1-suite" aria-label="Showreel" data-clips={hasClips}>
      <div className="r1-panel r1-program">
        <p className="r1-panel-head kit-label">
          <span>Program · Delta_Films_Showreel</span>
          {hasClips && (
            <span className="r1-tally" data-on={isPlaying}>
              {isPlaying
                ? t("● Αναπαραγωγή", "● Playing")
                : t("❚❚ Παύση", "❚❚ Paused")}
            </span>
          )}
        </p>
        <div className="r1-monitor">
          {hasClips ? (
            clips.map((item, i) => (
              <div key={item.id} className="r1-shot" data-active={i === active}>
                <FootageScene kind={item.scene} hue={item.hue} />
              </div>
            ))
          ) : (
            <div className="r1-shot" data-active="true">
              <FootageScene kind="stage" hue={20} />
            </div>
          )}
          <div className="r1-safe" aria-hidden />
          {clip && <span className="r1-osd r1-osd-l">{clip.code}</span>}
          <span className="r1-osd r1-osd-r">4K · 25p · Rec.709</span>
          <div className="r1-title">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          {clip && <p className="r1-caption">{clip.title}</p>}
        </div>
        <div className="r1-transport">
          <span ref={tcRef} className="r1-tc">
            00:00:00:00
          </span>
          {hasClips && (
            <div className="r1-buttons">
              <button
                type="button"
                aria-label={t("Αρχή", "Start")}
                onClick={() => jumpTo(0)}
              >
                ⏮
              </button>
              <button
                type="button"
                aria-label={
                  isPlaying ? t("Παύση", "Pause") : t("Αναπαραγωγή", "Play")
                }
                onClick={() => setIsPlaying((on) => !on)}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                aria-label={t("Επόμενο κλιπ", "Next clip")}
                onClick={() => jumpTo((active + 1) % clips.length)}
              >
                ⏭
              </button>
            </div>
          )}
          <div className="r1-actions">
            <Link className="site-button" data-quiet="true" href={worksHref}>
              {t("Δείτε δουλειές", "See our work")}
            </Link>
            <Link className="site-button" href={quoteHref}>
              {t("Ζητήστε προσφορά", "Request a quote")}
            </Link>
          </div>
        </div>
        <p className="r1-lede">{text}</p>
      </div>

      {clip && (
        <Inspector
          code={clip.code}
          title={clip.title}
          fields={[
            { label: t("Είδος", "Kind"), value: clip.kind },
            { label: t("Βίντεο", "Video"), value: clip.host },
            {
              label: "In",
              value: (
                <span className="r1-tcv">{timecode(clip.start / 100)}</span>
              ),
            },
            {
              label: "Out",
              value: (
                <span className="r1-tcv">
                  {timecode((clip.start + clip.length) / 100)}
                </span>
              ),
            },
          ]}
        >
          <p className="r1-summary">{clip.summary}</p>
          <Link href={clip.href}>{clip.linkLabel}</Link>
        </Inspector>
      )}

      {hasClips && (
        <Timeline
          clips={clips}
          active={active}
          tracksRef={tracksRef}
          head={t(
            "Timeline · Επιλεγμένες δουλειές",
            "Timeline · Selected work",
          )}
          hint={t("Πατήστε ένα κλιπ ή ▶", "Pick a clip or ▶")}
          titleLabels={[
            t("Τίτλος", "Title"),
            "Lower third",
            t("Λογότυπο", "Logo"),
          ]}
          musicLabel={t("Μουσική", "Music")}
          onPick={jumpTo}
        />
      )}
    </section>
  );
}
