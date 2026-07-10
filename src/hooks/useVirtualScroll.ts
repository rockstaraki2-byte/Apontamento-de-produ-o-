import { useState, useEffect, RefObject } from "react";

interface UseVirtualScrollProps {
  itemCount: number;
  itemHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  buffer?: number;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerRef,
  buffer = 5,
}: UseVirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(el.clientHeight);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    // Initial values
    setScrollTop(el.scrollTop);
    setContainerHeight(el.clientHeight);

    // Watch for dynamic resizing of container
    const resizeObserver = new ResizeObserver(() => {
      setContainerHeight(el.clientHeight);
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const getIndices = (offsetTop: number) => {
    // Calculate scroll position relative to our list start position
    const relativeScrollTop = Math.max(0, scrollTop - offsetTop);
    
    const startIndex = Math.max(
      0,
      Math.floor(relativeScrollTop / itemHeight) - buffer
    );
    const endIndex = Math.min(
      itemCount,
      Math.ceil((relativeScrollTop + containerHeight) / itemHeight) + buffer
    );

    return { startIndex, endIndex };
  };

  return {
    scrollTop,
    containerHeight,
    getIndices,
  };
}
