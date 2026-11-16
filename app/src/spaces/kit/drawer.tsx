"use client";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Πλαϊνό συρτάρι (Radix Dialog): η φόρμα μιας ενέργειας ανοίγει εδώ, όχι μέσα στη σελίδα.
// Το portal μπαίνει μέσα στο [data-look='spaces'] ώστε να παίρνει τα tokens του brand.
interface DrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function useSpacesRoot() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRoot(
      anchorRef.current?.closest<HTMLElement>("[data-look='spaces']") ?? null,
    );
  }, []);
  return { anchorRef, root };
}

export function Drawer({ isOpen, title, onClose, children }: DrawerProps) {
  const { anchorRef, root } = useSpacesRoot();
  return (
    <>
      <span ref={anchorRef} hidden />
      <Dialog.Root
        open={isOpen && root !== null}
        onOpenChange={(open) => !open && onClose()}
      >
        <Dialog.Portal container={root}>
          <Dialog.Overlay className="drawer-veil" />
          <Dialog.Content className="drawer" aria-describedby={undefined}>
            <header className="drawer-head">
              <Dialog.Title className="drawer-title">{title}</Dialog.Title>
              <Dialog.Close className="drawer-close" aria-label="Κλείσιμο">
                <span aria-hidden="true">×</span>
              </Dialog.Close>
            </header>
            <div className="drawer-body">{children}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
