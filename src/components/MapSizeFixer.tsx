"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet measures its container once; a map that mounts inside a tab, an accordion or a page that is still laying
 * out ends up grey with only part of its tiles. This keeps it measured: on mount, whenever the container resizes,
 * and when it scrolls into view.
 */
export default function MapSizeFixer() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const fix = () => map.invalidateSize({ pan: false });
    const t = window.setTimeout(fix, 150);
    const ro = new ResizeObserver(fix);
    ro.observe(el);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && fix());
    io.observe(el);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      io.disconnect();
    };
  }, [map]);
  return null;
}
