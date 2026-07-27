import { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import type { Food, Meal, MealSlot } from '../types';
import { foodsApi, mealsApi, entriesApi } from '../api/client';
import { usePersonContext } from '../context/PersonContext';
import SwipeableItem from './SwipeableItem';
import QuantityDialog from './QuantityDialog';
import BarcodeScanDialog from './BarcodeScanDialog';
import NewFoodDialog from './NewFoodDialog';
import NewMealDialog from './NewMealDialog';
import type { BarcodeLookupResult } from '../types';

type UnifiedItem =
  | { kind: 'food'; id: string; name: string; usage_count: number; food: Food }
  | { kind: 'meal'; id: string; name: string; usage_count: number; meal: Meal };

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  onEntryAdded: () => void;
}

export default function AddSheet({ open, onClose, date, onEntryAdded }: Props) {
  const { activePerson } = usePersonContext();
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  const [quantityFood, setQuantityFood] = useState<Food | null>(null);
  const [quantitySlot, setQuantitySlot] = useState<MealSlot | null>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [newFoodOpen, setNewFoodOpen] = useState(false);
  const [newFoodBarcode, setNewFoodBarcode] = useState<string | null>(null);
  const [newFoodPrefill, setNewFoodPrefill] = useState<BarcodeLookupResult | null>(null);
  const [newMealOpen, setNewMealOpen] = useState(false);

  const load = () => {
    if (!activePerson) return;
    foodsApi.list(activePerson.id, query || undefined).then(setFoods);
    mealsApi.list(activePerson.id, query || undefined).then(setMeals);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activePerson, query]);

  const items: UnifiedItem[] = useMemo(() => {
    const foodItems: UnifiedItem[] = foods.map((f) => ({
      kind: 'food',
      id: f.id,
      name: f.name,
      usage_count: f.usage_count,
      food: f,
    }));
    const mealItems: UnifiedItem[] = meals.map((m) => ({
      kind: 'meal',
      id: m.id,
      name: m.name,
      usage_count: m.usage_count,
      meal: m,
    }));
    return [...foodItems, ...mealItems].sort((a, b) => {
      if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
      return a.name.localeCompare(b.name, 'de');
    });
  }, [foods, meals]);

  const handleSwipe = async (item: UnifiedItem, slot: MealSlot) => {
    if (!activePerson) return;
    if (item.kind === 'food') {
      setQuantityFood(item.food);
      setQuantitySlot(slot);
      return;
    }
    await entriesApi.create({
      personId: activePerson.id,
      date,
      mealSlot: slot,
      itemType: 'meal',
      itemId: item.meal.id,
    });
    onEntryAdded();
  };

  const handleQuantityConfirm = async (quantityG: number) => {
    if (!activePerson || !quantityFood || !quantitySlot) return;
    await entriesApi.create({
      personId: activePerson.id,
      date,
      mealSlot: quantitySlot,
      itemType: 'food',
      itemId: quantityFood.id,
      quantityG,
    });
    setQuantityFood(null);
    setQuantitySlot(null);
    onEntryAdded();
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setScanOpen(false);
    setNewFoodBarcode(barcode);
    try {
      const result = await foodsApi.lookupBarcode(barcode);
      setNewFoodPrefill(result);
    } catch {
      setNewFoodPrefill(null);
    }
    setNewFoodOpen(true);
  };

  return (
    <>
      <Drawer anchor="bottom" open={open} onClose={onClose}>
        <Box sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 2 }}>
            <Typography variant="h6">Hinzufügen</Typography>
            <IconButton onClick={onClose} aria-label="Schließen">
              <CloseIcon />
            </IconButton>
          </Stack>
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Suchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>
          <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1 }}>
            <Button
              startIcon={<CameraAltIcon />}
              variant="outlined"
              size="small"
              onClick={() => setScanOpen(true)}
            >
              Neue Zutat
            </Button>
            <Button
              startIcon={<RestaurantIcon />}
              variant="outlined"
              size="small"
              onClick={() => setNewMealOpen(true)}
            >
              Neue Mahlzeit
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 0.5 }}>
            Wischen: links = Frühstück, hoch = Mittag, rechts = Abend, runter = Snack
          </Typography>
          <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
            {items.map((item) => (
              <SwipeableItem key={`${item.kind}-${item.id}`} onSwipe={(slot) => handleSwipe(item, slot)}>
                <ListItem
                  sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={
                      item.kind === 'food'
                        ? `${Math.round(item.food.calories_per_100g)} kcal / 100g`
                        : `${Math.round(item.meal.nutritionPerPortion.calories)} kcal / Portion`
                    }
                  />
                  <Chip
                    size="small"
                    label={item.kind === 'food' ? 'Zutat' : 'Mahlzeit'}
                    color={item.kind === 'food' ? 'default' : 'primary'}
                    variant="outlined"
                  />
                </ListItem>
              </SwipeableItem>
            ))}
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 4, textAlign: 'center' }}>
                Keine Einträge gefunden.
              </Typography>
            )}
          </List>
        </Box>
      </Drawer>

      <QuantityDialog
        open={Boolean(quantityFood)}
        food={quantityFood}
        mealSlot={quantitySlot}
        onClose={() => {
          setQuantityFood(null);
          setQuantitySlot(null);
        }}
        onConfirm={handleQuantityConfirm}
      />

      <BarcodeScanDialog open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleBarcodeDetected} />

      <NewFoodDialog
        open={newFoodOpen}
        barcode={newFoodBarcode}
        prefill={newFoodPrefill}
        onClose={() => setNewFoodOpen(false)}
        onCreated={() => {
          setNewFoodOpen(false);
          load();
        }}
      />

      <NewMealDialog
        open={newMealOpen}
        onClose={() => setNewMealOpen(false)}
        onCreated={() => {
          setNewMealOpen(false);
          load();
        }}
      />
    </>
  );
}
