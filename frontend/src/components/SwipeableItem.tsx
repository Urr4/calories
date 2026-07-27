import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { MealSlot } from '../types';
import { MEAL_SLOT_LABELS } from '../types';

interface Props {
  children: React.ReactNode;
  onSwipe: (slot: MealSlot) => void;
}

const THRESHOLD = 56;

// Detects a swipe gesture on a list item and maps its direction to a meal
// slot: left = breakfast, up = lunch, right = dinner, down = snack.
export default function SwipeableItem({ children, onSwipe }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [hintSlot, setHintSlot] = useState<MealSlot | null>(null);

  const directionToSlot = (dx: number, dy: number): MealSlot | null => {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return null;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? 'breakfast' : 'dinner';
    }
    return dy < 0 ? 'lunch' : 'snack';
  };

  const handleStart = (x: number, y: number) => {
    start.current = { x, y };
  };

  const handleMove = (x: number, y: number) => {
    if (!start.current) return;
    const dx = x - start.current.x;
    const dy = y - start.current.y;
    setDrag({ x: dx, y: dy });
    setHintSlot(directionToSlot(dx, dy));
  };

  const handleEnd = () => {
    if (!start.current) return;
    const slot = directionToSlot(drag.x, drag.y);
    start.current = null;
    setDrag({ x: 0, y: 0 });
    setHintSlot(null);
    if (slot) onSwipe(slot);
  };

  return (
    <Box
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        handleStart(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 0 && e.pointerType !== 'touch') return;
        handleMove(e.clientX, e.clientY);
      }}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      sx={{
        position: 'relative',
        touchAction: 'none',
        transform: `translate(${drag.x * 0.3}px, ${drag.y * 0.3}px)`,
        transition: start.current ? 'none' : 'transform 0.15s ease',
        userSelect: 'none',
      }}
    >
      {children}
      {hintSlot && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            opacity: 0.85,
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="button" color="white">
            {MEAL_SLOT_LABELS[hintSlot]}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
