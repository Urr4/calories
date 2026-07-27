import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import type { BarcodeLookupResult, Food } from '../types';
import { foodsApi } from '../api/client';

interface Props {
  open: boolean;
  barcode: string | null;
  prefill: BarcodeLookupResult | null;
  onClose: () => void;
  onCreated: (food: Food) => void;
}

// Form to create a new food, pre-filled from an Open Food Facts / stub lookup
// but fully editable (also usable when no barcode match was found).
export default function NewFoodDialog({ open, barcode, prefill, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fiber, setFiber] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(prefill?.name ?? '');
    setCalories(String(prefill?.caloriesPer100g ?? 0));
    setProtein(String(prefill?.proteinPer100g ?? 0));
    setFat(String(prefill?.fatPer100g ?? 0));
    setCarbs(String(prefill?.carbsPer100g ?? 0));
    setFiber(String(prefill?.fiberPer100g ?? 0));
    setError(null);
  }, [open, prefill]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const food = await foodsApi.create({
        name: name.trim(),
        barcode: barcode || null,
        caloriesPer100g: Number(calories),
        proteinPer100g: Number(protein),
        fatPer100g: Number(fat),
        carbsPer100g: Number(carbs),
        fiberPer100g: Number(fiber),
      });
      onCreated(food);
    } catch {
      setError('Zutat konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Neue Zutat {barcode ? `(${barcode})` : ''}</DialogTitle>
      <DialogContent>
        {!prefill && barcode && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Kein Produkt gefunden – bitte Werte manuell eintragen.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <TextField
            label="Kalorien / 100g"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            fullWidth
          />
          <TextField
            label="Eiweiß / 100g"
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            fullWidth
          />
          <TextField label="Fett / 100g" type="number" value={fat} onChange={(e) => setFat(e.target.value)} fullWidth />
          <TextField
            label="Kohlenhydrate / 100g"
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            fullWidth
          />
          <TextField
            label="Ballaststoffe / 100g"
            type="number"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
