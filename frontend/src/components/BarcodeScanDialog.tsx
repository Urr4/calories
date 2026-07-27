import { useCallback, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
} from '@mui/material';

const SCANNER_ELEMENT_ID = 'barcode-scanner-view';

interface Props {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
  onManualEntry: () => void;
}

export default function BarcodeScanDialog({ open, onClose, onDetected, onManualEntry }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    scanner
      .stop()
      .then(() => scanner.clear())
      .catch(() => {
        /* scanner may already be stopped */
      });
  }, []);

  // Started once the Dialog's enter transition has finished, so the
  // #barcode-scanner-view element is guaranteed to exist in the DOM
  // (html5-qrcode looks it up synchronously by id and throws otherwise).
  const handleEntered = useCallback(() => {
    setError(null);
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    let detected = false;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (detected) return;
          detected = true;
          onDetected(decodedText);
        },
        () => {
          // per-frame decode failures are expected while searching; ignore
        }
      )
      .catch((err) => {
        setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.');
        console.error('Failed to start barcode scanner', err);
      });
  }, [onDetected]);

  const handleExited = useCallback(() => {
    stopScanner();
  }, [stopScanner]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onEntered: handleEntered, onExited: handleExited } }}
    >
      <DialogTitle>Barcode scannen</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box id={SCANNER_ELEMENT_ID} sx={{ width: '100%', minHeight: 240 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Barcode der Zutat in den Rahmen halten.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onManualEntry}>Manuell eingeben</Button>
        <Button onClick={onClose}>Abbrechen</Button>
      </DialogActions>
    </Dialog>
  );
}
