import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Container, Divider, Grid,
  Stack, TextField, Typography,
} from '@mui/material';
import { callBackend } from '../services/api';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not configured';
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

function Detail({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
        {formatValue(value)}
      </Typography>
    </Box>
  );
}

function ChipList({ title, values }) {
  const list = Array.isArray(values) ? values : [];
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {list.length ? list.map((item) => (
          <Chip key={item} label={item} variant="outlined" size="small" />
        )) : <Typography variant="body2" color="text.secondary">None</Typography>}
      </Stack>
    </Box>
  );
}

function LicensePage() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    requested_plan_code: 'enterprise-annual',
    requested_user_count: '25',
    requested_repo_count: '20',
    requester_email: '',
    message: 'Ready to convert from trial to enterprise.',
  });

  const daysRemaining = useMemo(() => {
    if (!status?.expires_at) return null;
    const expires = new Date(status.expires_at).getTime();
    if (Number.isNaN(expires)) return null;
    return Math.ceil((expires - Date.now()) / (1000 * 60 * 60 * 24));
  }, [status?.expires_at]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await callBackend('/license/status', 'GET');
      setStatus(result);
      setMessage('');
    } catch (error) {
      setStatus(error.body && typeof error.body === 'object' ? error.body : { status: 'invalid', error: error.message });
      setMessage(error.message || 'Unable to load license status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await callBackend('/license/sync', 'POST', { force: true });
      setStatus(result);
      setMessage(result.message || 'License synced successfully.');
    } catch (error) {
      if (error.body && typeof error.body === 'object') {
        setStatus(error.body);
      }
      setMessage(error.message || 'License sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpgradeField = (field) => (event) => {
    setUpgradeForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleUpgradeRequest = async () => {
    setRequestingUpgrade(true);
    setMessage('');
    try {
      const result = await callBackend('/license/upgrade-request', 'POST', {
        requested_plan_code: upgradeForm.requested_plan_code,
        requested_license_type: 'enterprise',
        requested_environments: status?.allowed_environments || [],
        requested_features: status?.enabled_features || [],
        requested_user_count: Number(upgradeForm.requested_user_count || 0),
        requested_repo_count: Number(upgradeForm.requested_repo_count || 0),
        requester_email: upgradeForm.requester_email,
        message: upgradeForm.message,
        metadata: {
          submitted_from: 'client-license-page',
          current_license_type: status?.license_type,
          current_expires_at: status?.expires_at,
        },
      });
      setMessage(result.message || 'Upgrade request submitted.');
    } catch (error) {
      setMessage(error.message || 'Upgrade request failed.');
    } finally {
      setRequestingUpgrade(false);
    }
  };

  const isActive = status?.status === 'active';
  const canSync = Boolean(status?.sync_available);
  const canRequestUpgrade = Boolean(status?.upgrade_available);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>License</Typography>
          <Typography variant="body2" color="text.secondary">Client-hosted entitlement status</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={status?.status || 'loading'} color={isActive ? 'success' : 'default'} />
          <Chip label={status?.license_mode || 'offline-file'} variant="outlined" />
          <Chip label={status?.validation_mode || 'unknown'} variant="outlined" />
          <Chip
            label={status?.usage_reporting_enabled ? 'usage reporting on' : 'usage reporting off'}
            color={status?.usage_reporting_enabled ? 'success' : 'default'}
            variant="outlined"
          />
          {daysRemaining !== null && (
            <Chip label={`${daysRemaining} days remaining`} color={daysRemaining > 7 ? 'primary' : 'warning'} />
          )}
        </Stack>
      </Stack>

      {message && (
        <Alert severity={message.toLowerCase().includes('fail') || message.toLowerCase().includes('invalid') ? 'error' : 'success'} sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Subscription</Typography>
              <Stack spacing={2}>
                <Detail label="Client" value={status?.client_name || status?.client_id} />
                <Detail label="Client ID" value={status?.client_id} />
                <Detail label="Installation ID" value={status?.installation_id} />
                <Detail label="License Key" value={status?.license_key} />
                <Detail label="License Type" value={status?.license_type} />
                <Detail label="Issuer" value={status?.issuer} />
                <Detail label="Issued At" value={formatDateTime(status?.issued_at)} />
                <Detail label="Expires At" value={formatDateTime(status?.expires_at)} />
                <Detail label="Last Synced At" value={formatDateTime(status?.last_synced_at)} />
                <Detail label="Usage Reporting" value={status?.usage_reporting_enabled ? 'Enabled' : 'Disabled'} />
                <Detail label="Usage Endpoint" value={status?.usage_endpoint_configured ? 'Configured' : 'Not configured'} />
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Entitlements</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2.5}>
                <ChipList title="Enabled Pipelines" values={status?.enabled_pipelines} />
                <ChipList title="Enabled Features" values={status?.enabled_features?.map((item) => item.replaceAll('_', ' '))} />
                <ChipList title="Allowed Environments" values={status?.allowed_environments} />
                <ChipList title="Allowed AWS Accounts" values={status?.allowed_aws_account_ids} />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Usage Limits</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}><Detail label="Repositories" value={status?.max_repos || status?.limits?.max_repos} /></Grid>
                    <Grid item xs={12} sm={4}><Detail label="Builds / Month" value={status?.max_builds_per_month || status?.limits?.max_builds_per_month} /></Grid>
                    <Grid item xs={12} sm={4}><Detail label="Users" value={status?.max_users || status?.limits?.max_users} /></Grid>
                  </Grid>
                </Box>
              </Stack>
            </Card>
          </Grid>

          {status?.error && (
            <Grid item xs={12}>
              <Alert severity="error">{status.error}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Card sx={{ p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Enterprise Upgrade</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Submit a commercial upgrade or renewal request to Horizon Relevance. Horizon will review the request, create an offer, and activate the subscription after acceptance.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Plan Code"
                    value={upgradeForm.requested_plan_code}
                    onChange={handleUpgradeField('requested_plan_code')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Users"
                    type="number"
                    value={upgradeForm.requested_user_count}
                    onChange={handleUpgradeField('requested_user_count')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Repositories"
                    type="number"
                    value={upgradeForm.requested_repo_count}
                    onChange={handleUpgradeField('requested_repo_count')}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="Requester Email"
                    value={upgradeForm.requester_email}
                    onChange={handleUpgradeField('requester_email')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Message"
                    value={upgradeForm.message}
                    onChange={handleUpgradeField('message')}
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={handleUpgradeRequest}
                disabled={requestingUpgrade || !canRequestUpgrade}
              >
                {requestingUpgrade ? 'Submitting...' : 'Request Enterprise Upgrade'}
              </Button>
              {!canRequestUpgrade && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upgrade requests require online license sync or an explicit license upgrade endpoint.
                </Typography>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" color="secondary" onClick={handleSync} disabled={syncing || !canSync}>
          {syncing ? 'Syncing...' : 'Sync License'}
        </Button>
        <Button variant="outlined" onClick={loadStatus}>Refresh Status</Button>
      </Stack>
    </Container>
  );
}

export default LicensePage;
