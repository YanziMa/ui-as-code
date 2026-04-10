"use client";

import { useEffect, useRef } from "react";

/**
 * Hook: Detect clicks outside of a given element.
 * Returns a ref to attach to the element, and the current state.
 */
export function useClickOutside(initialState = false) {
  const [isOutside, setIsOutside] = useState(initialState);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOutside(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return { ref, isOutside, setIsOutside };
}

// Need useState for the hook above
import { useState } from "react";
