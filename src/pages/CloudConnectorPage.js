import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Container, FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { callBackend } from '../services/api';

const DEFAULT_ENVIRONMENTS = [
  {
    name: 'DEV',
    display_name: 'Development',
    account_tier: 'nonprod',
    aws_account_id: '',
    aws_region: 'us-east-1',
    ecr_registry: '',
    ecr_repository_template: '{project_name}',
    artifact_bucket: '',
    client_aws_role_arn: '',
    nonprod_aws_role_arn: '',
    source_aws_role_arn: '',
    target_aws_role_arn: '',
    cluster_name: '',
    namespace_strategy: 'auto',
    namespace_template: '{client_id}-{project_name}-{env}',
    sns_topic_arn: '',
    is_active: true,
  },
  {
    name: 'QA',
    display_name: 'Quality Assurance',
    account_tier: 'nonprod',
    aws_account_id: '',
    aws_region: 'us-east-1',
    ecr_registry: '',
    ecr_repository_template: '{project_name}',
    artifact_bucket: '',
    client_aws_role_arn: '',
    nonprod_aws_role_arn: '',
    source_aws_role_arn: '',
    target_aws_role_arn: '',
    cluster_name: '',
    namespace_strategy: 'auto',
    namespace_template: '{client_id}-{project_name}-{env}',
    sns_topic_arn: '',
    is_active: true,
  },
  {
    name: 'STAGE',
    display_name: 'Stage',
    account_tier: 'nonprod',
    aws_account_id: '',
    aws_region: 'us-east-1',
    ecr_registry: '',
    ecr_repository_template: '{project_name}',
    artifact_bucket: '',
    client_aws_role_arn: '',
    nonprod_aws_role_arn: '',
    source_aws_role_arn: '',
    target_aws_role_arn: '',
    cluster_name: '',
    namespace_strategy: 'auto',
    namespace_template: '{client_id}-{project_name}-{env}',
    sns_topic_arn: '',
    is_active: true,
  },
  {
    name: 'PROD',
    display_name: 'Production',
    account_tier: 'prod',
    aws_account_id: '',
    aws_region: 'us-east-1',
    ecr_registry: '',
    ecr_repository_template: '{project_name}',
    artifact_bucket: '',
    client_aws_role_arn: '',
    nonprod_aws_role_arn: '',
    source_aws_role_arn: '',
    target_aws_role_arn: '',
    cluster_name: '',
    namespace_strategy: 'auto',
    namespace_template: '{client_id}-{project_name}-{env}',
    sns_topic_arn: '',
    is_active: true,
  },
];

const ENVIRONMENT_NAMES = ['DEV', 'QA', 'STAGE', 'PROD'];

const mergeWithDefaults = (loaded = []) => {
  const byName = new Map(loaded.map((environment) => [environment.name, environment]));
  return DEFAULT_ENVIRONMENTS.map((environment) => ({
    ...environment,
    ...(byName.get(environment.name) || {}),
    account_tier: environment.name === 'PROD' ? 'prod' : 'nonprod',
  }));
};

