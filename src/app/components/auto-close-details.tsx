"use client";

import { type DetailsHTMLAttributes, type ReactNode, useEffect, useRef } from "react";

type AutoCloseDetailsProps = DetailsHTMLAttributes<HTMLDetailsElement> & {
  children: ReactNode;
};

export function AutoCloseDetails({ children, ...props }: AutoCloseDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handleOutsideInteraction(event: Event) {
      const details = detailsRef.current;
      const target = event.target;

      if (!details?.open || !(target instanceof Node) || details.contains(target)) {
        return;
      }

      details.open = false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handleOutsideInteraction, true);
    document.addEventListener("mousedown", handleOutsideInteraction, true);
    document.addEventListener("touchstart", handleOutsideInteraction, { capture: true, passive: true });
    document.addEventListener("click", handleOutsideInteraction, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction, true);
      document.removeEventListener("mousedown", handleOutsideInteraction, true);
      document.removeEventListener("touchstart", handleOutsideInteraction, true);
      document.removeEventListener("click", handleOutsideInteraction, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <details ref={detailsRef} {...props}>
      {children}
    </details>
  );
}
