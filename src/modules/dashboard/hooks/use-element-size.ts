import { useState, useEffect, useRef, MutableRefObject } from "react";

interface Size {
  width: number;
  height: number;
}

export const useElementSize = <T extends HTMLElement>(): [
  MutableRefObject<T | null>,
  Size
] => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
};

