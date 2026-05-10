import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Checkbox, Chip, Container, Divider, FormControl,
  FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, TextField,
  Typography,
} from '@mui/material';
import { callBackend } from '../services/api';
import {
  defaultLicenseConfig,
  getClientConfig,
  getLicenseConfig,
  saveLicenseConfig,
} from '../utils/enterpriseConfig';

const PIPELINES = ['Devops Pipeline', 'Test Devops Pipeline', 'Prod Devops Pipeline'];
const FEATURES = [
  'build',
  'artifact_publish',
  'code_scan',
  'image_scan',
  'policy_validation',
  'static_application_security',
  'test_suites',
  'notifications',
  'secret_management',
  'prod_deploy',
  'ai_remediation',
];
const ENVIRONMENTS = ['EKS-NONPROD', 'EKS-PROD'];

const toggleListValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

function LicensePage() {
  const [license, setLicense] = useState(getLicenseConfig());
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);

  const daysRemaining = useMemo(() => {
    if (!license.license_expires_at) return null;
    const expires = new Date(license.license_expires_at).getTime();
    if (Number.isNaN(expires)) return null;
    return Math.ceil((expires - Date.now()) / (1000 * 60 * 60 * 24));
  }, [license.license_expires_at]);

  useEffect(() => {
    callBackend('/license/status', 'GET').then((data) => {
      setStatus(data);
      if (!getLicenseConfig().license_expires_at && data?.expires_at) {
        setLicense((prev) => ({
          ...prev,
          license_type: data.license_type || prev.license_type,
          license_expires_at: data.expires_at,
          enabled_pipelines: data.enabled_pipelines || prev.enabled_pipelines,
          enabled_features: data.enabled_features || prev.enabled_features,
          allowed_environments: data.allowed_environments || prev.allowed_environments,
          license_mode: data.license_mode || prev.license_mode,
          last_synced_at: data.last_synced_at || prev.last_synced_at,
        }));
      }
    });
  }, []);

  const handleSave = async () => {
    const client = getClientConfig();
    saveLicenseConfig(license);
    const result = await callBackend('/license/validate', 'POST', {
      ...client,
      ...license,
      pipeline_name: 'Devops Pipeline',
      target_env: license.allowed_environments?.[0] || 'EKS-NONPROD',
      requested_features: ['build', 'artifact_publish'],
    });
    setStatus(result);
    setMessage(result?.error ? result.error : 'License settings saved.');
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await callBackend('/license/sync', 'POST', { force: true });
      setStatus(result);
      const nextLicense = {
        ...license,
        license_type: result.license_type || license.license_type,
        license_expires_at: result.expires_at || license.license_expires_at,
        enabled_pipelines: result.enabled_pipelines || license.enabled_pipelines,
        enabled_features: result.enabled_features || license.enabled_features,
        allowed_environments: result.allowed_environments || license.allowed_environments,
        license_mode: result.license_mode || 'online-sync',
        last_synced_at: result.last_synced_at || '',
      };
      setLicense(nextLicense);
      saveLicenseConfig(nextLicense);
      setMessage(result.message || 'License synced successfully.');
    } catch (error) {
      setMessage(error.message || 'License sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = () => {
    setLicense(defaultLicenseConfig);
    saveLicenseConfig(defaultLicenseConfig);
    setMessage('License settings reset.');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>License</Typography>
          <Typography variant="body2" color="text.secondary">Client-hosted entitlement status</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={status?.status || 'not validated'} color={status?.status === 'active' ? 'success' : 'default'} />
          <Chip label={status?.validation_mode || 'local'} variant="outlined" />
          <Chip label={status?.license_mode || license.license_mode || 'offline-file'} variant="outlined" />
          {daysRemaining !== null && <Chip label={`${daysRemaining} days remaining`} color={daysRemaining > 7 ? 'primary' : 'warning'} />}
        </Stack>
      </Stack>

      {message && <Alert severity={message.includes('denied') || message.includes('invalid') ? 'error' : 'success'} sx={{ mt: 2 }}>{message}</Alert>}

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>License Details</Typography>
            <Stack spacing={2}>
              <TextField
                label="License Mode"
                value={license.license_mode || status?.license_mode || 'offline-file'}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Last Synced At"
                value={license.last_synced_at || status?.last_synced_at || 'Not synced'}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="License Key"
                type="password"
                value={license.license_key}
                onChange={(e) => setLicense((prev) => ({ ...prev, license_key: e.target.value }))}
                fullWidth
              />
              <TextField
                label="License Signature"
                type="password"
                value={license.license_signature}
                onChange={(e) => setLicense((prev) => ({ ...prev, license_signature: e.target.value }))}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>License Type</InputLabel>
                <Select
                  label="License Type"
                  value={license.license_type}
                  onChange={(e) => setLicense((prev) => ({ ...prev, license_type: e.target.value }))}
                >
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="internal">Internal</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Expires At"
                type="datetime-local"
                value={(license.license_expires_at || '').replace('Z', '').slice(0, 16)}
                onChange={(e) => setLicense((prev) => ({ ...prev, license_expires_at: `${e.target.value}:00Z` }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Entitlements</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2">Pipelines</Typography>
            <Grid container>
              {PIPELINES.map((pipeline) => (
                <Grid item xs={12} md={4} key={pipeline}>
                  <FormControlLabel
                    control={<Checkbox checked={license.enabled_pipelines.includes(pipeline)} onChange={() => setLicense((prev) => ({ ...prev, enabled_pipelines: toggleListValue(prev.enabled_pipelines, pipeline) }))} />}
                    label={pipeline}
                  />
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" sx={{ mt: 2 }}>Features</Typography>
            <Grid container>
              {FEATURES.map((feature) => (
                <Grid item xs={12} md={4} key={feature}>
                  <FormControlLabel
                    control={<Checkbox checked={license.enabled_features.includes(feature)} onChange={() => setLicense((prev) => ({ ...prev, enabled_features: toggleListValue(prev.enabled_features, feature) }))} />}
                    label={feature.replaceAll('_', ' ')}
                  />
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" sx={{ mt: 2 }}>Environments</Typography>
            <Stack direction="row" spacing={2}>
              {ENVIRONMENTS.map((environment) => (
                <FormControlLabel
                  key={environment}
                  control={<Checkbox checked={license.allowed_environments.includes(environment)} onChange={() => setLicense((prev) => ({ ...prev, allowed_environments: toggleListValue(prev.allowed_environments, environment) }))} />}
                  label={environment}
                />
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave}>Save And Validate</Button>
        <Button variant="contained" color="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync License'}
        </Button>
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Stack>
    </Container>
  );
}

export default LicensePage;
