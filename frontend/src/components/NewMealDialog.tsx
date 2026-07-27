import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Autocomplete,
  IconButton,
  Typography,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Food, Meal } from '../types';
import { foodsApi, mealsApi } from '../api/client';
import { usePersonContext } from '../context/PersonContext';

interface IngredientRow {
  food: Food | null;
  quantityG: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (meal: Meal) => void;
}

export default function NewMealDialog({ open, onClose, onCreated }: Props) {
  const { activePerson } = usePersonContext();
  const [name, setName] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [rows, setRows] = useState<IngredientRow[]>([{ food: null, quantityG: '100' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activePerson) return;
    foodsApi.list(activePerson.id).then(setFoods);
    setName('');
    setRows([{ food: null, quantityG: '100' }]);
    setError(null);
  }, [open, activePerson]);

  const updateRow = (index: number, patch: Partial<IngredientRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => setRows((prev) => [...prev, { food: null, quantityG: '100' }]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Bitte einen Namen für die Mahlzeit angeben.');
      return;
    }
    const ingredients = rows
      .filter((r) => r.food && Number(r.quantityG) > 0)
      .map((r) => ({ foodId: r.food!.id, quantityG: Number(r.quantityG) }));
    if (ingredients.length === 0) {
      setError('Bitte mindestens eine Zutat mit Menge angeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const meal = await mealsApi.create({ name: name.trim(), ingredients });
      onCreated(meal);
    } catch {
      setError('Mahlzeit konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Neue Mahlzeit erstellen</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name der Mahlzeit" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <Typography variant="subtitle2">Zutaten</Typography>
          {rows.map((row, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <Autocomplete
                options={foods}
                getOptionLabel={(f) => f.name}
                value={row.food}
                onChange={(_, value) => updateRow(index, { food: value })}
                sx={{ flex: 2 }}
                renderInput={(params) => <TextField {...params} label="Zutat" size="small" />}
              />
              <TextField
                label="Menge (g)"
                type="number"
                size="small"
                value={row.quantityG}
                onChange={(e) => updateRow(index, { quantityG: e.target.value })}
                sx={{ flex: 1 }}
              />
              <IconButton onClick={() => removeRow(index)} disabled={rows.length === 1} aria-label="Zutat entfernen">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: 'flex-start' }}>
            Zutat hinzufügen
          </Button>
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
