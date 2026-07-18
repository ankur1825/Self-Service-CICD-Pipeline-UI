import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { canApproveCloudMigration, canAuthorCloudMigration } from '../../utils/authz';
import {
  approveMigrationExecution,
  getMigrationEvidence,
  getMigrationExecutionJobs,
  requestMigrationExecution,
} from './api';

const ACTIVE_STATUSES = new Set(['AWAITING_APPROVAL', 'QUEUED', 'RUNNING']);
const MUTATING_ACTIONS = new Set([
  'start-test', 'finalize-test', 'start-cutover', 'rollback', 'finalize-cutover',
]);

const ACTIONS = [
  { key: 'preflight', label: 'Run preflight', states: ['APPROVED', 'TEST_READY', 'TEST_IN_PROGRESS', 'CUTOVER_READY', 'CUTOVER_IN_PROGRESS'] },
  { key: 'reconcile', label: 'Reconcile MGN', states: ['APPROVED', 'TEST_READY', 'TEST_IN_PROGRESS', 'CUTOVER_READY', 'CUTOVER_IN_PROGRESS', 'FINALIZED'] },
  { key: 'start-test', label: 'Launch test', states: ['TEST_READY'] },
  { key: 'finalize-test', label: 'Finalize test', states: ['TEST_IN_PROGRESS'] },
  { key: 'start-cutover', label: 'Start cutover', states: ['CUTOVER_READY'] },
  { key: 'rollback', label: 'Roll back', states: ['TEST_IN_PROGRESS', 'CUTOVER_READY', 'CUTOVER_IN_PROGRESS'] },
  { key: 'finalize-cutover', label: 'Finalize cutover', states: ['CUTOVER_IN_PROGRESS'] },
];

const statusColor = (status) => ({
  SUCCEEDED: 'success', FAILED: 'error', RUNNING: 'primary', QUEUED: 'info', AWAITING_APPROVAL: 'warning',
}[status] || 'default');

const errorMessage = (error, fallback) => error?.body?.detail || error?.message || fallback;

const idempotencyKey = (action) => {
  const unique = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `ui:${action}:${unique}`;
};

