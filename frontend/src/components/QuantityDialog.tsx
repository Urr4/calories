import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import type { Food, MealSlot } from '../types';
import { MEAL_SLOT_LABELS } from '../types';

interface Props {
  open: boolean;
  food: Food | null;
  mealSlot: MealSlot | null;
  onClose: () => void;
  onConfirm: (quantityG: number) => void;
}

export default function QuantityDialog({ open, food, mealSlot, onClose, onConfirm }: Props) {
  const [quantity, setQuantity] = useState('100');

  if (!food || !mealSlot) return null;

  const qty = Number(quantity);
  const valid = Number.isFinite(qty) && qty > 0;
  const calories = valid ? Math.round((food.calories_per_100g * qty) / 100) : 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {food.name} – {MEAL_SLOT_LABELS[mealSlot]}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Menge (g)"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ≈ {calories} kcal
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          variant="contained"
          disabled={!valid}
          onClick={() => {
            onConfirm(qty);
            setQuantity('100');
          }}
        >
          Eintragen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
