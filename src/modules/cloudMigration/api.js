import { callBackend } from '../../services/api';

export const getCloudMigrationCapabilities = () => callBackend('/cloud-migration/capabilities');
export const getMigrationCompatibility = (sourceType, targetProvider = 'aws', strategy = 'rehost') => {
  const query = new URLSearchParams({
    source_type: sourceType,
    target_provider: targetProvider,
    strategy,
  });
  return callBackend(`/cloud-migration/compatibility?${query.toString()}`);
};
export const getMigrationProjects = () => callBackend('/cloud-migration/projects');
export const createMigrationProject = (payload) => callBackend('/cloud-migration/projects', 'POST', payload);
export const getMigrationProject = (projectId) => callBackend(`/cloud-migration/projects/${projectId}`);
export const createMigrationWave = (projectId, payload) => callBackend(`/cloud-migration/projects/${projectId}/waves`, 'POST', payload);
export const planMigrationWave = (waveId, expectedVersion) => callBackend(`/cloud-migration/waves/${waveId}/plan`, 'POST', { expected_version: expectedVersion });
export const approveMigrationWave = (waveId, expectedVersion, comment = '') => callBackend(`/cloud-migration/waves/${waveId}/approve`, 'POST', {
  expected_version: expectedVersion,
  comment,
});
export const getMigrationExecutionHealth = () => callBackend('/cloud-migration/execution/health');
export const getMigrationExecutionJobs = (waveId) => callBackend(`/cloud-migration/waves/${waveId}/jobs`);
export const requestMigrationExecution = (waveId, action, payload, idempotencyKey) => callBackend(
  `/cloud-migration/waves/${waveId}/jobs/${action}`,
  'POST',
  payload,
  { 'Idempotency-Key': idempotencyKey },
);
export const approveMigrationExecution = (jobId, expectedVersion, confirmation, comment = '') => callBackend(
  `/cloud-migration/jobs/${jobId}/approve`,
  'POST',
  { expected_version: expectedVersion, confirmation, comment },
);
export const getMigrationEvidence = (evidenceId) => callBackend(`/cloud-migration/evidence/${evidenceId}`);
