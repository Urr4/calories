import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Fab,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { usePersonContext } from '../context/PersonContext';
import { entriesApi, summaryApi } from '../api/client';
import type { LogEntry, MealSlot, Summary } from '../types';
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '../types';
import BulletGraph from '../components/BulletGraph';
import AddSheet from '../components/AddSheet';
import UserMenu from '../components/UserMenu';
import TargetsDialog from '../components/TargetsDialog';
import OffConfigDialog from '../components/OffConfigDialog';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const { activePerson, loading } = usePersonContext();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [offConfigOpen, setOffConfigOpen] = useState(false);
  const date = today();

  const refresh = useCallback(() => {
    if (!activePerson) return;
    entriesApi.list(activePerson.id, date).then(setEntries);
    summaryApi.get(activePerson.id, date).then(setSummary);
  }, [activePerson, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    await entriesApi.remove(id);
    refresh();
  };

  const entriesBySlot = (slot: MealSlot) => entries.filter((e) => e.meal_slot === slot);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Heute</Typography>
          <UserMenu
            onOpenTargets={() => setTargetsOpen(true)}
            onOpenOffConfig={() => setOffConfigOpen(true)}
          />
        </Toolbar>
      </AppBar>

      <OffConfigDialog open={offConfigOpen} onClose={() => setOffConfigOpen(false)} />

      {loading && (
        <Typography sx={{ p: 3 }} color="text.secondary">
          Lädt…
        </Typography>
      )}

      {!loading && !activePerson && (
        <Typography sx={{ p: 3 }} color="text.secondary">
          Bitte lege oben rechts einen Nutzer an, um zu starten.
        </Typography>
      )}

      {!loading && activePerson && summary && (
        <>
          <BulletGraph
            calories={{ value: summary.totals.calories, target: summary.targets.calories }}
            carbs={{ value: summary.totals.carbs_g, target: summary.targets.carbs_g }}
            protein={{ value: summary.totals.protein_g, target: summary.targets.protein_g }}
            fiber={{ value: summary.totals.fiber_g, target: summary.targets.fiber_g }}
          />

          <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 1.5 }}>
            {MEAL_SLOTS.map((slot) => {
              const slotEntries = entriesBySlot(slot);
              const slotCalories = slotEntries.reduce((sum, e) => sum + e.calories, 0);
              return (
                <Paper key={slot} variant="outlined" sx={{ mb: 1.5, p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {MEAL_SLOT_LABELS[slot]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(slotCalories)} kcal
                    </Typography>
                  </Stack>
                  {slotEntries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Noch nichts eingetragen.
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {slotEntries.map((entry) => (
                        <ListItem
                          key={entry.id}
                          disableGutters
                          secondaryAction={
                            <IconButton edge="end" size="small" onClick={() => handleDelete(entry.id)} aria-label="Löschen">
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={entry.item_name}
                            secondary={`${entry.quantity_g ? `${entry.quantity_g} g – ` : ''}${Math.round(entry.calories)} kcal`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              );
            })}
          </Box>

          <Fab
            color="primary"
            onClick={() => setAddOpen(true)}
            sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
            aria-label="Hinzufügen"
          >
            <AddIcon />
          </Fab>

          <AddSheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            date={date}
            onEntryAdded={refresh}
          />

          <TargetsDialog open={targetsOpen} onClose={() => setTargetsOpen(false)} />
        </>
      )}
    </Box>
  );
}
