import { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Avatar,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import { usePersonContext } from '../context/PersonContext';

interface Props {
  onOpenTargets: () => void;
}

export default function UserMenu({ onOpenTargets }: Props) {
  const { persons, activePerson, setActivePersonId, createPerson } = usePersonContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => setAnchorEl(null);

  const handleSelect = (id: string) => {
    setActivePersonId(id);
    close();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createPerson(newName.trim());
      setNewName('');
      setCreateOpen(false);
      close();
    } catch {
      setError('Nutzer konnte nicht angelegt werden (Name evtl. schon vergeben).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Nutzer wählen"
        color="inherit"
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
          {activePerson?.name?.[0]?.toUpperCase() ?? <PersonIcon fontSize="small" />}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        {persons.map((p) => (
          <MenuItem key={p.id} selected={p.id === activePerson?.id} onClick={() => handleSelect(p.id)}>
            <ListItemIcon>
              <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{p.name[0]?.toUpperCase()}</Avatar>
            </ListItemIcon>
            <ListItemText>{p.name}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { close(); onOpenTargets(); }} disabled={!activePerson}>
          <ListItemIcon>
            <TuneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ziele bearbeiten</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setCreateOpen(true); close(); }}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Neuer Nutzer</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Neuen Nutzer anlegen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            error={Boolean(error)}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreate} variant="contained" disabled={saving || !newName.trim()}>
            Anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
