import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { callBackend } from '../services/api';
import ApplicationSelector from '../components/ApplicationSelector';
import { getStoredUserEmail, loadUserApplications } from '../services/applications';

const statusColors = {
  pass: 'success',
  warn: 'warning',
  block: 'error',
  allow: 'success',
  manual_approval: 'warning',
  deny: 'error',
  generated: 'success',
  missing: 'default',
  verified: 'success',
  failed: 'error',
};

function normalizeRelease(release, index) {
  const context = release.context || {};
  return {
    id: release.id || release.release_id || release.releaseId || index,
    release_id: release.release_id || release.releaseId || 'unknown',
    commit_sha: release.commit_sha || release.commitSha || 'N/A',
    image_digest: release.image_digest || release.imageDigest || 'N/A',
    policy_status: (release.policy_status || release.policyStatus || 'unknown').toString().toLowerCase(),
    promotion_status: (release.promotion_status || release.promotionStatus || 'not requested').toString().toLowerCase(),
    sbom_status: (release.sbom_status || release.sbomStatus || 'unknown').toString().toLowerCase(),
    application_name: context.application_name || release.application || 'Unlinked legacy release',
    repository_url: context.repository_url || 'N/A',
  };
}

function StatusChip({ value }) {
  return <Chip label={value || 'unknown'} color={statusColors[value] || 'default'} size="small" />;
}

function SummaryCard({ title, value, color }) {
  return (
    <Card sx={{ minWidth: 180 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="h5" color={color || 'text.primary'}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function ReleaseTrustDashboard() {
  const navigate = useNavigate();
  const [releases, setReleases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');
  const userEmail = getStoredUserEmail();

  const loadReleases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callBackend('/release-trust/runs', 'GET');
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.runs)
            ? data.runs
            : [];
      const normalizedRows = rows.map((release, index) => normalizeRelease(release, index));
      setReleases(selectedApp
        ? normalizedRows.filter((release) => release.application_name === selectedApp)
        : normalizedRows);
    } catch (loadError) {
      setReleases([]);
      setError(loadError.message || 'Unable to load Release Trust runs.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    let active = true;
    setApplicationsLoading(true);
    setApplicationsError('');

    loadUserApplications(userEmail)
      .then((apps) => {
        if (!active) return;
        setApplications(apps);
        setSelectedApp((current) => current || apps[0] || '');
      })
      .catch((loadError) => {
        if (!active) return;
        setApplications([]);
        setApplicationsError(loadError.message || 'Unable to load applications.');
      })
      .finally(() => {
        if (active) setApplicationsLoading(false);
      });

    return () => { active = false; };
  }, [userEmail]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const policyPassCount = releases.filter((release) => release.policy_status === 'pass').length;
  const policyWarnCount = releases.filter((release) => release.policy_status === 'warn').length;
  const policyBlockCount = releases.filter((release) => release.policy_status === 'block').length;
  const sbomReadyCount = releases.filter((release) => ['generated', 'verified', 'pass'].includes(release.sbom_status)).length;

  const columns = [
    {
      field: 'release_id',
      headerName: 'Release ID',
      width: 180,
      renderCell: (params) => (
        <Button
          variant="text"
          sx={{ minWidth: 0, px: 0, textTransform: 'none' }}
          onClick={() => navigate(`/release-trust/${params.value}`)}
        >
          {params.value}
        </Button>
      ),
    },
    { field: 'commit_sha', headerName: 'Commit SHA', width: 140 },
    { field: 'application_name', headerName: 'Application', width: 200 },
    { field: 'repository_url', headerName: 'Repository', width: 260 },
    { field: 'image_digest', headerName: 'Image Digest', width: 320 },
    {
      field: 'policy_status',
      headerName: 'Policy Status',
      width: 150,
      renderCell: (params) => <StatusChip value={params.value} />,
    },
    {
      field: 'promotion_status',
      headerName: 'Promotion',
      width: 180,
      renderCell: (params) => <StatusChip value={params.value} />,
    },
    {
      field: 'sbom_status',
      headerName: 'SBOM Status',
      width: 150,
      renderCell: (params) => <StatusChip value={params.value} />,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>Release Trust Dashboard</Typography>
          <ApplicationSelector
            applications={applications}
            value={selectedApp}
            onChange={setSelectedApp}
            disabled={applicationsLoading || applications.length === 0}
          />
          <Typography variant="body2" color="text.secondary">
            Platform application context, release evidence, policy status, SBOM status, and image digest traceability.
          </Typography>
        </Box>
        <Button variant="contained" onClick={loadReleases} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <SummaryCard title="Tracked Releases" value={releases.length} />
        </Grid>
        <Grid item>
          <SummaryCard title="Policy Pass" value={policyPassCount} color="success.main" />
        </Grid>
        <Grid item>
          <SummaryCard title="Policy Warn" value={policyWarnCount} color="warning.main" />
        </Grid>
        <Grid item>
          <SummaryCard title="Policy Block" value={policyBlockCount} color="error.main" />
        </Grid>
        <Grid item>
          <SummaryCard title="SBOM Ready" value={sbomReadyCount} color="info.main" />
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {applicationsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {applicationsError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : releases.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>No Release Trust runs found</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedApp
                ? `No Release Trust runs found for ${selectedApp}.`
                : 'The backend returned no Release Trust run data for this environment yet.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ height: 420, width: '100%' }}>
          <DataGrid
            rows={releases}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
          />
        </Box>
      )}
    </Container>
  );
}

export default ReleaseTrustDashboard;
