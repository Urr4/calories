import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { offConfigApi, type OffConfigStatus } from '../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Lets the user store their Open Food Facts account so that barcode lookups
// are made as authenticated requests (custom User-Agent, app_name/app_version
// and a per-installation app_uuid, plus the session cookie obtained from the
// initial /cgi/auth.pl login request), as described at
// https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/
export default function OffConfigDialog({ open, onClose }: Props) {
  const [status, setStatus] = useState<OffConfigStatus | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    offConfigApi.get().then((s) => {
      setStatus(s);
      setUsername(s.username ?? '');
    });
  }, [open]);

  const handleSave = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const s = await offConfigApi.save(username.trim(), password);
      setStatus(s);
      setPassword('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Anmeldung bei Open Food Facts fehlgeschlagen.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await offConfigApi.remove();
      setStatus({ configured: false });
      setUsername('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Open Food Facts Zugang</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Wird für authentifizierte Anfragen beim Scannen von Barcodes verwendet.
          </Typography>
          {status?.configured && (
            <Alert severity="success">
              Verbunden als <strong>{status.username}</strong>
              {status.authenticatedAt ? ` (seit ${new Date(status.authenticatedAt).toLocaleString()})` : ''}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Open Food Facts Benutzername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            autoComplete="username"
          />
          <TextField
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete="current-password"
            helperText={status?.configured ? 'Nur zum erneuten Anmelden nötig.' : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {status?.configured ? (
          <Button onClick={handleRemove} color="error" disabled={loading}>
            Trennen
          </Button>
        ) : (
          <span />
        )}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Schließen</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || !username.trim() || !password}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            Anmelden
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
