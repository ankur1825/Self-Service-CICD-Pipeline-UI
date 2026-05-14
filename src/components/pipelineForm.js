import { useState, useEffect, useMemo } from 'react';
import {
  Container, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Button, Typography, Box, Card, Grid,
  Snackbar, Alert, Divider, Chip, Stack, FormHelperText, InputAdornment, Tooltip, IconButton, ListSubheader
} from '@mui/material';
import {
  CloudOutlined, StorageOutlined, RouteOutlined, HealthAndSafetyOutlined,
  ShieldOutlined, MonetizationOnOutlined, InfoOutlined, DeleteOutline, Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { callBackend } from '../services/api';
import { getCloudConfig, getEnterprisePayload } from '../utils/enterpriseConfig';

/* -------------------- Constants -------------------- */
const SERVICE_OPTIONS = [
  { type: 'header', label: 'Horizon Secure SDLC Platform' },
  { value: 'Devops Pipeline', label: 'Build & Deploy Pipeline' },
  { value: 'Test Devops Pipeline', label: 'Validation Pipeline' },
  { value: 'Prod Devops Pipeline', label: 'Production Release Pipeline' },
  { type: 'header', label: 'Enterprise Cloud Operations' },
  { value: 'Multi-Cloud Deployment Manager', label: 'Cloud Deployment Manager' },
  { value: 'AI-Driven Monitoring & Incident Response', label: 'AIOps Monitoring & Incident Response' },
  { value: 'Cloud Cost Optimization Platform', label: 'Cloud FinOps Optimization' },
  { value: 'Cloud Migration', label: 'Cloud Migration Factory' },
];

const SERVICE_LABELS = SERVICE_OPTIONS
  .filter((option) => option.value)
  .reduce((labels, option) => ({ ...labels, [option.value]: option.label }), {});

const AWS_SERVICES = ['EC2', 'Security Group', 'S3 Bucket', 'IAM Role', 'RDS'];

const BLUEPRINTS = [
  'EC2 Lift-and-Shift',
  'DB to RDS/Aurora',
  'Files to EFS/FSx',
  'Refactor to EKS',
];

const PROVIDERS = [
  { key: 'AWS',   value: 'aws',   enabled: true  },
  { key: 'Azure', value: 'azure', enabled: false },
  { key: 'GCP',   value: 'gcp',   enabled: false },
  { key: 'Oracle',value: 'oci',   enabled: false },
];

const SOURCE_TYPES = [
  { key: 'AWS EC2 (other region/account)', value: 'aws-ec2' },
  { key: 'External (on-prem/other cloud)', value: 'external' },
];

// TODO: wire tenant/account context from session later
const TENANT_ID = 'demo';

/* ------- Local fallback price map (On-Demand Linux/Shared in us-east-1 approx) ------- */
const PRICE_FALLBACK = {
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  'm6i.large': 0.096,
  'm6i.xlarge': 0.192,
};

const PROJECT_TYPES = ['Docker', 'Angular', 'SpringBoot', 'SpringBoot-Java11', 'NodeJs', 'WebComponent'];
const REPO_TYPES = ['GitHub', 'BitBucket', 'CodeCommit', 'S3'];
const TARGET_ENVS = ['DEV', 'QA', 'STAGE'];
const PROD_TARGET_ENVS = ['PROD'];
const PIPELINE_FORM_SX = { width: '100%', maxWidth: 960 };
const DEVOPS_PANEL_SX = {
  p: 2.25,
  mb: 2.25,
  border: '1px solid #222',
  borderRadius: 0,
  boxShadow: 'none',
  width: '100%',
  maxWidth: 960,
};
const DEVOPS_FIELD_SX = {
  '& .MuiInputBase-root': { minHeight: 42, fontSize: 14 },
  '& .MuiInputLabel-root': { fontSize: 13 },
  '& .MuiFormHelperText-root': { fontSize: 12 },
};

const readinessRequiresAttention = (preflight) => preflight?.enforcement_enabled && preflight?.ready === false;

/* -------------------- Small utils -------------------- */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const parseCSV = (str) =>
  (str || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const parseTags = (str) => {
  const entries = (str || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  const out = {};
  entries.forEach((kv) => {
    const [k, v] = kv.split('=');
    if (k && v !== undefined) out[k.trim()] = v.trim();
  });
  return out;
};

const parseKVMap = (text) => {
  const map = {};
  (text || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [k, v] = line.split('=').map((s) => s.trim());
      if (k && v) map[k] = v;
    });
  return map;
};

const formatUsdPerHour = (n) =>
  Number.isFinite(n) ? `$${n.toFixed(4)} /hr` : '—';

/* -------------------- Placement Card -------------------- */
function PlacementCard({
  idx,
  placement,
  onChange,
  onRemove,
  regions,
  instanceTypesForRegion,
  requestEstimate, // (idx, { region, type, id })
  costHint
}) {
  const provMeta = PROVIDERS.find(p => p.value === placement.provider) || PROVIDERS[0];
  const isAWS = placement.provider === 'aws';
  const instanceTypes = isAWS ? (instanceTypesForRegion[placement.region] || []) : [];

  const handle = (field) => (e) => onChange(idx, field, e.target.value);
  const handleSwitch = (field) => (e) => onChange(idx, field, e.target.checked);

  return (
    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Placement #{idx + 1}</Typography>
        <IconButton aria-label="remove placement" onClick={() => onRemove(idx)} disabled={idx === 0}>
          <DeleteOutline />
        </IconButton>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Provider</InputLabel>
            <Select
              label="Provider"
              value={placement.provider}
              onChange={(e) => onChange(idx, 'provider', e.target.value)}
            >
              {PROVIDERS.map(p => (
                <MenuItem key={p.value} value={p.value} disabled={!p.enabled}>
                  {p.key}{!p.enabled ? ' (soon)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Account Ref (from Tenant/Accounts registry)"
            value={placement.account_ref}
            onChange={handle('account_ref')}
            placeholder={isAWS ? '426946630837 or aws-prod' : 'my-azure-subscription'}
          />
        </Grid>

        {/* Region */}
        <Grid item xs={12} md={4}>
          {isAWS ? (
            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select
                value={placement.region}
                label="Region"
                onChange={(e) => {
                  onChange(idx, 'region', e.target.value);
                  if (placement.default_instance_type) {
                    requestEstimate(idx, { region: e.target.value, type: placement.default_instance_type, id: placement.id });
                  }
                }}
              >
                <MenuItem value="">Select Region</MenuItem>
                {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Region"
              value={placement.region}
              onChange={handle('region')}
              placeholder={provMeta.key === 'Azure' ? 'eastus' : provMeta.key === 'GCP' ? 'us-central1' : 'us-ashburn-1'}
            />
          )}
        </Grid>

        {/* Network */}
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="VPC/VNet ID"
            value={placement.vpc_or_vnet_id}
            onChange={handle('vpc_or_vnet_id')}
            placeholder={isAWS ? 'vpc-0abc123' : provMeta.key === 'Azure' ? '/subscriptions/.../vnet' : ''}
            InputProps={{ startAdornment: <InputAdornment position="start"><RouteOutlined /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Private Subnet IDs (comma or newline)"
            value={placement.private_subnets_text}
            onChange={handle('private_subnets_text')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Security Group/NSG IDs (comma or newline)"
            value={placement.security_group_ids_text}
            onChange={handle('security_group_ids_text')}
            InputProps={{ startAdornment: <InputAdornment position="start"><ShieldOutlined /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Health Check Path"
            value={placement.health_check_path}
            onChange={handle('health_check_path')}
            InputProps={{ startAdornment: <InputAdornment position="start"><HealthAndSafetyOutlined /></InputAdornment> }}
            helperText="HTTP 200 expected"
          />
        </Grid>

        {/* Source (what are we migrating *from*) */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Chip label="Source" /></Divider>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={placement.source_type}
              label="Source Type"
              onChange={(e) => onChange(idx, 'source_type', e.target.value)}
            >
              {SOURCE_TYPES.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.key}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* When source is another AWS EC2 (inter-region / cross-account) */}
        {placement.source_type === 'aws-ec2' && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Source Account Ref (tenant registry)"
                value={placement.source_account_ref}
                onChange={(e) => onChange(idx, 'source_account_ref', e.target.value)}
                placeholder="aws-prod, 123456789012"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Source Region</InputLabel>
                <Select
                  value={placement.source_region}
                  label="Source Region"
                  onChange={(e) => onChange(idx, 'source_region', e.target.value)}
                >
                  <MenuItem value="">Select Region</MenuItem>
                  {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Source Server IDs / Names (comma or newline)"
                value={placement.source_server_ids_text}
                onChange={(e) => onChange(idx, 'source_server_ids_text', e.target.value)}
                placeholder="i-0abc..., i-0def...  or  app01,app02"
              />
            </Grid>
          </>
        )}

        {/* When source is external (on-prem / other cloud) */}
        {placement.source_type === 'external' && (
          <>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Source OS</InputLabel>
                <Select
                  value={placement.source_os}
                  label="Source OS"
                  onChange={(e) => onChange(idx, 'source_os', e.target.value)}
                >
                  <MenuItem value="LINUX">LINUX</MenuItem>
                  <MenuItem value="WINDOWS">WINDOWS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={placement.replicate_all_data}
                    onChange={(e) => onChange(idx, 'replicate_all_data', e.target.checked)}
                  />
                }
                label="Replicate all disks/data"
              />
              <FormHelperText>Agent will replicate all attached disks unless excluded in template.</FormHelperText>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormHelperText>
                MGN agent will be required; Jenkins plan will output install steps per OS.
              </FormHelperText>
            </Grid>
          </>
        )}

        {/* Compute */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Chip label="Compute" /></Divider>
        </Grid>
        <Grid item xs={12} md={6}>
          {isAWS ? (
            <FormControl fullWidth>
              <InputLabel>Default Instance Type</InputLabel>
              <Select
                value={placement.default_instance_type}
                label="Default Instance Type"
                onChange={(e) => {
                  onChange(idx, 'default_instance_type', e.target.value);
                  if (placement.region) {
                    requestEstimate(idx, { region: placement.region, type: e.target.value, id: placement.id });
                  }
                }}
              >
                <MenuItem value="">Select Instance Type</MenuItem>
                {instanceTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Default Instance Type"
              value={placement.default_instance_type}
              onChange={handle('default_instance_type')}
              placeholder={provMeta.key === 'Azure' ? 'Standard_D4s_v5' : provMeta.key === 'GCP' ? 'e2-standard-4' : 'VM.Standard3.Flex(4,16)'}
            />
          )}
        </Grid>
        <Grid item xs={12} md={6} display="flex" alignItems="center">
          <Typography variant="body1">
            <MonetizationOnOutlined sx={{ mr: 1, mb: -0.5 }} />
            <b>Estimated Cost:</b> {isAWS ? (costHint || '—') : '—'}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Per-Target Instance Types (one per line, e.g. "app01=m6i.large")'
            value={placement.per_target_type_text}
            onChange={handle('per_target_type_text')}
            placeholder="app01=m6i.large"
          />
          <FormHelperText>Targets without an explicit type will use the default.</FormHelperText>
        </Grid>

        {/* Cutover */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Chip label="Cutover" /></Divider>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Strategy</InputLabel>
            <Select
              value={placement.cutover_strategy}
              label="Strategy"
              onChange={handle('cutover_strategy')}
            >
              <MenuItem value="blue-green">Blue/Green</MenuItem>
              <MenuItem value="in-place">In-place</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Smoke Test URL (optional)"
            value={placement.smoke_test_url}
            onChange={handle('smoke_test_url')}
            placeholder="https://app.domain.com/healthz"
          />
        </Grid>

        {/* Backup */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}><Chip label="Backup" /></Divider>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={<Switch checked={placement.backup_enabled} onChange={handleSwitch('backup_enabled')} />}
            label="Attach Backup Plan"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Copy to Region (optional)"
            value={placement.backup_copy_to_region}
            onChange={handle('backup_copy_to_region')}
            placeholder={isAWS ? 'us-west-2' : ''}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Tags (Key=Value, comma separated)"
            value={placement.tags_text}
            onChange={handle('tags_text')}
            placeholder="App=demo,Env=prod,Backup=true"
          />
        </Grid>
      </Grid>
    </Card>
  );
}

/* -------------------- Component -------------------- */
function PipelineForm() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const savedCloudConfig = getCloudConfig();

  const [environmentCatalog, setEnvironmentCatalog] = useState([]);
  const [formData, setFormData] = useState({
    // generic
    service: '',

    // CI/CD
    productGroup: '',
    project_name: '',
    app_type: '',
    repo_url: '',
    branch: '',
    sonarQubeEnabled: false,
    opaScanEnabled: false,
    trivyScanEnabled: false,

    // Multi-Cloud (existing)
    organization: '',
    businessUnit: '',
    mcTopServiceType: '',
    mcResourceType: '',
    region: '',
    instanceType: '',
    vpcId: '',
    securityGroup: '',
    ami: '',
    subnetId: '',
    tpmEmail: '',
    sysOwnerEmail: '',

    // Cloud Migration (wave)
    cloudBlueprint: 'EC2 Lift-and-Shift',
    waveName: 'Wave-1',
    maintenanceWindow: '',
    targetsText: 'app01,app02',
  });

  // NEW: Devops Pipeline form state
  const [devopsForm, setDevopsForm] = useState({
    project_name: '',
    project_type: '',       // Docker | Angular | SpringBoot | SpringBoot-Java11 | NodeJs | WebComponent
    repo_type: 'GitHub',
    repo_url: '',
    branch: 'main',
    qg_sonarqube: false,
    qg_checkmarx: false,
    checkmarx_team: '',
    qg_jmeter: false,
    qg_selenium: false,
    qg_newman: false,
    target_env: 'DEV',
    notify_email: user?.email || (user?.username ? `${user.username}@horizonrelevance.com` : ''),
    additional_notify_emails: '',
    aws_region: savedCloudConfig.aws_region || 'us-east-1',
    ecr_registry: savedCloudConfig.ecr_registry || '',
    ecr_repository: '',
    artifact_bucket: savedCloudConfig.artifact_bucket || '',
    client_aws_role_arn: savedCloudConfig.client_aws_role_arn || '',
    nonprod_aws_role_arn: savedCloudConfig.nonprod_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    target_aws_role_arn: savedCloudConfig.target_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    dev_cluster_name: savedCloudConfig.dev_cluster_name || '',
    qa_cluster_name: savedCloudConfig.qa_cluster_name || '',
    stage_cluster_name: savedCloudConfig.stage_cluster_name || '',
    prod_cluster_name: savedCloudConfig.prod_cluster_name || '',
    namespace_strategy: savedCloudConfig.namespace_strategy || 'auto',
    app_namespace: '',
    dev_namespace: '',
    qa_namespace: '',
    stage_namespace: '',
    prod_namespace: '',
    enable_notifications: false,
    sns_topic_arn: savedCloudConfig.sns_topic_arn || '',
  });

  const [testDevopsForm, setTestDevopsForm] = useState({
    project_name: '',
    project_type: '',
    repo_type: 'GitHub',
    repo_url: '',
    branch: 'main',
    qg_sonarqube: false,
    qg_checkmarx: false,
    checkmarx_team: '',
    qg_trivy: false,
    qg_opa: false,
    qg_jmeter: false,
    qg_selenium: false,
    qg_newman: false,
    image_uri: '',
    target_app_url: '',
    api_base_url: '',
    jmeter_test_plan: '',
    jmeter_threads: '10',
    jmeter_ramp_seconds: '30',
    jmeter_loops: '5',
    jmeter_max_error_percent: '1',
    jmeter_max_avg_ms: '2000',
    jmeter_max_p95_ms: '5000',
    newman_collection_path: 'tests/api/horizon-demo-api.collection.json',
    newman_environment_path: 'tests/api/qa.environment.json',
    newman_data_file: '',
    newman_timeout_ms: '30000',
    newman_fail_on_error: true,
    target_env: 'QA',
    notify_email: user?.email || (user?.username ? `${user.username}@horizonrelevance.com` : ''),
    additional_notify_emails: '',
    aws_region: savedCloudConfig.aws_region || 'us-east-1',
    artifact_bucket: savedCloudConfig.artifact_bucket || '',
    client_aws_role_arn: savedCloudConfig.client_aws_role_arn || '',
    nonprod_aws_role_arn: savedCloudConfig.nonprod_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    target_aws_role_arn: savedCloudConfig.target_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    enable_notifications: false,
    sns_topic_arn: savedCloudConfig.sns_topic_arn || '',
  });

  const [prodDevopsForm, setProdDevopsForm] = useState({
    project_name: '',
    artifact_bucket: savedCloudConfig.artifact_bucket || '',
    artifact_prefix: '',
    image_json_path: '',
    template_config_path: '',
    source_env: 'STAGE',
    target_env: 'EKS-PROD',
    aws_region: savedCloudConfig.aws_region || 'us-east-1',
    source_ecr_registry: savedCloudConfig.ecr_registry || '',
    source_ecr_repository: '',
    target_ecr_registry: savedCloudConfig.ecr_registry || '',
    target_ecr_repository: '',
    source_image_tag: '',
    target_image_tag: 'prod',
    client_aws_role_arn: savedCloudConfig.client_aws_role_arn || '',
    source_aws_role_arn: savedCloudConfig.source_aws_role_arn || savedCloudConfig.nonprod_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    target_aws_role_arn: savedCloudConfig.target_aws_role_arn || savedCloudConfig.client_aws_role_arn || '',
    dev_cluster_name: savedCloudConfig.dev_cluster_name || '',
    qa_cluster_name: savedCloudConfig.qa_cluster_name || '',
    stage_cluster_name: savedCloudConfig.stage_cluster_name || '',
    prod_cluster_name: savedCloudConfig.prod_cluster_name || '',
    namespace_strategy: savedCloudConfig.namespace_strategy || 'auto',
    app_namespace: '',
    dev_namespace: '',
    qa_namespace: '',
    stage_namespace: '',
    prod_namespace: '',
    secret_enabled: false,
    xid_array: '',
    approver: '',
    notify_email: user?.email || (user?.username ? `${user.username}@horizonrelevance.com` : ''),
    additional_notify_emails: '',
    enable_notifications: false,
    sns_topic_arn: savedCloudConfig.sns_topic_arn || '',
  });

  // placements state (multi-cloud ready; AWS live)
  const [placements, setPlacements] = useState([{
    id: uid(),
    provider: 'aws',
    account_ref: '',
    region: '',
    vpc_or_vnet_id: '',
    private_subnets_text: '',
    security_group_ids_text: '',
    health_check_path: '/healthz',
    default_instance_type: '',
    per_target_type_text: '',
    cutover_strategy: 'blue-green',
    smoke_test_url: '',
    backup_enabled: true,
    backup_copy_to_region: '',
    tags_text: 'App=demo,Env=prod,Backup=true',
    replication_engine: 'mgn',           // default to MGN
    // Source defaults
    source_type: 'aws-ec2',
    source_account_ref: '',
    source_region: '',
    source_server_ids_text: '',
    source_os: 'LINUX',
    replicate_all_data: true,
  }]);

  // Shared lists & caches
  const [availableRegions, setAvailableRegions] = useState([]);
  const [instanceTypesCache, setInstanceTypesCache] = useState({}); // { [region]: [types] }
  const [costByPlacement, setCostByPlacement] = useState({});       // { [placementId]: '$0.0123 /hr' }
  const [mcCostHint, setMcCostHint] = useState('');                  // Multi-Cloud EC2 cost

  // Logs / UX
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [intervalId, setIntervalId] = useState(null);
  const [formDisabled, setFormDisabled] = useState(false);
  const [successMessageOpen, setSuccessMessageOpen] = useState(false);
  const [errorMessageOpen, setErrorMessageOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [devopsPreflight, setDevopsPreflight] = useState(null);
  const [testPreflight, setTestPreflight] = useState(null);
  const [prodSourcePreflight, setProdSourcePreflight] = useState(null);
  const [prodTargetPreflight, setProdTargetPreflight] = useState(null);
  const [preflightLoading, setPreflightLoading] = useState({});

  const [waveId, setWaveId] = useState('');
  const [lastExecutionId, setLastExecutionId] = useState('');
  const [errors, setErrors] = useState({});

  // Super-admin (POC): only show TEARDOWN to this user
  const isSuperAdmin = (user?.username === 'ankur.kashyap');

  // TPM/sysOwner auto-map (unused today but kept)
  const tpmMapping = {
    'Commercial|COMM': {
      tpmEmail: 'ankur.kashyap@horizonrelevance.com',
      sysOwnerEmail: 'shaileja.sharma@horizonrelevance.com',
    },
    'GlobalDevelopment|GDS': {
      tpmEmail: 'shaileja.sharma@horizonrelevance.com',
      sysOwnerEmail: 'ankur.kashyap@horizonrelevance.com',
    },
  };

  /* -------------------- Hooks computed once (no conditional hooks) -------------------- */
  const targetCount = useMemo(() => parseCSV(formData.targetsText).length, [formData.targetsText]);
  const devopsTargetEnvs = useMemo(() => {
    const catalogEnvs = environmentCatalog
      .filter((environment) => environment?.is_active !== false && ['DEV', 'QA', 'STAGE'].includes(environment.name))
      .map((environment) => environment.name);
    return catalogEnvs.length ? catalogEnvs : TARGET_ENVS;
  }, [environmentCatalog]);

  const testTargetEnvs = useMemo(() => devopsTargetEnvs, [devopsTargetEnvs]);

  const prodSourceEnvs = useMemo(() => {
    const catalogEnvs = environmentCatalog
      .filter((environment) => environment?.is_active !== false && ['QA', 'STAGE'].includes(environment.name))
      .map((environment) => environment.name);
    return catalogEnvs.length ? catalogEnvs : ['STAGE'];
  }, [environmentCatalog]);

  const prodTargetEnvs = useMemo(() => {
    const catalogEnvs = environmentCatalog
      .filter((environment) => environment?.is_active !== false && environment.name === 'PROD')
      .map((environment) => environment.name);
    return catalogEnvs.length ? catalogEnvs : PROD_TARGET_ENVS;
  }, [environmentCatalog]);

  /* -------------------- Effects -------------------- */
  useEffect(() => {
    if (!user) {
      alert('Please log in to access the pipeline form.');
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => () => { if (intervalId) clearInterval(intervalId); }, [intervalId]);

  useEffect(() => {
    const loadEnvironmentCatalog = async () => {
      try {
        const data = await callBackend('/environment-catalog', 'GET');
        setEnvironmentCatalog(data?.environments || []);
      } catch (error) {
        console.error('Failed to load Environment Catalog', error);
      }
    };
    loadEnvironmentCatalog();
  }, []);

  const fetchEnvironmentPreflight = async (key, targetEnv, projectName, pipelineKind, setter) => {
    if (!targetEnv) return;
    setPreflightLoading((current) => ({ ...current, [key]: true }));
    try {
      const query = new URLSearchParams({
        project_name: projectName || 'application',
        pipeline_kind: pipelineKind,
      }).toString();
      const data = await callBackend(`/environment-catalog/preflight/${targetEnv}?${query}`, 'GET');
      setter(data);
    } catch (error) {
      setter({
        ready: false,
        status: 'not_ready',
        enforcement_enabled: true,
        checks: [{
          name: 'Environment readiness',
          status: 'FAIL',
          message: error.message || 'Unable to validate this environment.',
        }],
      });
    } finally {
      setPreflightLoading((current) => ({ ...current, [key]: false }));
    }
  };

  useEffect(() => {
    fetchEnvironmentPreflight('devops', devopsForm.target_env, devopsForm.project_name, 'DEVOPS', setDevopsPreflight);
  }, [devopsForm.target_env, devopsForm.project_name]);

  useEffect(() => {
    fetchEnvironmentPreflight('test', testDevopsForm.target_env, testDevopsForm.project_name, 'TEST_DEVOPS', setTestPreflight);
  }, [testDevopsForm.target_env, testDevopsForm.project_name]);

  useEffect(() => {
    fetchEnvironmentPreflight('prodSource', prodDevopsForm.source_env, prodDevopsForm.project_name, 'PROD_DEVOPS_SOURCE', setProdSourcePreflight);
  }, [prodDevopsForm.source_env, prodDevopsForm.project_name]);

  useEffect(() => {
    fetchEnvironmentPreflight('prodTarget', prodDevopsForm.target_env, prodDevopsForm.project_name, 'PROD_DEVOPS', setProdTargetPreflight);
  }, [prodDevopsForm.target_env, prodDevopsForm.project_name]);

  useEffect(() => {
    if (devopsTargetEnvs.length && !devopsTargetEnvs.includes(devopsForm.target_env)) {
      setDevopsForm((current) => ({ ...current, target_env: devopsTargetEnvs[0] }));
    }
  }, [devopsTargetEnvs, devopsForm.target_env]);

  useEffect(() => {
    if (testTargetEnvs.length && !testTargetEnvs.includes(testDevopsForm.target_env)) {
      setTestDevopsForm((current) => ({ ...current, target_env: testTargetEnvs[0] }));
    }
  }, [testTargetEnvs, testDevopsForm.target_env]);

  useEffect(() => {
    if (prodSourceEnvs.length && !prodSourceEnvs.includes(prodDevopsForm.source_env)) {
      setProdDevopsForm((current) => ({ ...current, source_env: prodSourceEnvs[0] }));
    }
  }, [prodSourceEnvs, prodDevopsForm.source_env]);

  useEffect(() => {
    if (prodTargetEnvs.length && !prodTargetEnvs.includes(prodDevopsForm.target_env)) {
      setProdDevopsForm((current) => ({ ...current, target_env: prodTargetEnvs[0] }));
    }
  }, [prodTargetEnvs, prodDevopsForm.target_env]);

  // Regions (AWS)
  useEffect(() => {
    const needRegions =
      formData.service === 'Cloud Migration' ||
      (formData.service === 'Multi-Cloud Deployment Manager' && formData.mcTopServiceType === 'AWS Service');
    if (!needRegions) return;

    const fetchRegions = async () => {
      try {
        const firstAcc = (placements?.[0]?.account_ref || '').trim();
        const qs = new URLSearchParams({
          tenant_id: TENANT_ID,
          include_opt_in: 'false',
          ...(firstAcc ? { account_ref: firstAcc } : {})
        }).toString();
        const res = await callBackend(`/cloud/aws/regions?${qs}`, 'GET');
        setAvailableRegions(res?.regions || []);
      } catch (e) {
        console.error('Failed to fetch regions', e);
      }
    };
    fetchRegions();
  }, [formData.service, formData.mcTopServiceType, placements?.[0]?.account_ref]);

  // Multi-Cloud: fetch instance types when region changes
  useEffect(() => {
    const shouldFetch =
      formData.service === 'Multi-Cloud Deployment Manager' &&
      formData.mcTopServiceType === 'AWS Service' &&
      formData.region &&
      !instanceTypesCache[formData.region];
    if (!shouldFetch) return;

    (async () => {
      try {
        const accRef = placements?.[0]?.account_ref || '';
        const qs = new URLSearchParams({
          region: formData.region,
          tenant_id: TENANT_ID,
          ...(accRef ? { account_ref: accRef } : {})
        }).toString();
        const res = await callBackend(`/cloud/aws/instance-types?${qs}`, 'GET');
        setInstanceTypesCache((c) => ({ ...c, [formData.region]: res?.instance_types || [] }));
      } catch (e) {
        console.error('Failed to fetch instance types', e);
      }
    })();
  }, [formData.service, formData.mcTopServiceType, formData.region, placements?.[0]?.account_ref, instanceTypesCache]);

  /* -------------------- Placement helpers -------------------- */
  const updatePlacement = async (idx, field, value) => {
    // optimistic update
    setPlacements((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });

    // snapshot used for side-effects (avoid stale reads)
    const current = { ...placements[idx], [field]: value };
    const newProvider = field === 'provider' ? value : current.provider;
    const region = field === 'region' ? value : current.region;
    const accRef = field === 'account_ref' ? value : (current.account_ref || '');

    // Fetch instance types when region chosen (or account_ref changed with region present)
    if (newProvider === 'aws' && region && (!instanceTypesCache[region] || field === 'account_ref')) {
      try {
        const qs = new URLSearchParams({
          region,
          tenant_id: TENANT_ID,
          ...(accRef ? { account_ref: accRef } : {})
        }).toString();
        const res = await callBackend(`/cloud/aws/instance-types?${qs}`, 'GET');
        setInstanceTypesCache((c) => ({ ...c, [region]: res?.instance_types || [] }));
      } catch (e) {
        console.error('Failed to fetch instance types', e);
      }
    }

    // Update cost hint when AWS + region + type are present
    if (newProvider === 'aws' && (field === 'default_instance_type' || field === 'region')) {
      if (current.region && current.default_instance_type) {
        requestCostEstimate(idx, { region: current.region, type: current.default_instance_type, id: current.id });
      }
    }
  };

  const addPlacement = () => {
    setPlacements((p) => [...p, {
      id: uid(),
      provider: 'aws',
      account_ref: '',
      region: '',
      vpc_or_vnet_id: '',
      private_subnets_text: '',
      security_group_ids_text: '',
      health_check_path: '/healthz',
      default_instance_type: '',
      per_target_type_text: '',
      cutover_strategy: 'blue-green',
      smoke_test_url: '',
      backup_enabled: true,
      backup_copy_to_region: '',
      tags_text: 'App=demo,Env=prod,Backup=true',
      replication_engine: 'mgn',            // keep default MGN
      /* NEW: source side */
      source_type: 'aws-ec2',               // 'aws-ec2' | 'external'
      source_account_ref: '',               // for aws-ec2
      source_region: '',                    // for aws-ec2
      source_server_ids_text: '',           // for aws-ec2 (i-xxxx or hostnames)
      source_os: 'LINUX',                   // for external: 'LINUX' | 'WINDOWS'
      replicate_all_data: true,             // external: data policy flag
    }]);
  };

  const removePlacement = (idx) => {
    setPlacements((prev) => {
      const id = prev[idx]?.id;
      const next = prev.filter((_, i) => i !== idx);
      if (id) {
        setCostByPlacement((c) => {
          const copy = { ...c };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  // Unified estimator (Cloud Migration placements)
  const requestCostEstimate = async (idx, override = {}) => {
    try {
      const base = placements[idx] || {};
      const p = { ...base, ...override };
      if (p.provider !== 'aws' || !(p.default_instance_type || override.type) || !(p.region || override.region)) return;

      const region = override.region || p.region;
      const itype  = override.type || p.default_instance_type;
      const body = {
        region,
        instance_types: [itype],
        os: 'Linux',
        tenancy: 'Shared',
        purchase_option: 'OnDemand'
      };

      let hourly = null;
      try {
        const costRes = await callBackend('/cloud/aws/pricing/estimate', 'POST', body);
        if (typeof costRes?.hourly_usd === 'number') hourly = costRes.hourly_usd;
        else if (Array.isArray(costRes?.items) && typeof costRes.items[0]?.hourly_usd === 'number') hourly = costRes.items[0].hourly_usd;
      } catch (e) { /* backend may be down — fall back locally */ }

      if (!Number.isFinite(hourly)) {
        hourly = PRICE_FALLBACK[itype]; // best-effort local fallback
      }

      setCostByPlacement((c) => ({
        ...c,
        [p.id]: Number.isFinite(hourly) ? `${formatUsdPerHour(hourly)} (per instance)` : '—'
      }));
    } catch (e) {
      console.error('Failed to fetch placement cost', e);
    }
  };

  /* ---------- Build Wave payload that matches backend models ---------- */
  const buildWavePayload = () => {
    const targets = parseCSV(formData.targetsText);

    const placementsPayload = placements.map((p) => {
      const perType = parseKVMap(p.per_target_type_text);
      targets.forEach((t) => { if (!perType[t]) perType[t] = p.default_instance_type || ''; });

      // build source object
      let source = { type: p.source_type };
      if (p.source_type === 'aws-ec2') {
        source = {
          type: 'aws-ec2',
          account_ref: p.source_account_ref || p.account_ref || 'aws-default',
          region: p.source_region || '',
          server_ids: parseCSV(p.source_server_ids_text),
        };
      } else {
        source = {
          type: 'external',
          os: p.source_os || 'LINUX',
          replicate_all_data: !!p.replicate_all_data,
        };
      }

      return {
        provider: p.provider,
        params: {
          account_ref: p.account_ref || `${p.provider}-default`,
          region: p.region,
          vpc_id: p.vpc_or_vnet_id,
          private_subnet_ids: parseCSV(p.private_subnets_text),
          security_group_ids: parseCSV(p.security_group_ids_text),
          instance_type_map: perType,
          tg_health_check_path: p.health_check_path || '/healthz',
          attach_backup: !!p.backup_enabled,
          kms_key_alias: 'alias/tenant-data',
          blue_green: p.cutover_strategy === 'blue-green',
          smoke_tests: p.smoke_test_url ? [{ type: 'http', url: p.smoke_test_url, expect: 200 }] : [],
          tags: parseTags(p.tags_text),
          maintenance_window: formData.maintenanceWindow || undefined,
          copy_to_region: p.backup_copy_to_region || undefined,
          replication_engine: p.replication_engine || 'mgn',
          source, // NEW
        }
      };
    });

    return {
      tenant_id: TENANT_ID,
      name: formData.waveName || 'Wave-1',
      blueprint_key: 'ec2-liftshift',
      targets,
      placements: placementsPayload,
    };
  };

  /* -------------------- Submissions -------------------- */
  // CI/CD
  const submitCICD = async () => {
    const payload = {
      requestedBy: user.username,
      project_name: formData.project_name,
      app_type: (formData.app_type || '').toLowerCase(),
      repo_url: formData.repo_url,
      branch: formData.branch,
      ENABLE_SONARQUBE: formData.sonarQubeEnabled === true,
      ENABLE_OPA: formData.opaScanEnabled === true,
      ENABLE_TRIVY: formData.trivyScanEnabled === true,
    };

    try {
      const check = await callBackend('/pipeline/trigger', 'POST', { project_name: formData.project_name });
      if (check.status === 'Build triggered') {
        alert(`Existing pipeline '${formData.project_name}' triggered!`);
        return;
      }
      const response = await callBackend('/pipeline', 'POST', payload);
      alert(response.status || 'Pipeline triggered!');
    } catch (err) {
      alert('Failed to trigger pipeline');
      console.error(err);
      setFormDisabled(false);
    }
  };

  // NEW: Devops Pipeline submit
  const submitDevops = async () => {
    // minimal validation
    const required = ['project_name', 'project_type', 'repo_type', 'repo_url', 'branch', 'target_env'];
    const missing = required.filter((k) => !devopsForm[k]);
    if (missing.length) {
      setSubmissionStatus(`❌ Missing fields: ${missing.join(', ')}`);
      setErrorMessageOpen(true);
      setFormDisabled(false);
      return;
    }

    const payload = {
      ...getEnterprisePayload(),
      requestedBy: user?.username || '',
      project_name: devopsForm.project_name.trim(),
      project_type: devopsForm.project_type,
      repo_type: devopsForm.repo_type,
      repo_url: devopsForm.repo_url.trim(),
      branch: devopsForm.branch.trim(),
      ENABLE_SONARQUBE: false,
      ENABLE_CHECKMARX: false,
      checkmarx_team: '',
      ENABLE_SOAPUI: false,
      ENABLE_JMETER: false,
      ENABLE_SELENIUM: false,
      ENABLE_NEWMAN: false,
      ENABLE_RESTASSURED: false,
      ENABLE_UFT: false,
      ENABLE_TRIVY: false,
      target_env: devopsForm.target_env,
      notify_email: devopsForm.notify_email.trim(),
      additional_notify_emails: devopsForm.additional_notify_emails.trim(),
      aws_region: devopsForm.aws_region.trim(),
      ecr_registry: devopsForm.ecr_registry.trim(),
      ecr_repository: devopsForm.ecr_repository.trim(),
      artifact_bucket: devopsForm.artifact_bucket.trim(),
      client_aws_role_arn: devopsForm.client_aws_role_arn.trim(),
      nonprod_aws_role_arn: devopsForm.nonprod_aws_role_arn.trim(),
      target_aws_role_arn: devopsForm.target_aws_role_arn.trim(),
      dev_cluster_name: devopsForm.dev_cluster_name.trim(),
      qa_cluster_name: devopsForm.qa_cluster_name.trim(),
      stage_cluster_name: devopsForm.stage_cluster_name.trim(),
      prod_cluster_name: devopsForm.prod_cluster_name.trim(),
      namespace_strategy: devopsForm.namespace_strategy,
      app_namespace: devopsForm.app_namespace.trim(),
      dev_namespace: devopsForm.dev_namespace.trim(),
      qa_namespace: devopsForm.qa_namespace.trim(),
      stage_namespace: devopsForm.stage_namespace.trim(),
      prod_namespace: devopsForm.prod_namespace.trim(),
      enable_notifications: false,
      sns_topic_arn: '',
    };

    try {
      const res = await callBackend('/devops/pipeline', 'POST', payload);
      if (res?.error) {
        throw new Error(res.error);
      }
      setSubmissionStatus(res?.status || 'Devops pipeline created / triggered');
      setSuccessMessageOpen(true);
    } catch (err) {
      console.error(err);
      setSubmissionStatus('❌ Failed to create Devops pipeline');
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  const submitTestDevops = async () => {
    const required = ['project_name', 'project_type', 'repo_type', 'repo_url', 'branch', 'target_env'];
    const missing = required.filter((k) => !testDevopsForm[k]);
    if (missing.length) {
      setSubmissionStatus(`❌ Missing fields: ${missing.join(', ')}`);
      setErrorMessageOpen(true);
      setFormDisabled(false);
      return;
    }

    const payload = {
      ...getEnterprisePayload(),
      requestedBy: user?.username || '',
      project_name: testDevopsForm.project_name.trim(),
      project_type: testDevopsForm.project_type,
      repo_type: testDevopsForm.repo_type,
      repo_url: testDevopsForm.repo_url.trim(),
      branch: testDevopsForm.branch.trim(),
      ENABLE_SONARQUBE: testDevopsForm.qg_sonarqube,
      ENABLE_CHECKMARX: testDevopsForm.qg_checkmarx,
      checkmarx_team: testDevopsForm.checkmarx_team.trim(),
      ENABLE_SOAPUI: false,
      ENABLE_JMETER: testDevopsForm.qg_jmeter,
      ENABLE_SELENIUM: testDevopsForm.qg_selenium,
      ENABLE_NEWMAN: testDevopsForm.qg_newman,
      ENABLE_RESTASSURED: false,
      ENABLE_UFT: false,
      ENABLE_TRIVY: testDevopsForm.qg_trivy,
      ENABLE_OPA: testDevopsForm.qg_opa,
      image_uri: testDevopsForm.image_uri.trim(),
      target_app_url: testDevopsForm.target_app_url.trim(),
      api_base_url: testDevopsForm.api_base_url.trim(),
      jmeter_test_plan: testDevopsForm.jmeter_test_plan.trim(),
      jmeter_threads: testDevopsForm.jmeter_threads.trim(),
      jmeter_ramp_seconds: testDevopsForm.jmeter_ramp_seconds.trim(),
      jmeter_loops: testDevopsForm.jmeter_loops.trim(),
      jmeter_max_error_percent: testDevopsForm.jmeter_max_error_percent.trim(),
      jmeter_max_avg_ms: testDevopsForm.jmeter_max_avg_ms.trim(),
      jmeter_max_p95_ms: testDevopsForm.jmeter_max_p95_ms.trim(),
      newman_collection_path: testDevopsForm.newman_collection_path.trim(),
      newman_environment_path: testDevopsForm.newman_environment_path.trim(),
      newman_data_file: testDevopsForm.newman_data_file.trim(),
      newman_timeout_ms: testDevopsForm.newman_timeout_ms.trim(),
      newman_fail_on_error: testDevopsForm.newman_fail_on_error,
      target_env: testDevopsForm.target_env,
      notify_email: testDevopsForm.notify_email.trim(),
      additional_notify_emails: testDevopsForm.additional_notify_emails.trim(),
      aws_region: testDevopsForm.aws_region.trim(),
      artifact_bucket: testDevopsForm.artifact_bucket.trim(),
      client_aws_role_arn: testDevopsForm.client_aws_role_arn.trim(),
      nonprod_aws_role_arn: testDevopsForm.nonprod_aws_role_arn.trim(),
      target_aws_role_arn: testDevopsForm.target_aws_role_arn.trim(),
      enable_notifications: false,
      sns_topic_arn: '',
    };

    try {
      const res = await callBackend('/test/devops/pipeline', 'POST', payload);
      if (res?.error) {
        throw new Error(res.error);
      }
      setSubmissionStatus(res?.status || 'Test Devops pipeline created / triggered');
      setSuccessMessageOpen(true);
    } catch (err) {
      console.error(err);
      setSubmissionStatus(`❌ Failed to create Test Devops pipeline${err?.message ? `: ${err.message}` : ''}`);
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  const submitProdDevops = async () => {
    const required = [
      'project_name',
      'artifact_prefix',
      'source_env',
      'target_env',
    ];
    const missing = required.filter((k) => !prodDevopsForm[k]);
    if (missing.length) {
      setSubmissionStatus(`❌ Missing fields: ${missing.join(', ')}`);
      setErrorMessageOpen(true);
      setFormDisabled(false);
      return;
    }

    const payload = {
      ...getEnterprisePayload(),
      requestedBy: user?.username || '',
      project_name: prodDevopsForm.project_name.trim(),
      artifact_bucket: prodDevopsForm.artifact_bucket.trim(),
      artifact_prefix: prodDevopsForm.artifact_prefix.trim(),
      image_json_path: prodDevopsForm.image_json_path.trim(),
      template_config_path: prodDevopsForm.template_config_path.trim(),
      source_env: prodDevopsForm.source_env,
      target_env: prodDevopsForm.target_env,
      aws_region: prodDevopsForm.aws_region.trim(),
      source_ecr_registry: prodDevopsForm.source_ecr_registry.trim(),
      source_ecr_repository: prodDevopsForm.source_ecr_repository.trim(),
      target_ecr_registry: prodDevopsForm.target_ecr_registry.trim(),
      target_ecr_repository: prodDevopsForm.target_ecr_repository.trim(),
      source_image_tag: prodDevopsForm.source_image_tag.trim(),
      target_image_tag: prodDevopsForm.target_image_tag.trim(),
      client_aws_role_arn: prodDevopsForm.client_aws_role_arn.trim(),
      source_aws_role_arn: prodDevopsForm.source_aws_role_arn.trim(),
      target_aws_role_arn: prodDevopsForm.target_aws_role_arn.trim(),
      dev_cluster_name: prodDevopsForm.dev_cluster_name.trim(),
      qa_cluster_name: prodDevopsForm.qa_cluster_name.trim(),
      stage_cluster_name: prodDevopsForm.stage_cluster_name.trim(),
      prod_cluster_name: prodDevopsForm.prod_cluster_name.trim(),
      namespace_strategy: prodDevopsForm.namespace_strategy,
      app_namespace: prodDevopsForm.app_namespace.trim(),
      dev_namespace: prodDevopsForm.dev_namespace.trim(),
      qa_namespace: prodDevopsForm.qa_namespace.trim(),
      stage_namespace: prodDevopsForm.stage_namespace.trim(),
      prod_namespace: prodDevopsForm.prod_namespace.trim(),
      secret_enabled: prodDevopsForm.secret_enabled,
      xid_array: prodDevopsForm.xid_array.trim(),
      approver: prodDevopsForm.approver.trim(),
      notify_email: prodDevopsForm.notify_email.trim(),
      additional_notify_emails: prodDevopsForm.additional_notify_emails.trim(),
      enable_notifications: false,
      sns_topic_arn: '',
    };

    try {
      const res = await callBackend('/prod/devops/pipeline', 'POST', payload);
      if (res?.error) {
        throw new Error(res.error);
      }
      setSubmissionStatus(res?.status || 'Prod Devops pipeline created / triggered');
      setSuccessMessageOpen(true);
    } catch (err) {
      console.error(err);
      setSubmissionStatus(`❌ Failed to create Prod Devops pipeline${err?.message ? `: ${err.message}` : ''}`);
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  // Multi-Cloud (existing)
  const submitMultiCloud = async () => {
    if (formData.mcTopServiceType === 'AWS Service' && formData.mcResourceType === 'EC2') {
      const required = ['organization', 'businessUnit', 'region', 'instanceType', 'vpcId', 'securityGroup', 'ami', 'subnetId'];
      const missing = required.filter((k) => !formData[k]);
      if (missing.length) {
        setSubmissionStatus(`❌ Missing required fields: ${missing.join(', ')}`);
        setErrorMessageOpen(true);
        setFormDisabled(false);
        return;
      }
    }

    const requestData = {
      requestedBy: user?.username || '',
      organization: formData.organization,
      businessUnit: formData.businessUnit,
      tpmEmail: formData.tpmEmail,
      sysOwnerEmail: formData.sysOwnerEmail,
      managedBy: 'CloudOps',
      serviceType: formData.mcTopServiceType,
      resourceType: formData.mcResourceType,
      instanceType: formData.instanceType,
      region: formData.region,
      vpcId: formData.vpcId,
      securityGroup: formData.securityGroup,
      ami: formData.ami,
      subnetId: formData.subnetId,
      environment: 'Nonprod',
    };

    try {
      const resp = await callBackend('/cloud_administration/api/ec2-request', 'POST', requestData);
      setSubmissionStatus(`✅ Request sent. Request ID: ${resp?.requestId || 'N/A'}`);
      setSuccessMessageOpen(true);
    } catch (err) {
      console.error('Error submitting Multi-Cloud request:', err);
      setSubmissionStatus('❌ Failed to send request');
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  /* ---------- Cloud Migration actions ---------- */
  const createOrPlanWave = async () => {
    // validate inputs
    const e = {};
    if (!formData.waveName) e.waveName = 'Wave name is required.';
    if (!formData.targetsText) e.targetsText = 'Provide at least one target.';
    placements.forEach((p, i) => {
      if (!p.region) e[`p.${i}.region`] = 'Region required';
      if (!p.vpc_or_vnet_id) e[`p.${i}.vpc`] = 'VPC/VNet required';
      if (parseCSV(p.private_subnets_text).length < 2) e[`p.${i}.subnets`] = 'Provide at least two private subnets';
      if (parseCSV(p.security_group_ids_text).length < 1) e[`p.${i}.sgs`] = 'At least one SG/NSG';
      if (!p.default_instance_type) e[`p.${i}.type`] = 'Default instance type required';
      // minimal source-side checks
      if (p.source_type === 'aws-ec2' && !p.source_region) e[`p.${i}.srcRegion`] = 'Source region required';
    });
    setErrors(e);
    if (Object.keys(e).length) {
      setSubmissionStatus('❌ Please fix the highlighted fields.');
      setErrorMessageOpen(true);
      return;
    }

    try {
      setFormDisabled(true);
      const payload = buildWavePayload();

      // Optional: create to get an ID
      let id = waveId;
      if (!id) {
        const create = await callBackend('/waves', 'POST', payload);
        id = create?.id;
        setWaveId(id || '');
      }

      // PLAN — send payload
      const planRes = await callBackend(`/waves/${id}/plan`, 'POST', payload);
      if (planRes?.issues?.length) {
        setSubmissionStatus(`⚠️ Plan completed with ${planRes.issues.length} issue(s). Review before Execute.`);
        setErrorMessageOpen(true);
      } else {
        setSubmissionStatus('✅ Plan successful. You can Execute the wave.');
        setSuccessMessageOpen(true);
      }
    } catch (err) {
      console.error('Plan failed', err);
      setSubmissionStatus('❌ Plan failed. See console for details.');
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  const startPollingMigrationLogs = (execId) => {
    if (!execId) return;
    const id = setInterval(async () => {
      try {
        const res = await callBackend(`/executions/${execId}/logs`, 'GET');
        if (res?.logs) setLogs(res.logs);
        if (res?.status && ['succeeded', 'failed'].includes(res.status)) {
          clearInterval(id);
          setIntervalId(null);
          setFormDisabled(false);
        }
      } catch (err) {
        console.error('Error fetching migration logs:', err);
        clearInterval(id);
        setIntervalId(null);
        setFormDisabled(false);
      }
    }, 3000);
    setIntervalId(id);
    setShowLogs(true);
  };

  const executeWave = async () => {
    if (!waveId) {
      setSubmissionStatus('❌ Create + Plan Wave first.');
      setErrorMessageOpen(true);
      return;
    }
    try {
      setFormDisabled(true);
      const exec = await callBackend(`/waves/${waveId}/execute`, 'POST', buildWavePayload());
      const execId = exec?.execution_id;
      setLastExecutionId(execId || '');
      setSubmissionStatus('▶️ Execution started.');
      setSuccessMessageOpen(true);
      if (execId) startPollingMigrationLogs(execId);
    } catch (err) {
      console.error('Execute failed', err);
      setSubmissionStatus('❌ Execute failed.');
      setErrorMessageOpen(true);
    }
  };

  const cutoverWave = async (mode) => {
    if (!waveId) {
      setSubmissionStatus('❌ Create + Plan Wave first.');
      setErrorMessageOpen(true);
      return;
    }
    try {
      setFormDisabled(true);
      const exec = await callBackend(`/waves/${waveId}/cutover?mode=${encodeURIComponent(mode)}`, 'POST', buildWavePayload());
      const execId = exec?.execution_id;
      setLastExecutionId(execId || '');
      setSubmissionStatus(`🔁 Cutover (${mode}) started.`);
      setSuccessMessageOpen(true);
      if (execId) startPollingMigrationLogs(execId);
    } catch (err) {
      console.error('Cutover failed', err);
      setSubmissionStatus(`❌ Cutover (${mode}) failed.`);
      setErrorMessageOpen(true);
    }
  };

  // 🔴 Super-admin-only: Teardown (destroy all)
  const destroyWave = async () => {
    if (!waveId) {
      setSubmissionStatus('❌ Create + Plan Wave first.');
      setErrorMessageOpen(true);
      return;
    }
    const confirmed = window.confirm(
      'This will destroy all provisioned resources for this wave (ALB/TGs/ASGs/LTs, Backup plan/vaults, etc.). Continue?'
    );
    if (!confirmed) return;

    try {
      setFormDisabled(true);
      const exec = await callBackend(
        `/waves/${waveId}/destroy?requested_by=${encodeURIComponent(user.username)}`,
        'POST',
        buildWavePayload()
      );
      const execId = exec?.execution_id;
      setLastExecutionId(execId || '');
      setSubmissionStatus('🧨 Teardown started.');
      setSuccessMessageOpen(true);
      if (execId) startPollingMigrationLogs(execId);
    } catch (err) {
      console.error('Destroy failed', err);
      setSubmissionStatus('❌ Destroy failed.');
      setErrorMessageOpen(true);
    } finally {
      setFormDisabled(false);
    }
  };

  /* -------------------- Multi-Cloud EC2: live cost hint -------------------- */
  useEffect(() => {
    const wantCost =
      formData.service === 'Multi-Cloud Deployment Manager' &&
      formData.mcTopServiceType === 'AWS Service' &&
      formData.mcResourceType === 'EC2' &&
      formData.region &&
      formData.instanceType;

    if (!wantCost) {
      setMcCostHint('');
      return;
    }

    (async () => {
      const body = {
        region: formData.region,
        instance_types: [formData.instanceType],
        os: 'Linux',
        tenancy: 'Shared',
        purchase_option: 'OnDemand'
      };
      let hourly = null;
      try {
        const costRes = await callBackend('/cloud/aws/pricing/estimate', 'POST', body);
        if (typeof costRes?.hourly_usd === 'number') hourly = costRes.hourly_usd;
        else if (Array.isArray(costRes?.items) && typeof costRes.items[0]?.hourly_usd === 'number') hourly = costRes.items[0].hourly_usd;
      } catch (e) { /* ignore */ }
      if (!Number.isFinite(hourly)) hourly = PRICE_FALLBACK[formData.instanceType];
      setMcCostHint(Number.isFinite(hourly) ? `${formatUsdPerHour(hourly)} (per instance)` : '—');
    })();
  }, [formData.service, formData.mcTopServiceType, formData.mcResourceType, formData.region, formData.instanceType]);

  /* -------------------- Main Submit Router -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormDisabled(true);
    if (formData.service === 'Self-Service CI/CD Pipeline') return submitCICD();
    if (formData.service === 'Devops Pipeline') return submitDevops();
    if (formData.service === 'Test Devops Pipeline') return submitTestDevops();
    if (formData.service === 'Prod Devops Pipeline') return submitProdDevops();
    if (formData.service === 'Multi-Cloud Deployment Manager') return submitMultiCloud();
    setFormDisabled(false);
  };

  /* -------------------- Derived flags -------------------- */
  const isCICD = formData.service === 'Self-Service CI/CD Pipeline';
  const isDevops = formData.service === 'Devops Pipeline';
  const isTestDevops = formData.service === 'Test Devops Pipeline';
  const isProdDevops = formData.service === 'Prod Devops Pipeline';
  const isMultiCloud = formData.service === 'Multi-Cloud Deployment Manager';
  const isCloudMigration = formData.service === 'Cloud Migration';

  const renderEnvironmentReady = (preflight, loading) => {
    if (loading) {
      return <Alert severity="info" sx={{ mt: 1 }}>Checking environment readiness...</Alert>;
    }
    if (!preflight) return null;
    const failures = (preflight.checks || []).filter((check) => check.status === 'FAIL');
    const warnings = (preflight.checks || []).filter((check) => check.status === 'WARN');
    const severity = preflight.ready ? (warnings.length ? 'warning' : 'success') : 'error';
    const label = preflight.ready ? 'Environment Ready' : 'Environment Not Ready';
    const detail = failures[0]?.message || warnings[0]?.message || `Namespace ${preflight.namespace || 'will be resolved'} is validated for ${preflight.target_env}.`;
    return (
      <Alert severity={severity} sx={{ mt: 1 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
            <Chip size="small" label={preflight.status || 'unknown'} />
            {preflight.eks_access_mode && <Chip size="small" variant="outlined" label={preflight.eks_access_mode} />}
          </Stack>
          <Typography variant="caption">{detail}</Typography>
        </Stack>
      </Alert>
    );
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: 20, marginBottom: 60 }}>
      <Typography variant="h4" gutterBottom>
        {SERVICE_LABELS[formData.service] || 'Create Request'}
      </Typography>

      <form onSubmit={handleSubmit}>
        {/* Verified user */}
        <TextField
          label="Requested By"
          variant="outlined"
          fullWidth
          value={`${user?.fullName || ''} (${user?.username || ''})`}
          disabled
          sx={{ mb: 2 }}
        />

        {/* Service selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Service</InputLabel>
          <Select name="service" value={formData.service} onChange={(e) => setFormData(s => ({ ...s, service: e.target.value }))} required>
            {SERVICE_OPTIONS.map((option) => (
              option.type === 'header'
                ? <ListSubheader key={option.label}>{option.label}</ListSubheader>
                : <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ---------------- CI/CD ---------------- */}
        {isCICD && (
          <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom><CloudOutlined sx={{ mr: 1, mb: -0.5 }} />CI/CD Pipeline</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Product Group</InputLabel>
                  <Select name="productGroup" value={formData.productGroup} onChange={(e) => setFormData(s => ({ ...s, productGroup: e.target.value }))} required>
                    <MenuItem value="Millennium Citrix ProductOps">Millennium Citrix ProductOps</MenuItem>
                    <MenuItem value="Ancillary">Ancillary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Project Name" name="project_name"
                  value={formData.project_name} onChange={(e) => setFormData(s => ({ ...s, project_name: e.target.value }))} required />
              </Grid>
              <Grid item xs={12} md={7}>
                <TextField fullWidth label="Git Repo URL" name="repo_url"
                  value={formData.repo_url} onChange={(e) => setFormData(s => ({ ...s, repo_url: e.target.value }))} required />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Branch" name="branch"
                  value={formData.branch} onChange={(e) => setFormData(s => ({ ...s, branch: e.target.value }))} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Application Type</InputLabel>
                  <Select name="app_type" value={formData.app_type} onChange={(e) => setFormData(s => ({ ...s, app_type: e.target.value }))} required>
                    <MenuItem value="Java">Java</MenuItem>
                    <MenuItem value="Python">Python</MenuItem>
                    <MenuItem value="Docker">Docker</MenuItem>
                    <MenuItem value="NPM">NPM</MenuItem>
                    <MenuItem value=".NET">.NET</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} display="flex" alignItems="center" justifyContent="space-between">
                <FormControlLabel control={<Switch checked={formData.sonarQubeEnabled} onChange={(e) => setFormData(s => ({ ...s, sonarQubeEnabled: e.target.checked }))} name="sonarQubeEnabled" />} label="Code Analysis" />
                <FormControlLabel control={<Switch checked={formData.opaScanEnabled} onChange={(e) => setFormData(s => ({ ...s, opaScanEnabled: e.target.checked }))} name="opaScanEnabled" />} label="Policy Validation" />
                <FormControlLabel control={<Switch checked={formData.trivyScanEnabled} onChange={(e) => setFormData(s => ({ ...s, trivyScanEnabled: e.target.checked }))} name="trivyScanEnabled" />} label="Image Security" />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="primary" fullWidth type="submit" disabled={formDisabled}>
                  Create Pipeline
                </Button>
              </Grid>
            </Grid>
          </Card>
        )}

        {/* ---------------- NEW: Devops Pipeline ---------------- */}
        {isDevops && (
          <Box sx={PIPELINE_FORM_SX}>
            {/* Parameters */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Parameters</Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Project Information</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth label="Project Name" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.project_name}
                    onChange={(e) => setDevopsForm(s => ({ ...s, project_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Project Type</InputLabel>
                    <Select
                      value={devopsForm.project_type}
                      label="Project Type"
                      onChange={(e) => setDevopsForm(s => ({ ...s, project_type: e.target.value }))}
                      required
                    >
                      {PROJECT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Repository Type</InputLabel>
                    <Select
                      value={devopsForm.repo_type}
                      label="Repository Type"
                      onChange={(e) => setDevopsForm(s => ({ ...s, repo_type: e.target.value }))}
                      required
                    >
                      {REPO_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth label="GitHub Repository Name / Bitbucket Clone URL" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.repo_url}
                    onChange={(e) => setDevopsForm(s => ({ ...s, repo_url: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth label="Branch"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.branch}
                    onChange={(e) => setDevopsForm(s => ({ ...s, branch: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </Card>

            {/* Deployment Options */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Deployment Options</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Target Environment Name</InputLabel>
                    <Select
                      value={devopsForm.target_env}
                      label="Target Environment Name"
                      onChange={(e)=>setDevopsForm(s=>({...s,target_env:e.target.value}))}
                    >
                      {devopsTargetEnvs.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                    </Select>
                    <FormHelperText>Infrastructure details are resolved from the Environment Catalog.</FormHelperText>
                  </FormControl>
                  {renderEnvironmentReady(devopsPreflight, preflightLoading.devops)}
                </Grid>
              </Grid>
            </Card>

            {/* Notification Settings */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Notification Settings</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField
                    type="email" fullWidth label="Requester Notification Email"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.notify_email}
                    onChange={(e)=>setDevopsForm(s=>({...s,notify_email:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth label="Additional Recipients"
                    placeholder="qa.lead@example.com, product.owner@example.com"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.additional_notify_emails}
                    onChange={(e)=>setDevopsForm(s=>({...s,additional_notify_emails:e.target.value}))}
                  />
                  <FormHelperText>Pipeline status is sent to the requester by default; add comma-separated recipients when needed.</FormHelperText>
                </Grid>
              </Grid>
            </Card>

            <Button variant="contained" color="primary" type="submit" disabled={formDisabled || readinessRequiresAttention(devopsPreflight)} sx={{ display: 'block', mx: 'auto', mt: 4, borderRadius: 0, minWidth: 220 }}>
              CREATE PIPELINE
            </Button>
          </Box>
        )}

        {/* ---------------- Test Devops Pipeline ---------------- */}
        {isTestDevops && (
          <Box sx={PIPELINE_FORM_SX}>
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Test Target</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Project Name" size="small" sx={DEVOPS_FIELD_SX}
                    value={testDevopsForm.project_name}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,project_name:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Project Type</InputLabel>
                    <Select value={testDevopsForm.project_type} label="Project Type" onChange={(e)=>setTestDevopsForm(s=>({...s,project_type:e.target.value}))} required>
                      {PROJECT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Repository Type</InputLabel>
                    <Select value={testDevopsForm.repo_type} label="Repository Type" onChange={(e)=>setTestDevopsForm(s=>({...s,repo_type:e.target.value}))}>
                      {REPO_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField fullWidth required label="Repository URL" size="small" sx={DEVOPS_FIELD_SX}
                    value={testDevopsForm.repo_url}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,repo_url:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField fullWidth label="Branch" size="small" sx={DEVOPS_FIELD_SX}
                    value={testDevopsForm.branch}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,branch:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField fullWidth label="Image URI for Image Scan" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="account.dkr.ecr.region.amazonaws.com/app@sha256:..."
                    value={testDevopsForm.image_uri}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,image_uri:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="Deployed App URL" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="https://qa.example.com"
                    value={testDevopsForm.target_app_url}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,target_app_url:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Validation Gates</Typography>
              <Stack spacing={0.25}>
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_selenium} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_selenium:e.target.checked}))} />} label="UI End-to-End Test" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_newman} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_newman:e.target.checked}))} />} label="API Regression Test" />
                {testDevopsForm.qg_newman && (
                  <Grid container spacing={1} sx={{ pl: 3, pr: 1, py: 1 }}>
                    <Grid item xs={12}>
                      <TextField fullWidth label="API Base URL" size="small" sx={DEVOPS_FIELD_SX}
                        placeholder="https://qa-api.example.com or deployed app URL"
                        value={testDevopsForm.api_base_url}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,api_base_url:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="API Collection Path" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.newman_collection_path}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,newman_collection_path:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="API Environment Path" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.newman_environment_path}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,newman_environment_path:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} md={7}>
                      <TextField fullWidth label="Iteration Data File" size="small" sx={DEVOPS_FIELD_SX}
                        placeholder="tests/api/data/qa-users.json"
                        value={testDevopsForm.newman_data_file}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,newman_data_file:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField fullWidth label="Timeout (ms)" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.newman_timeout_ms}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,newman_timeout_ms:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.newman_fail_on_error} onChange={(e)=>setTestDevopsForm(s=>({...s,newman_fail_on_error:e.target.checked}))} />} label="Fail pipeline when API regression tests fail" />
                    </Grid>
                  </Grid>
                )}
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_jmeter} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_jmeter:e.target.checked}))} />} label="Performance Test" />
                {testDevopsForm.qg_jmeter && (
                  <Grid container spacing={1} sx={{ pl: 3, pr: 1, py: 1 }}>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Performance Test Plan Path" size="small" sx={DEVOPS_FIELD_SX}
                        placeholder="tests/performance/test.jmx or leave blank for generated baseline"
                        value={testDevopsForm.jmeter_test_plan}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_test_plan:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Threads" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_threads}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_threads:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Ramp Seconds" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_ramp_seconds}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_ramp_seconds:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Loops" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_loops}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_loops:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Max Error %" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_max_error_percent}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_max_error_percent:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Max Avg ms" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_max_avg_ms}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_max_avg_ms:e.target.value}))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Max P95 ms" size="small" sx={DEVOPS_FIELD_SX}
                        value={testDevopsForm.jmeter_max_p95_ms}
                        onChange={(e)=>setTestDevopsForm(s=>({...s,jmeter_max_p95_ms:e.target.value}))}
                      />
                    </Grid>
                  </Grid>
                )}
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_sonarqube} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_sonarqube:e.target.checked}))} />} label="Code Quality Scan" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_checkmarx} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_checkmarx:e.target.checked}))} />} label="Static Security Scan" />
                {testDevopsForm.qg_checkmarx && (
                  <TextField fullWidth label="Security Review Team" size="small" sx={DEVOPS_FIELD_SX}
                    value={testDevopsForm.checkmarx_team}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,checkmarx_team:e.target.value}))}
                  />
                )}
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_trivy} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_trivy:e.target.checked}))} />} label="Container / IaC Vulnerability Scan" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={testDevopsForm.qg_opa} onChange={(e)=>setTestDevopsForm(s=>({...s,qg_opa:e.target.checked}))} />} label="Policy Validation" />
              </Stack>
            </Card>

            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Execution & Results</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Environment</InputLabel>
                    <Select value={testDevopsForm.target_env} label="Environment" onChange={(e)=>setTestDevopsForm(s=>({...s,target_env:e.target.value}))}>
                      {testTargetEnvs.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                    </Select>
                    <FormHelperText>Execution settings are resolved from the Environment Catalog.</FormHelperText>
                  </FormControl>
                  {renderEnvironmentReady(testPreflight, preflightLoading.test)}
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField type="email" fullWidth label="Requester Notification Email" size="small" sx={DEVOPS_FIELD_SX}
                    value={testDevopsForm.notify_email}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,notify_email:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Additional Recipients" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="qa.lead@example.com, product.owner@example.com"
                    value={testDevopsForm.additional_notify_emails}
                    onChange={(e)=>setTestDevopsForm(s=>({...s,additional_notify_emails:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            <Button variant="contained" color="primary" type="submit" disabled={formDisabled || readinessRequiresAttention(testPreflight)} sx={{ display: 'block', mx: 'auto', mt: 4, borderRadius: 0, minWidth: 220 }}>
              CREATE TEST PIPELINE
            </Button>
          </Box>
        )}

        {/* ---------------- Prod Devops Pipeline ---------------- */}
        {isProdDevops && (
          <Box sx={PIPELINE_FORM_SX}>
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Release Artifact</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth required label="Project Name" size="small" sx={DEVOPS_FIELD_SX}
                    value={prodDevopsForm.project_name}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,project_name:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField fullWidth required label="Artifact Prefix / Build ID" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="devops-pipeline/acme-springboot-payments/abc123"
                    value={prodDevopsForm.artifact_prefix}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,artifact_prefix:e.target.value}))}
                  />
                  <FormHelperText>image.json and templateconfiguration.json are resolved from this prefix unless custom paths are provided by automation.</FormHelperText>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Source Image Tag" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="Optional. Uses image.json when blank."
                    value={prodDevopsForm.source_image_tag}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,source_image_tag:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Production Tag" size="small" sx={DEVOPS_FIELD_SX}
                    value={prodDevopsForm.target_image_tag}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,target_image_tag:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Promotion</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Source Environment</InputLabel>
                    <Select value={prodDevopsForm.source_env} label="Source Environment" onChange={(e)=>setProdDevopsForm(s=>({...s,source_env:e.target.value}))}>
                      {prodSourceEnvs.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {renderEnvironmentReady(prodSourcePreflight, preflightLoading.prodSource)}
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Target Environment</InputLabel>
                    <Select value={prodDevopsForm.target_env} label="Target Environment" onChange={(e)=>setProdDevopsForm(s=>({...s,target_env:e.target.value}))}>
                      {prodTargetEnvs.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {renderEnvironmentReady(prodTargetPreflight, preflightLoading.prodTarget)}
                </Grid>
                <Grid item xs={12}>
                  <FormHelperText>Artifact bucket, ECR registry, roles, cluster, namespace, and account mapping are resolved from the Environment Catalog.</FormHelperText>
                </Grid>
              </Grid>
            </Card>

            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Approval, Secrets & Notification</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Approver" size="small" sx={DEVOPS_FIELD_SX}
                    value={prodDevopsForm.approver}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,approver:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={prodDevopsForm.secret_enabled} onChange={(e)=>setProdDevopsForm(s=>({...s,secret_enabled:e.target.checked}))} />} label="Create / update environment secrets" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Secret Input Array" size="small" sx={DEVOPS_FIELD_SX}
                    disabled={!prodDevopsForm.secret_enabled}
                    placeholder="xid1,xid2,xid3"
                    value={prodDevopsForm.xid_array}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,xid_array:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField type="email" fullWidth label="Requester Notification Email" size="small" sx={DEVOPS_FIELD_SX}
                    value={prodDevopsForm.notify_email}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,notify_email:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Additional Recipients" size="small" sx={DEVOPS_FIELD_SX}
                    placeholder="release.manager@example.com, qa.lead@example.com"
                    value={prodDevopsForm.additional_notify_emails}
                    onChange={(e)=>setProdDevopsForm(s=>({...s,additional_notify_emails:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            <Button variant="contained" color="primary" type="submit" disabled={formDisabled || readinessRequiresAttention(prodSourcePreflight) || readinessRequiresAttention(prodTargetPreflight)} sx={{ display: 'block', mx: 'auto', mt: 4, borderRadius: 0, minWidth: 220 }}>
              PROMOTE TO PRODUCTION
            </Button>
          </Box>
        )}

        {/* ---------------- Cloud Migration (Placements) ---------------- */}
        {isCloudMigration && (
          <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Blueprint</InputLabel>
                <Select name="cloudBlueprint" value={formData.cloudBlueprint} onChange={(e) => setFormData(s => ({ ...s, cloudBlueprint: e.target.value }))} required>
                  {BLUEPRINTS.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Wave & Targets */}
            <Divider sx={{ my: 2 }}><Chip label="Wave & Targets" /></Divider>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Wave Name"
                  name="waveName"
                  value={formData.waveName}
                  onChange={(e) => setFormData(s => ({ ...s, waveName: e.target.value }))}
                  error={!!errors.waveName}
                  helperText={errors.waveName || 'E.g., Wave-1'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maintenance Window (optional)"
                  name="maintenanceWindow"
                  value={formData.maintenanceWindow}
                  onChange={(e) => setFormData(s => ({ ...s, maintenanceWindow: e.target.value }))}
                  placeholder="Sat 01:00–03:00"
                  InputProps={{ endAdornment: <InputAdornment position="end"><InfoOutlined /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label={`Targets (${targetCount} selected)`}
                  name="targetsText"
                  value={formData.targetsText}
                  onChange={(e) => setFormData(s => ({ ...s, targetsText: e.target.value }))}
                  error={!!errors.targetsText}
                  helperText={errors.targetsText || 'Comma/newline separated hostnames or asset IDs.'}
                  placeholder={`app01, app02\n# or one per line`}
                />
              </Grid>
            </Grid>

            {/* Placements */}
            <Divider sx={{ my: 2 }}><Chip label="Placements" /></Divider>
            {placements.map((p, i) => (
              <PlacementCard
                key={p.id}
                idx={i}
                placement={p}
                onChange={updatePlacement}
                onRemove={removePlacement}
                regions={availableRegions}
                instanceTypesForRegion={instanceTypesCache}
                requestEstimate={requestCostEstimate}
                costHint={costByPlacement[p.id]}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button startIcon={<Add />} onClick={addPlacement}>Add Placement</Button>
            </Box>

            {/* Action bar */}
            <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              mt: 2,
              pt: 2,
              borderTop: '1px dashed #e0e0e0'
            }}>
              <Tooltip title="Validate and run a dry plan (prechecks + IaC plan + replication checks)">
                <span>
                  <Button variant="outlined" onClick={createOrPlanWave} disabled={formDisabled}>
                    CREATE + PLAN WAVE
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={waveId ? 'Provision landing zone + configure replication' : 'Plan the wave first'}>
                <span>
                  <Button variant="contained" color="primary" onClick={executeWave} disabled={formDisabled || !waveId}>
                    EXECUTE WAVE
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={waveId ? 'Boot in isolation and run smoke tests' : 'Plan the wave first'}>
                <span>
                  <Button variant="contained" onClick={() => cutoverWave('test')} disabled={formDisabled || !waveId}>
                    CUTOVER (TEST)
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={waveId ? 'Weighted shift behind LB with health gates' : 'Plan the wave first'}>
                <span>
                  <Button variant="contained" color="success" onClick={() => cutoverWave('prod')} disabled={formDisabled || !waveId}>
                    CUTOVER (PRODUCTION)
                  </Button>
                </span>
              </Tooltip>

              {/* 🔴 Super-admin only */}
              {isCloudMigration && isSuperAdmin && waveId && (
                <Tooltip title="Super admin only: Terraform destroy for this wave">
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={destroyWave}
                      disabled={formDisabled}
                    >
                      TEARDOWN (DESTROY ALL)
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Card>
        )}

        {/* ---------------- Multi-Cloud (existing) ---------------- */}
        {isMultiCloud && (
          <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom><StorageOutlined sx={{ mr: 1, mb: -0.5 }} />Cloud Administration</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField fullWidth label="Organization" name="organization" value={formData.organization} onChange={(e) => setFormData(s => ({ ...s, organization: e.target.value }))} placeholder="e.g., Commercial" /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Business Unit" name="businessUnit" value={formData.businessUnit} onChange={(e) => setFormData(s => ({ ...s, businessUnit: e.target.value }))} placeholder="e.g., COMM" /></Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Service Type</InputLabel>
                  <Select name="mcTopServiceType" value={formData.mcTopServiceType} onChange={(e) => setFormData(s => ({ ...s, mcTopServiceType: e.target.value }))}>
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="AWS Service">AWS Service</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {(formData.mcTopServiceType === 'AWS Service') && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Resource</InputLabel>
                    <Select name="mcResourceType" value={formData.mcResourceType} onChange={(e) => setFormData(s => ({ ...s, mcResourceType: e.target.value }))}>
                      <MenuItem value="">Select</MenuItem>
                      {AWS_SERVICES.map((svc) => <MenuItem key={svc} value={svc}>{svc}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {(formData.mcTopServiceType === 'AWS Service' && formData.mcResourceType === 'EC2') && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Region</InputLabel>
                      <Select name="region" value={formData.region} onChange={(e) => setFormData(s => ({ ...s, region: e.target.value }))}>
                        <MenuItem value="">Select Region</MenuItem>
                        {availableRegions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  {instanceTypesCache[formData.region]?.length > 0 && (
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Instance Type</InputLabel>
                        <Select name="instanceType" value={formData.instanceType} onChange={(e) => setFormData(s => ({ ...s, instanceType: e.target.value }))}>
                          <MenuItem value="">Select Instance Type</MenuItem>
                          {instanceTypesCache[formData.region].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Typography variant="body1">
                      <MonetizationOnOutlined sx={{ mr: 1, mb: -0.5 }} />
                      <strong>Estimated Cost:</strong> {mcCostHint || '—'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}><TextField fullWidth label="VPC ID" name="vpcId" value={formData.vpcId} onChange={(e) => setFormData(s => ({ ...s, vpcId: e.target.value }))} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Security Group" name="securityGroup" value={formData.securityGroup} onChange={(e) => setFormData(s => ({ ...s, securityGroup: e.target.value }))} /></Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>AMI</InputLabel>
                      <Select name="ami" value={formData.ami} onChange={(e) => setFormData(s => ({ ...s, ami: e.target.value }))}>
                        <MenuItem value="">Select AMI</MenuItem>
                        {/* AMI list wiring omitted for brevity */}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}><TextField fullWidth label="Subnet ID" name="subnetId" value={formData.subnetId} onChange={(e) => setFormData(s => ({ ...s, subnetId: e.target.value }))} /></Grid>
                </>
              )}
            </Grid>
          </Card>
        )}

        {/* Bottom submit: show for “other” services only (avoid duplicates for CICD/Devops) */}
        {!isCloudMigration && !isCICD && !isDevops && !isTestDevops && !isProdDevops && (
          <Button variant="contained" color="primary" fullWidth type="submit" disabled={formDisabled}>
            Submit Request
          </Button>
        )}
      </form>

      {/* Logs */}
      {showLogs && (
        <div style={{
          marginTop: 20, backgroundColor: '#000', color: '#0f0', padding: 10,
          fontFamily: 'monospace', maxHeight: 400, overflowY: 'scroll', borderRadius: 8
        }}>
          <Typography variant="h6" style={{ color: '#fff', marginBottom: 8 }}>Console Logs</Typography>
          <pre>{logs}</pre>
        </div>
      )}

      {/* Toasts */}
      <Snackbar open={successMessageOpen} autoHideDuration={6000} onClose={() => setSuccessMessageOpen(false)}>
        <Alert onClose={() => setSuccessMessageOpen(false)} severity="success" sx={{ width: '100%' }}>
          {submissionStatus || 'Success.'}
        </Alert>
      </Snackbar>
      <Snackbar open={errorMessageOpen} autoHideDuration={6000} onClose={() => setErrorMessageOpen(false)}>
        <Alert onClose={() => setErrorMessageOpen(false)} severity="error" sx={{ width: '100%' }}>
          {submissionStatus || 'Please fix the errors above.'}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PipelineForm;