function CloudConnectorPage() {
  const [environments, setEnvironments] = useState(DEFAULT_ENVIRONMENTS);
  const [selectedName, setSelectedName] = useState('DEV');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => environments.find((environment) => environment.name === selectedName) || environments[0] || DEFAULT_ENVIRONMENTS[0],
    [environments, selectedName],
  );
  const isProd = selected.name === 'PROD';

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const data = await callBackend('/environment-catalog', 'GET');
        const next = mergeWithDefaults(data?.environments || []);
        setEnvironments(next);
        setSelectedName(next[0]?.name || 'DEV');
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Environment Catalog.');
      }
    };
    loadCatalog();
  }, []);

  const updateSelected = (field, value) => {
    setEnvironments((prev) => prev.map((environment) => (
      environment.name === selected.name ? { ...environment, [field]: value } : environment
    )));
  };

  const updateDeployRole = (value) => {
    setEnvironments((prev) => prev.map((environment) => {
      if (environment.name !== selected.name) return environment;
      return {
        ...environment,
        nonprod_aws_role_arn: value,
        client_aws_role_arn: environment.client_aws_role_arn || value,
        source_aws_role_arn: environment.source_aws_role_arn || value,
        target_aws_role_arn: environment.target_aws_role_arn || value,
      };
    }));
  };

  const validateSelected = () => {
    const common = [
      ['display_name', 'Display Name'],
      ['aws_account_id', 'AWS Account ID'],
      ['aws_region', 'AWS Region'],
      ['ecr_registry', 'ECR Registry / Account ID'],
      ['ecr_repository_template', 'ECR Repository Template'],
      ['artifact_bucket', 'Artifact Bucket'],
      ['cluster_name', 'EKS Cluster Name'],
      ['namespace_template', 'Namespace Template'],
    ];
    const prodOnly = [
      ['source_aws_role_arn', 'Source AWS Role ARN'],
      ['target_aws_role_arn', 'Target AWS Role ARN'],
    ];
    const nonProdOnly = [['nonprod_aws_role_arn', 'Deployment Role ARN']];
    const checks = [...common, ...(isProd ? prodOnly : nonProdOnly)];
    return checks.filter(([field]) => !(selected[field] || '').toString().trim()).map(([, label]) => label);
  };

  const handleSave = async () => {
    setError('');
    setMessage('');
    const missing = validateSelected();
    if (missing.length) {
      setError(`Missing required fields: ${missing.join(', ')}`);
      return;
    }

    try {
      const payload = {
        ...selected,
        account_tier: isProd ? 'prod' : 'nonprod',
        sns_topic_arn: '',
      };
      const result = await callBackend('/environment-catalog', 'POST', { environments: [payload] });
      setEnvironments(mergeWithDefaults(result.environments || environments));
      setMessage(`${selected.name} environment saved. Pipeline forms now resolve infrastructure from the backend catalog.`);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save Environment Catalog.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Environment Catalog</Typography>
      <Typography variant="body2" color="text.secondary">
        Server-side account, role, cluster, namespace, artifact, and release mapping used by pipeline requests.
      </Typography>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Card sx={{ p: 2, mt: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select label="Environment" value={selectedName} onChange={(event) => setSelectedName(event.target.value)}>
                {ENVIRONMENT_NAMES.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Display Name" value={selected.display_name || ''} onChange={(e) => updateSelected('display_name', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="AWS Account ID" value={selected.aws_account_id || ''} onChange={(e) => updateSelected('aws_account_id', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="AWS Region" value={selected.aws_region || ''} onChange={(e) => updateSelected('aws_region', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="ECR Registry / Account ID" value={selected.ecr_registry || ''} onChange={(e) => updateSelected('ecr_registry', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="ECR Repository Template" value={selected.ecr_repository_template || ''} onChange={(e) => updateSelected('ecr_repository_template', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Artifact Bucket" value={selected.artifact_bucket || ''} onChange={(e) => updateSelected('artifact_bucket', e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="EKS Cluster Name" value={selected.cluster_name || ''} onChange={(e) => updateSelected('cluster_name', e.target.value)} fullWidth required />
          </Grid>

          {!isProd && (
            <Grid item xs={12}>
              <TextField label="Deployment Role ARN" value={selected.nonprod_aws_role_arn || ''} onChange={(e) => updateDeployRole(e.target.value)} fullWidth required />
            </Grid>
          )}

          {isProd && (
            <>
              <Grid item xs={12}>
                <TextField label="Client AWS Role ARN" value={selected.client_aws_role_arn || ''} onChange={(e) => updateSelected('client_aws_role_arn', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Source AWS Role ARN" value={selected.source_aws_role_arn || ''} onChange={(e) => updateSelected('source_aws_role_arn', e.target.value)} fullWidth required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Target AWS Role ARN" value={selected.target_aws_role_arn || ''} onChange={(e) => updateSelected('target_aws_role_arn', e.target.value)} fullWidth required />
              </Grid>
            </>
          )}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Namespace Strategy</InputLabel>
              <Select label="Namespace Strategy" value={selected.namespace_strategy || 'auto'} onChange={(e) => updateSelected('namespace_strategy', e.target.value)}>
                <MenuItem value="auto">Auto per app/environment</MenuItem>
                <MenuItem value="manual">Manual override per request</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Namespace Template" value={selected.namespace_template || ''} onChange={(e) => updateSelected('namespace_template', e.target.value)} fullWidth required />
          </Grid>
        </Grid>
      </Card>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave}>Save Environment</Button>
      </Stack>
    </Container>
  );
}

export default CloudConnectorPage;
