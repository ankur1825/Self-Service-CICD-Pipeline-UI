import { useState } from 'react';
import {
  Alert, Button, Card, Container, FormControl, Grid, InputLabel, MenuItem,
  Select, Stack, TextField, Typography,
} from '@mui/material';
import {
  defaultClientConfig,
  getClientConfig,
  saveClientConfig,
} from '../utils/enterpriseConfig';

function ClientSettingsPage() {
  const [client, setClient] = useState(getClientConfig());
  const [message, setMessage] = useState('');

  const handleSave = () => {
    saveClientConfig(client);
    setMessage('Client settings saved.');
  };

  const handleReset = () => {
    setClient(defaultClientConfig);
    saveClientConfig(defaultClientConfig);
    setMessage('Client settings reset.');
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Client Settings</Typography>
      <Typography variant="body2" color="text.secondary">Client identity used for pipeline requests and license validation</Typography>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}

      <Card sx={{ p: 2, mt: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Client ID"
              value={client.client_id}
              onChange={(e) => setClient((prev) => ({ ...prev, client_id: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Client Name"
              value={client.client_name}
              onChange={(e) => setClient((prev) => ({ ...prev, client_name: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Industry</InputLabel>
              <Select
                label="Industry"
                value={client.industry}
                onChange={(e) => setClient((prev) => ({ ...prev, industry: e.target.value }))}
              >
                <MenuItem value="generic">Generic Enterprise</MenuItem>
                <MenuItem value="fintech">Fintech</MenuItem>
                <MenuItem value="healthcare-pharma">Healthcare / Pharma</MenuItem>
                <MenuItem value="telecom">Telecom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave}>Save</Button>
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Stack>
    </Container>
  );
}

export default ClientSettingsPage;
