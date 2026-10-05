"use client";

import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";

import { ClientA, HomeA } from "@/directions/direction-a";
import { ClientB, HomeB } from "@/directions/direction-b";
import { ClientC, HomeC } from "@/directions/direction-c";
import { DirectionSwitcher } from "@/directions/direction-switcher";
import {
  findDirection,
  type DirectionKey,
  type DirectionScreen,
} from "@/directions/directions";
import { DIRECTION_FONT_CLASSES } from "@/directions/fonts";

import "@/directions/directions.css";

const VARIANTS: Record<DirectionKey, Record<DirectionScreen, ComponentType>> = {
  a: { R1: HomeA, B2: ClientA },
  b: { R1: HomeB, B2: ClientB },
  c: { R1: HomeC, B2: ClientC },
};

interface DirectionPreviewProps {
  code: DirectionScreen;
}

export function DirectionPreview({ code }: DirectionPreviewProps) {
  const direction = findDirection(useSearchParams().get("variant"));
  const Screen = VARIANTS[direction.key][code];

  return (
    <>
      <div
        className={`direction ${DIRECTION_FONT_CLASSES}`}
        data-direction={direction.key}
      >
        <Screen />
      </div>
      <DirectionSwitcher current={direction} />
    </>
  );
}