function WaveExecutionPanel({ wave, executionMode, onWaveChanged }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const actor = String(user?.email || user?.username || '').toLowerCase();
  const canAuthor = canAuthorCloudMigration(user);
  const canApprove = canApproveCloudMigration(user);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tcpHosts, setTcpHosts] = useState('mock-mgn-replication.local');
  const [approvalJob, setApprovalJob] = useState(null);
  const [approvalText, setApprovalText] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [evidence, setEvidence] = useState(null);

  const loadJobs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const result = await getMigrationExecutionJobs(wave.id);
      setJobs(result?.jobs || []);
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load execution jobs.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [wave.id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const hasActiveJob = useMemo(
    () => jobs.some((job) => ACTIVE_STATUSES.has(job.status)),
    [jobs],
  );

  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const timer = window.setInterval(async () => {
      await loadJobs(true);
      onWaveChanged();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, loadJobs, onWaveChanged]);

  const requestAction = async (action) => {
    const mutating = MUTATING_ACTIONS.has(action);
    if (mutating && !window.confirm(
      `Request ${action.replaceAll('-', ' ')} for wave "${wave.name}"? A different approver must authorize it before execution.`,
    )) return;
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const payload = {
        tcp1500_hosts: action === 'preflight'
          ? tcpHosts.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
          : [],
        terminate_instances: true,
        rollback_to: 'ready-for-test',
      };
      const job = await requestMigrationExecution(
        wave.id,
        action,
        payload,
        idempotencyKey(action),
      );
      setMessage(
        job.status === 'AWAITING_APPROVAL'
          ? `${job.action} requested. A different migration approver must authorize job ${job.id}.`
          : `${job.action} queued for the client-hosted worker.`,
      );
      await loadJobs(true);
    } catch (requestError) {
      setError(errorMessage(requestError, `Unable to request ${action}.`));
    } finally {
      setBusy('');
    }
  };

  const openApproval = (job) => {
    setApprovalJob(job);
    setApprovalText('');
    setApprovalComment('');
  };

  const approveJob = async () => {
    setBusy(`approve-${approvalJob.id}`);
    setError('');
    try {
      await approveMigrationExecution(
        approvalJob.id,
        approvalJob.version,
        approvalText,
        approvalComment,
      );
      setApprovalJob(null);
      setMessage(`${approvalJob.action} approved and queued for execution.`);
      await loadJobs(true);
    } catch (approvalError) {
      setError(errorMessage(approvalError, 'Unable to approve execution job.'));
    } finally {
      setBusy('');
    }
  };

  const viewEvidence = async (evidenceId) => {
    setBusy(`evidence-${evidenceId}`);
    try {
      setEvidence(await getMigrationEvidence(evidenceId));
    } catch (evidenceError) {
      setError(errorMessage(evidenceError, 'Unable to load evidence.'));
    } finally {
      setBusy('');
    }
  };

  const allowedActions = ACTIONS.filter((action) => action.states.includes(wave.status));
  const activeMutation = jobs.find(
    (job) => ACTIVE_STATUSES.has(job.status) && !['PREFLIGHT', 'RECONCILE'].includes(job.action),
  );
  const expectedApproval = approvalJob ? `${approvalJob.action} ${wave.id}` : '';

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Migration execution</Typography>
          <Typography variant="body2" color="text.secondary">
            Client-hosted worker · {executionMode === 'mock' ? 'simulation only' : 'real AWS execution'}
          </Typography>
        </Box>
        <Button size="small" onClick={() => { loadJobs(); onWaveChanged(); }}>Refresh</Button>
      </Stack>

      {executionMode === 'mock' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          MOCK MODE: lifecycle, approvals, rollback, and evidence are real product workflows; AWS and network operations are simulated.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mt: 1 }}>{message}</Alert>}

      {canAuthor && wave.approved_by && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {allowedActions.some((action) => action.key === 'preflight') && (
            <TextField
              size="small"
              label="MGN replication targets for TCP 1500 preflight"
              value={tcpHosts}
              onChange={(event) => setTcpHosts(event.target.value)}
              helperText={executionMode === 'mock' ? 'Recorded as simulated targets; no connection is attempted.' : 'One hostname or IP per line.'}
              multiline
            />
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {allowedActions.map((action) => (
              <Button
                key={action.key}
                size="small"
                variant={MUTATING_ACTIONS.has(action.key) ? 'contained' : 'outlined'}
                color={action.key === 'rollback' ? 'warning' : action.key.includes('cutover') ? 'error' : 'primary'}
                disabled={Boolean(busy) || (MUTATING_ACTIONS.has(action.key) && Boolean(activeMutation))}
                onClick={() => requestAction(action.key)}
              >
                {busy === action.key ? <CircularProgress size={18} /> : action.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      )}

      <TableContainer sx={{ mt: 2, maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell><TableCell>Status</TableCell><TableCell>Requester / approver</TableCell>
              <TableCell>Evidence</TableCell><TableCell>Control</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => {
              const selfRequested = String(job.requested_by || '').toLowerCase() === actor;
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{job.action}</Typography>
                    <Typography variant="caption" color="text.secondary">attempt {job.attempts}/{job.max_attempts}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={job.status} color={statusColor(job.status)} /></TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">By {job.requested_by}</Typography>
                    {job.approved_by && <Typography variant="caption" display="block">Approved {job.approved_by}</Typography>}
                    {job.error_message && <Typography variant="caption" color="error">{job.error_message}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(job.evidence || []).map((item) => (
                        <Button key={item.id} size="small" onClick={() => viewEvidence(item.id)}>
                          {item.evidence_type}
                        </Button>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {job.status === 'AWAITING_APPROVAL' && canApprove && (
                      <Button size="small" variant="contained" color="success" disabled={selfRequested || Boolean(busy)} onClick={() => openApproval(job)}>
                        {selfRequested ? 'Separate approver required' : 'Review & approve'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!jobs.length && !loading && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No execution jobs yet.</Typography></TableCell></TableRow>
            )}
            {loading && (
              <TableRow><TableCell colSpan={5}><CircularProgress size={22} /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(approvalJob)} onClose={() => setApprovalJob(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve controlled migration action</DialogTitle>
        <DialogContent>
          <Alert severity={approvalJob?.action === 'FINALIZE_CUTOVER' ? 'error' : 'warning'} sx={{ mb: 2 }}>
            This authorization is recorded in the client audit trail. In mock mode it changes simulated state only.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>Type exactly: <strong>{expectedApproval}</strong></Typography>
          <TextField autoFocus fullWidth label="Approval confirmation" value={approvalText} onChange={(event) => setApprovalText(event.target.value)} />
          <TextField fullWidth label="CAB / change comment" value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalJob(null)}>Cancel</Button>
          <Button variant="contained" color="success" disabled={approvalText !== expectedApproval || Boolean(busy)} onClick={approveJob}>Approve & queue</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(evidence)} onClose={() => setEvidence(null)} maxWidth="md" fullWidth>
        <DialogTitle>Migration evidence</DialogTitle>
        <DialogContent>
          {evidence && (
            <Stack spacing={1}>
              <Alert severity={evidence.integrity_verified ? 'success' : 'error'}>
                SHA-256 integrity {evidence.integrity_verified ? 'verified' : 'FAILED'} · {evidence.content_sha256}
              </Alert>
              <Box component="pre" sx={{ p: 2, bgcolor: 'grey.950', color: 'grey.100', overflow: 'auto', borderRadius: 1, fontSize: 12 }}>
                {JSON.stringify(evidence.payload, null, 2)}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setEvidence(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export default WaveExecutionPanel;
