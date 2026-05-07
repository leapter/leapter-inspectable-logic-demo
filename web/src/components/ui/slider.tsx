"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
}: SliderProps) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
  const percent = Math.max(0, Math.min(100, ((currentValue - min) / (max - min)) * 100));
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function valueFromPointer(clientX: number) {
    const track = trackRef.current;
    if (!track) return currentValue;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onValueChange?.([valueFromPointer(e.clientX)]);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    onValueChange?.([valueFromPointer(e.clientX)]);
  }

  function handlePointerUp() {
    setDragging(false);
  }

  return (
    <div
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none py-2 cursor-pointer",
        className
      )}
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted"
      >
        <div
          data-slot="slider-range"
          className="absolute h-full rounded-full bg-primary transition-[width] duration-75"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div
        data-slot="slider-thumb"
        className={cn(
          "absolute block size-4 rounded-full border-2 border-primary bg-white shadow-sm transition-shadow select-none",
          "hover:ring-4 hover:ring-primary/20",
          dragging && "ring-4 ring-primary/20 scale-110",
        )}
        style={{ left: `calc(${percent}% - 8px)` }}
      />
    </div>
  );
}

export { Slider };
export type { SliderProps };
