"use client";

import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";

import { ClientA } from "@/directions/direction-a";
import { ClientB } from "@/directions/direction-b";
import { DirectionSwitcher } from "@/directions/direction-switcher";
import {
  DIRECTIONS,
  findDirection,
  type DirectionKey,
  type DirectionScreen,
} from "@/directions/directions";
import { DIRECTION_FONT_CLASSES } from "@/directions/fonts";
import { Home01 } from "@/directions/home/home-01";
import { Home02 } from "@/directions/home/home-02";
import { Home03 } from "@/directions/home/home-03";
import { Home04 } from "@/directions/home/home-04";
import { Home05 } from "@/directions/home/home-05";
import { Home06 } from "@/directions/home/home-06";
import { Home07 } from "@/directions/home/home-07";
import { Home08 } from "@/directions/home/home-08";
import { Home09 } from "@/directions/home/home-09";
import { Home10 } from "@/directions/home/home-10";
import { HOME_DIRECTIONS, findHomeDirection } from "@/directions/home/homes";

import "@/directions/directions.css";

const HOMES: Record<string, ComponentType> = {
  "1": Home01,
  "2": Home02,
  "3": Home03,
  "4": Home04,
  "5": Home05,
  "6": Home06,
  "7": Home07,
  "8": Home08,
  "9": Home09,
  "10": Home10,
};

const CLIENTS: Record<DirectionKey, ComponentType> = { a: ClientA, b: ClientB };

interface DirectionPreviewProps {
  code: DirectionScreen;
}

interface HomePreviewProps {
  isShowcase?: boolean;
}

// isShowcase: η δημόσια βιτρίνα /directions, πάντα σε πλήρη οθόνη, χωρίς το πλαίσιο του prototype.
export function HomePreview({ isShowcase = false }: HomePreviewProps) {
  const params = useSearchParams();
  const direction = findHomeDirection(params.get("variant"));
  const Home = HOMES[direction.key];

  return (
    <>
      <div
        className={`direction ${DIRECTION_FONT_CLASSES}`}
        data-home={direction.key}
        data-full={isShowcase || params.get("full") === "1" || undefined}
      >
        <Home key={direction.key} />
      </div>
      <DirectionSwitcher
        options={HOME_DIRECTIONS}
        current={direction}
        canGoFull={!isShowcase}
      />
    </>
  );
}

function ClientPreview() {
  const direction = findDirection(useSearchParams().get("variant"));
  const Client = CLIENTS[direction.key];

  return (
    <>
      <div
        className={`direction ${DIRECTION_FONT_CLASSES}`}
        data-direction={direction.key}
      >
        <Client />
      </div>
      <DirectionSwitcher options={DIRECTIONS} current={direction} />
    </>
  );
}

export function DirectionPreview({ code }: DirectionPreviewProps) {
  return code === "R1" ? <HomePreview /> : <ClientPreview />;
}
