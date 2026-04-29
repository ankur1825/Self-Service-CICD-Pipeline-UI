import { useState, useEffect, useMemo } from 'react';
import {
  Container, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Button, Typography, Box, Card, Grid,
  Snackbar, Alert, Divider, Chip, Stack, FormHelperText, InputAdornment, Tooltip, IconButton
} from '@mui/material';
import {
  CloudOutlined, StorageOutlined, RouteOutlined, HealthAndSafetyOutlined,
  ShieldOutlined, MonetizationOnOutlined, InfoOutlined, DeleteOutline, Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { callBackend } from '../services/api';
import { getCloudConfig, getEnterprisePayload } from '../utils/enterpriseConfig';

/* -------------------- Constants -------------------- */
const SERVICES = [
  'Self-Service CI/CD Pipeline',
  'Devops Pipeline',
  'Multi-Cloud Deployment Manager',
  'AI-Driven Monitoring & Incident Response',
  'Cloud Cost Optimization Platform',
  'Cloud Migration',
];

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
const TARGET_ENVS = ['EKS-PROD', 'EKS-NONPROD'];
const TEST_SUITE_PROJECT_TYPES = ['Angular', 'SpringBoot', 'SpringBoot-Java11'];
const DEVOPS_PANEL_SX = {
  p: 1.5,
  mb: 2,
  border: '1px solid #222',
  borderRadius: 0,
  boxShadow: 'none',
  width: '100%',
  maxWidth: 520,
};
const DEVOPS_FIELD_SX = {
  '& .MuiInputBase-root': { height: 34, fontSize: 12 },
  '& .MuiInputLabel-root': { fontSize: 12 },
};

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

  const [formData, setFormData] = useState({
    // generic
    service: '',
    environment: '',

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
    qg_sonarqube: true,
    qg_checkmarx: false,
    checkmarx_team: '',
    qg_soapui: false,
    qg_jmeter: false,
    qg_selenium: false,
    qg_newman: false,
    target_env: 'EKS-NONPROD', // EKS-PROD | EKS-NONPROD
    notify_email: user?.email || (user?.username ? `${user.username}@horizonrelevance.com` : ''),
    aws_region: savedCloudConfig.aws_region || 'us-east-1',
    ecr_registry: savedCloudConfig.ecr_registry || '',
    ecr_repository: '',
    artifact_bucket: savedCloudConfig.artifact_bucket || '',
    client_aws_role_arn: savedCloudConfig.client_aws_role_arn || '',
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

  /* -------------------- Effects -------------------- */
  useEffect(() => {
    if (!user) {
      alert('Please log in to access the pipeline form.');
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => () => { if (intervalId) clearInterval(intervalId); }, [intervalId]);

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
    const required = ['project_name', 'project_type', 'repo_type', 'repo_url', 'branch', 'aws_region', 'ecr_registry', 'ecr_repository', 'artifact_bucket'];
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
      ENABLE_SONARQUBE: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_sonarqube,
      ENABLE_CHECKMARX: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_checkmarx,
      checkmarx_team: devopsForm.checkmarx_team.trim(),
      ENABLE_SOAPUI: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_soapui,
      ENABLE_JMETER: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_jmeter,
      ENABLE_SELENIUM: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_selenium,
      ENABLE_NEWMAN: TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type) && devopsForm.qg_newman,
      target_env: devopsForm.target_env,
      notify_email: devopsForm.notify_email.trim(),
      aws_region: devopsForm.aws_region.trim(),
      ecr_registry: devopsForm.ecr_registry.trim(),
      ecr_repository: devopsForm.ecr_repository.trim(),
      artifact_bucket: devopsForm.artifact_bucket.trim(),
      client_aws_role_arn: devopsForm.client_aws_role_arn.trim(),
      enable_notifications: devopsForm.enable_notifications,
      sns_topic_arn: devopsForm.sns_topic_arn.trim(),
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
      environment: formData.environment,
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
    if (formData.service === 'Multi-Cloud Deployment Manager') return submitMultiCloud();
    setFormDisabled(false);
  };

  /* -------------------- Derived flags -------------------- */
  const isCICD = formData.service === 'Self-Service CI/CD Pipeline';
  const isDevops = formData.service === 'Devops Pipeline';
  const isMultiCloud = formData.service === 'Multi-Cloud Deployment Manager';
  const isCloudMigration = formData.service === 'Cloud Migration';
  const showDevopsQualityGates = TEST_SUITE_PROJECT_TYPES.includes(devopsForm.project_type);

  return (
    <Container maxWidth="md" style={{ marginTop: 20, marginBottom: 60 }}>
      <Typography variant="h4" gutterBottom>
        {isCICD ? 'Create Jenkins Pipeline'
          : isDevops ? 'Devops Pipeline'
          : isMultiCloud ? 'Cloud Administration'
          : isCloudMigration ? 'Cloud Migration'
          : 'Create Request'}
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
            {SERVICES.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
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
          <Box sx={{ width: '100%', maxWidth: 540 }}>
            {/* Parameters */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Parameters</Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Project Information</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth label="Project Name" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.project_name}
                    onChange={(e) => setDevopsForm(s => ({ ...s, project_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
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
                <Grid item xs={12} md={7}>
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

            {/* Quality Gates */}
            {showDevopsQualityGates && (
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Security & Quality Gates</Typography>
              <Stack spacing={0.25}>
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_sonarqube} onChange={(e)=>setDevopsForm(s=>({...s,qg_sonarqube:e.target.checked}))} />} label="Code Quality Analysis" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_checkmarx} onChange={(e)=>setDevopsForm(s=>({...s,qg_checkmarx:e.target.checked}))} />} label="Static Application Security" />
                {devopsForm.qg_checkmarx && (
                  <TextField
                    fullWidth label="Security Team ID"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.checkmarx_team}
                    onChange={(e)=>setDevopsForm(s=>({...s,checkmarx_team:e.target.value}))}
                  />
                )}
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_soapui} onChange={(e)=>setDevopsForm(s=>({...s,qg_soapui:e.target.checked}))} />} label="Service Contract Testing" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_jmeter} onChange={(e)=>setDevopsForm(s=>({...s,qg_jmeter:e.target.checked}))} />} label="Performance Load Testing" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_selenium} onChange={(e)=>setDevopsForm(s=>({...s,qg_selenium:e.target.checked}))} />} label="Browser Workflow Testing" />
                <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.qg_newman} onChange={(e)=>setDevopsForm(s=>({...s,qg_newman:e.target.checked}))} />} label="API Regression Testing" />
              </Stack>
            </Card>
            )}

            {/* Deployment Options */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Deployment Options</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small" sx={DEVOPS_FIELD_SX}>
                    <InputLabel>Target Environment Name</InputLabel>
                    <Select
                      value={devopsForm.target_env}
                      label="Target Environment Name"
                      onChange={(e)=>setDevopsForm(s=>({...s,target_env:e.target.value}))}
                    >
                      {TARGET_ENVS.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth label="AWS Region" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.aws_region}
                    onChange={(e)=>setDevopsForm(s=>({...s,aws_region:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth label="ECR Registry / Account ID" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    placeholder="426946630837"
                    value={devopsForm.ecr_registry}
                    onChange={(e)=>setDevopsForm(s=>({...s,ecr_registry:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth label="ECR Repository Name" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    placeholder="my-application"
                    value={devopsForm.ecr_repository}
                    onChange={(e)=>setDevopsForm(s=>({...s,ecr_repository:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth label="Artifact S3 Bucket" required
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    placeholder="client-artifacts-bucket"
                    value={devopsForm.artifact_bucket}
                    onChange={(e)=>setDevopsForm(s=>({...s,artifact_bucket:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth label="Client AWS Role ARN"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    placeholder="arn:aws:iam::123456789012:role/DevopsPipelineRole"
                    value={devopsForm.client_aws_role_arn}
                    onChange={(e)=>setDevopsForm(s=>({...s,client_aws_role_arn:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            {/* Notification Settings */}
            <Card sx={DEVOPS_PANEL_SX}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Notification Settings</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={8}>
                  <TextField
                    type="email" fullWidth label="E-Mail Address"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    value={devopsForm.notify_email}
                    onChange={(e)=>setDevopsForm(s=>({...s,notify_email:e.target.value}))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Switch size="small" checked={devopsForm.enable_notifications} onChange={(e)=>setDevopsForm(s=>({...s,enable_notifications:e.target.checked}))} />} label="Send SNS notification" />
                </Grid>
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth label="SNS Topic ARN"
                    size="small"
                    sx={DEVOPS_FIELD_SX}
                    disabled={!devopsForm.enable_notifications}
                    value={devopsForm.sns_topic_arn}
                    onChange={(e)=>setDevopsForm(s=>({...s,sns_topic_arn:e.target.value}))}
                  />
                </Grid>
              </Grid>
            </Card>

            <Button variant="contained" color="primary" type="submit" disabled={formDisabled} sx={{ display: 'block', mx: 'auto', mt: 4, borderRadius: 0, minWidth: 220 }}>
              CREATE PIPELINE
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

        {/* Environment (shared) */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Environment</InputLabel>
          <Select name="environment" value={formData.environment} onChange={(e) => setFormData(s => ({ ...s, environment: e.target.value }))}>
            <MenuItem value="Prod">Prod</MenuItem>
            <MenuItem value="Nonprod">Nonprod</MenuItem>
          </Select>
        </FormControl>

        {/* Bottom submit: show for “other” services only (avoid duplicates for CICD/Devops) */}
        {!isCloudMigration && !isCICD && !isDevops && (
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
