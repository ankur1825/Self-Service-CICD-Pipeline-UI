import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Container, Divider, FormControl,
  Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { callBackend } from '../../services/api';
import { canApproveCloudMigration, canAuthorCloudMigration } from '../../utils/authz';
import {
  approveMigrationWave,
  createMigrationProject,
  createMigrationWave,
  getCloudMigrationCapabilities,
  getMigrationProject,
  getMigrationProjects,
  planMigrationWave,
} from './api';

const PROJECT_INITIAL = {
  name: '',
  description: '',
  source_type: 'aws-ec2',
  target_provider: 'aws',
  target_environment: '',
};

const WAVE_INITIAL = {
  name: '',
  migration_method: 'mgn',
  source_region: '',
  target_region: '',
  maintenance_window: '',
  workload_refs: '',
};

const errorMessage = (error, fallback) => error?.body?.detail || error?.message || fallback;

function CheckList({ plan }) {
  if (!plan) return <Typography variant="body2" color="text.secondary">Generate a plan to run the AWS readiness checks.</Typography>;
  return (
    <Stack spacing={1}>
      {(plan.checks || []).map((check) => (
        <Alert key={check.key} severity={check.status === 'passed' ? 'success' : check.severity === 'error' ? 'error' : 'warning'}>
          <strong>{check.key.replaceAll('_', ' ')}</strong>: {check.message}
        </Alert>
      ))}
    </Stack>
  );
}

function CloudMigrationPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canAuthor = canAuthorCloudMigration(user);
  const canApprove = canApproveCloudMigration(user);
  const [capabilities, setCapabilities] = useState(null);
  const [projects, setProjects] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState(PROJECT_INITIAL);
  const [waveForm, setWaveForm] = useState(WAVE_INITIAL);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const aws = capabilities?.providers?.find((provider) => provider.provider === 'aws');
  const licensed = capabilities?.licensed === true && aws?.status === 'available';

  const loadProject = useCallback(async (projectId) => {
    if (!projectId) {
      setSelectedProject(null);
      return;
    }
    const project = await getMigrationProject(projectId);
    setSelectedProject(project);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const capabilityResult = await getCloudMigrationCapabilities();
      setCapabilities(capabilityResult);

      const catalogResult = await callBackend('/environment-catalog');
      const catalog = catalogResult?.environments || [];
      setEnvironments(catalog);
      setProjectForm((current) => ({
        ...current,
        target_environment: current.target_environment || catalog[0]?.name || '',
      }));

      if (capabilityResult.licensed) {
        const projectResult = await getMigrationProjects();
        const nextProjects = projectResult?.projects || [];
        setProjects(nextProjects);
        const nextId = selectedProjectId || nextProjects[0]?.id || '';
        setSelectedProjectId(nextId);
        if (nextId) await loadProject(nextId);
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load Cloud Migration Factory.'));
    } finally {
      setLoading(false);
    }
  }, [loadProject, selectedProjectId]);

  useEffect(() => {
    load();
  // Initial load is intentional; subsequent mutations refresh explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProject = (field) => (event) => setProjectForm((current) => ({ ...current, [field]: event.target.value }));
  const updateWave = (field) => (event) => setWaveForm((current) => ({ ...current, [field]: event.target.value }));

  const selectProject = async (projectId) => {
    setSelectedProjectId(projectId);
    setError('');
    try {
      await loadProject(projectId);
    } catch (selectError) {
      setError(errorMessage(selectError, 'Unable to load migration project.'));
    }
  };

  const handleCreateProject = async () => {
    setBusy('project');
    setError('');
    setMessage('');
    try {
      const created = await createMigrationProject(projectForm);
      setProjects((current) => [created, ...current]);
      setSelectedProjectId(created.id);
      setSelectedProject(created);
      setProjectForm((current) => ({ ...PROJECT_INITIAL, target_environment: current.target_environment }));
      setMessage(`Project '${created.name}' created inside the licensed client tenant.`);
    } catch (createError) {
      setError(errorMessage(createError, 'Unable to create migration project.'));
    } finally {
      setBusy('');
    }
  };

  const workloads = useMemo(() => waveForm.workload_refs
    .split(/[\n,]/)
    .map((source_ref) => source_ref.trim())
    .filter(Boolean)
    .map((source_ref) => ({ source_ref })), [waveForm.workload_refs]);

  const handleCreateWave = async () => {
    setBusy('wave');
    setError('');
    setMessage('');
    try {
      await createMigrationWave(selectedProjectId, {
        name: waveForm.name,
        migration_method: waveForm.migration_method,
        source_region: waveForm.source_region || null,
        target_region: waveForm.target_region || null,
        maintenance_window: waveForm.maintenance_window || null,
        workloads,
      });
      await loadProject(selectedProjectId);
      setWaveForm(WAVE_INITIAL);
      setMessage('Migration wave saved. Generate and review its versioned plan before approval.');
    } catch (createError) {
      setError(errorMessage(createError, 'Unable to create migration wave.'));
    } finally {
      setBusy('');
    }
  };

  const mutateWave = async (label, action) => {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      await action();
      await loadProject(selectedProjectId);
      setMessage(label === 'approve' ? 'Wave approved with an immutable audit event.' : 'AWS migration plan generated.');
    } catch (mutationError) {
      setError(errorMessage(mutationError, `Unable to ${label} migration wave.`));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Cloud Migration Factory</Typography>
          <Typography color="text.secondary">AWS rehost / lift-and-shift enterprise control plane</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label="AWS first" color="primary" />
          <Chip label={capabilities?.data_boundary || 'client-hosted'} variant="outlined" />
          <Chip label={licensed ? 'Licensed' : 'Not licensed'} color={licensed ? 'success' : 'error'} />
          <Chip label={aws?.execution_enabled ? 'Execution enabled' : 'Execution locked'} color={aws?.execution_enabled ? 'warning' : 'default'} />
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mt: 2 }}>
        Inventory, AWS credentials, plans, logs, approvals, and execution remain inside the client domain. The product license grants capability; it does not transfer migration data to the vendor.
      </Alert>
      {!licensed && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {capabilities?.license_reason || 'Cloud Migration Factory and AWS migration entitlements are required.'}
          {' '}Required: {(capabilities?.required_entitlements || []).join(', ')}.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}

      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6">New AWS migration project</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The target account and role are resolved server-side from Environment Catalog.
              </Typography>
              <Stack spacing={2}>
                <TextField label="Project name" value={projectForm.name} onChange={updateProject('name')} required disabled={!licensed || !canAuthor} />
                <TextField label="Description" value={projectForm.description} onChange={updateProject('description')} multiline minRows={2} disabled={!licensed || !canAuthor} />
                <FormControl fullWidth disabled={!licensed || !canAuthor}>
                  <InputLabel>Source</InputLabel>
                  <Select label="Source" value={projectForm.source_type} onChange={updateProject('source_type')}>
                    <MenuItem value="aws-ec2">AWS EC2 (account or Region)</MenuItem>
                    <MenuItem value="external">On-premises or other cloud</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={!licensed || !canAuthor}>
                  <InputLabel>Target environment</InputLabel>
                  <Select label="Target environment" value={projectForm.target_environment} onChange={updateProject('target_environment')}>
                    {environments.map((environment) => (
                      <MenuItem key={environment.name} value={environment.name}>{environment.display_name || environment.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!licensed || !canAuthor || busy === 'project' || !projectForm.name || !projectForm.target_environment}
                  onClick={handleCreateProject}
                >
                  Create project
                </Button>
                {!canAuthor && <Alert severity="warning">A migration architect or operator role is required to author projects.</Alert>}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Projects</Typography>
              <Stack spacing={1}>
                {projects.map((project) => (
                  <Button
                    key={project.id}
                    variant={project.id === selectedProjectId ? 'contained' : 'outlined'}
                    onClick={() => selectProject(project.id)}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <span>{project.name}</span><span>{project.target_environment}</span>
                  </Button>
                ))}
                {!projects.length && <Typography variant="body2" color="text.secondary">No migration projects yet.</Typography>}
              </Stack>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          {!selectedProject ? (
            <Card sx={{ p: 4 }}><Typography color="text.secondary">Select or create a migration project.</Typography></Card>
          ) : (
            <Stack spacing={2}>
              <Card sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="h5">{selectedProject.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedProject.description || 'No description'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={selectedProject.source_type} variant="outlined" />
                    <Chip label={`AWS ${selectedProject.target_environment}`} color="primary" variant="outlined" />
                    <Chip label={`Account ${selectedProject.target_account_id}`} variant="outlined" />
                  </Stack>
                </Stack>
              </Card>

              {canAuthor && (
                <Card sx={{ p: 2 }}>
                  <Typography variant="h6">Add migration wave</Typography>
                  <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={12} md={6}><TextField label="Wave name" value={waveForm.name} onChange={updateWave('name')} fullWidth required /></Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Migration method</InputLabel>
                        <Select label="Migration method" value={waveForm.migration_method} onChange={updateWave('migration_method')}>
                          <MenuItem value="mgn">AWS MGN continuous replication</MenuItem>
                          <MenuItem value="ami-copy">AMI / snapshot copy</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}><TextField label="Source AWS Region" value={waveForm.source_region} onChange={updateWave('source_region')} fullWidth required={selectedProject.source_type === 'aws-ec2'} /></Grid>
                    <Grid item xs={12} md={6}><TextField label="Target Region override" value={waveForm.target_region} onChange={updateWave('target_region')} fullWidth helperText="Blank uses Environment Catalog" /></Grid>
                    <Grid item xs={12}><TextField label="Maintenance / cutover window" value={waveForm.maintenance_window} onChange={updateWave('maintenance_window')} fullWidth /></Grid>
                    <Grid item xs={12}><TextField label="Source server or EC2 instance IDs" value={waveForm.workload_refs} onChange={updateWave('workload_refs')} fullWidth multiline minRows={3} helperText="One per line or comma-separated" required /></Grid>
                    <Grid item xs={12}>
                      <Button variant="contained" disabled={busy === 'wave' || !waveForm.name || !workloads.length || (selectedProject.source_type === 'aws-ec2' && !waveForm.source_region)} onClick={handleCreateWave}>
                        Save wave
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              )}

              {(selectedProject.waves || []).map((wave) => (
                <Card key={wave.id} sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="h6">{wave.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {wave.migration_method} · {wave.source_region || 'external'} → {wave.target_region} · {wave.workloads.length} workload(s)
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={wave.status} color={wave.status === 'APPROVED' ? 'success' : wave.status === 'PLANNED' ? 'primary' : 'default'} />
                      <Chip label={`Plan v${wave.plan_version}`} variant="outlined" />
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <CheckList plan={wave.plan} />
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {canAuthor && (
                      <Button variant="outlined" disabled={Boolean(busy)} onClick={() => mutateWave('plan', () => planMigrationWave(wave.id, wave.plan_version))}>
                        {wave.plan_version ? 'Regenerate plan' : 'Generate plan'}
                      </Button>
                    )}
                    {canApprove && wave.status === 'PLANNED' && (
                      <Button variant="contained" color="success" disabled={Boolean(busy)} onClick={() => mutateWave('approve', () => approveMigrationWave(wave.id, wave.plan_version, 'Approved in Cloud Migration Factory'))}>
                        Approve plan
                      </Button>
                    )}
                  </Stack>
                  {wave.approved_by && <Typography variant="caption" color="text.secondary">Approved by {wave.approved_by}</Typography>}
                </Card>
              ))}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default CloudMigrationPage;
