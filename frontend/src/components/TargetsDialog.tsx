import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { usePersonContext } from '../context/PersonContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TargetsDialog({ open, onClose }: Props) {
  const { activePerson, updateActivePersonTargets } = usePersonContext();
  const [calories, setCalories] = useState('2000');
  const [carbs, setCarbs] = useState('250');
  const [protein, setProtein] = useState('100');
  const [fiber, setFiber] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePerson) {
      setCalories(String(activePerson.calories));
      setCarbs(String(activePerson.carbs_g));
      setProtein(String(activePerson.protein_g));
      setFiber(String(activePerson.fiber_g));
    }
  }, [activePerson, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateActivePersonTargets({
        calories: Number(calories),
        carbs_g: Number(carbs),
        protein_g: Number(protein),
        fiber_g: Number(fiber),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Tagesziele für {activePerson?.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Kalorien (kcal)"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            fullWidth
          />
          <TextField
            label="Kohlenhydrate (g)"
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            fullWidth
          />
          <TextField
            label="Eiweiß (g)"
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            fullWidth
          />
          <TextField
            label="Ballaststoffe (g)"
            type="number"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
