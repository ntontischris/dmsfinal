"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  isReadyMessage,
  listenMessages,
  seekMessages,
  timeFromMessage,
  tracksTime,
  videoEmbedOf,
  type VideoProvider,
} from "@/lib/video-embed";

// Χειριστήριο του player για όποιον τον χρησιμοποιεί (π.χ. οι σημειώσεις): «τι ώρα είναι» και «πήγαινε στο …».
// Ένα σταθερό αντικείμενο ανά οθόνη· ο player το «συνδέει» όταν φορτώσει.
export interface VideoControl {
  currentTime: () => number | null;
  seek: (seconds: number) => void;
  canTrackTime: () => boolean;
  attach: (handlers: ControlHandlers) => () => void;
}

interface ControlHandlers {
  currentTime: () => number | null;
  seek: (seconds: number) => void;
  canTrackTime: boolean;
}

export const createVideoControl = (): VideoControl => {
  let handlers: ControlHandlers | null = null;
  return {
    currentTime: () => handlers?.currentTime() ?? null,
    seek: (seconds) => handlers?.seek(seconds),
    canTrackTime: () => handlers?.canTrackTime ?? false,
    attach: (next) => {
      handlers = next;
      return () => {
        if (handlers === next) handlers = null;
      };
    },
  };
};

export const useVideoControl = (): VideoControl => {
  const [control] = useState(createVideoControl);
  return control;
};

interface VideoPlayerProps {
  link: string;
  title: string;
  control?: VideoControl;
  isVertical?: boolean;
  onPlay?: () => void;
}

interface PlayState {
  isPlaying: boolean;
  startAt: number;
}

const post = (frame: HTMLIFrameElement | null, messages: string[]) =>
  messages.forEach((message) =>
    frame?.contentWindow?.postMessage(message, "*"),
  );

// Ακούει τον player: κρατά τον τελευταίο χρόνο που είπε.
function useTimeChannel(
  provider: VideoProvider,
  frameRef: RefObject<HTMLIFrameElement | null>,
  isPlaying: boolean,
) {
  const timeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying || !tracksTime(provider)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (isReadyMessage(provider, event.data))
        post(frameRef.current, listenMessages(provider));
      const time = timeFromMessage(provider, event.data);
      if (time !== null) timeRef.current = time;
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [provider, frameRef, isPlaying]);
  return timeRef;
}

// Ο player φορτώνει μόλις πατήσεις «Παίξε»: λιγότερα δεδομένα στο κινητό.
// Αν κάποιος ζητήσει «πήγαινε στο …» πριν φορτώσει, φορτώνει κατευθείαν από εκείνο το σημείο.
export function VideoPlayer({
  link,
  title,
  control,
  isVertical = false,
  onPlay,
}: VideoPlayerProps) {
  const [play, setPlay] = useState<PlayState>({ isPlaying: false, startAt: 0 });
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [origin] = useState(() =>
    typeof window === "undefined" ? undefined : window.location.origin,
  );
  const preview = videoEmbedOf(link);
  const provider = preview?.provider ?? "drive";
  const timeRef = useTimeChannel(provider, frameRef, play.isPlaying);

  useEffect(() => {
    if (play.isPlaying) onPlay?.();
  }, [play.isPlaying, onPlay]);

  useEffect(() => {
    if (!control) return;
    return control.attach({
      canTrackTime: tracksTime(provider),
      currentTime: () => timeRef.current,
      seek: (seconds) => {
        // Το Drive δεν δέχεται «πήγαινε στο …»: απλώς ξεκινά το βίντεο.
        if (provider === "drive") {
          if (!play.isPlaying) setPlay({ isPlaying: true, startAt: 0 });
          return;
        }
        if (!play.isPlaying) {
          setPlay({ isPlaying: true, startAt: seconds });
          return;
        }
        timeRef.current = seconds;
        post(frameRef.current, seekMessages(provider, seconds));
      },
    });
  }, [control, provider, play.isPlaying, timeRef]);

  if (!preview) return null;
  const embed = videoEmbedOf(link, {
    origin,
    autoplay: true,
    startAt: play.startAt,
  });
  const screenProps = {
    className: "kit-video",
    "data-vertical": isVertical ? "true" : undefined,
  };
  if (play.isPlaying && embed)
    return (
      <div {...screenProps}>
        <iframe
          key={embed.src}
          ref={frameRef}
          src={embed.src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => post(frameRef.current, listenMessages(provider))}
        />
      </div>
    );
  return (
    <button
      type="button"
      {...screenProps}
      data-poster="true"
      onClick={() => setPlay({ isPlaying: true, startAt: 0 })}
      aria-label={`Παίξε το βίντεο: ${title}`}
    >
      <span className="kit-video-play" aria-hidden="true">
        ▶
      </span>
      <span>Παίξε το βίντεο</span>
    </button>
  );
}
