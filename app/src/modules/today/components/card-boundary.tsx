"use client";

import { Component, type ReactNode } from "react";

import type { TodayCard } from "../view-schema";
import { CardRetry } from "./card-retry";

interface CardBoundaryProps {
  card: TodayCard;
  children: ReactNode;
}

// Αν μια κάρτα σκάσει, πέφτει μόνο αυτή· τα error boundaries του React γράφονται ακόμα μόνο ως class.
export class CardBoundary extends Component<CardBoundaryProps, { hasFailed: boolean }> {
  state = { hasFailed: false };

  static getDerivedStateFromError() {
    return { hasFailed: true };
  }

  render() {
    return this.state.hasFailed ? <CardRetry card={this.props.card} /> : this.props.children;
  }
}
