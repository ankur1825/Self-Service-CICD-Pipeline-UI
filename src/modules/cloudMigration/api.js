import { callBackend } from '../../services/api';

export const getCloudMigrationCapabilities = () => callBackend('/cloud-migration/capabilities');
export const getMigrationProjects = () => callBackend('/cloud-migration/projects');
export const createMigrationProject = (payload) => callBackend('/cloud-migration/projects', 'POST', payload);
export const getMigrationProject = (projectId) => callBackend(`/cloud-migration/projects/${projectId}`);
export const createMigrationWave = (projectId, payload) => callBackend(`/cloud-migration/projects/${projectId}/waves`, 'POST', payload);
export const planMigrationWave = (waveId, expectedVersion) => callBackend(`/cloud-migration/waves/${waveId}/plan`, 'POST', { expected_version: expectedVersion });
export const approveMigrationWave = (waveId, expectedVersion, comment = '') => callBackend(`/cloud-migration/waves/${waveId}/approve`, 'POST', {
  expected_version: expectedVersion,
  comment,
});
