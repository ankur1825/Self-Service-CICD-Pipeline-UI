const CLIENT_CONFIG_KEY = 'horizon.enterprise.clientConfig';
const LICENSE_CONFIG_KEY = 'horizon.enterprise.licenseConfig';
const CLOUD_CONFIG_KEY = 'horizon.enterprise.cloudConfig';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const defaultClientConfig = {
  client_id: 'horizon-internal',
  client_name: 'Horizon Relevance Internal',
  industry: 'generic',
};

export const defaultLicenseConfig = {
  license_key: '',
  license_signature: '',
  license_type: 'trial',
  license_expires_at: '',
  enabled_pipelines: ['Devops Pipeline', 'Test Devops Pipeline'],
  enabled_features: [
    'build',
    'artifact_publish',
    'code_scan',
    'image_scan',
    'policy_validation',
    'static_application_security',
    'test_suites',
    'notifications',
  ],
  allowed_environments: ['EKS-NONPROD'],
};

export const defaultCloudConfig = {
  aws_region: 'us-east-1',
  ecr_registry: '',
  artifact_bucket: '',
  client_aws_role_arn: '',
  sns_topic_arn: '',
};

export const getClientConfig = () => readJson(CLIENT_CONFIG_KEY, defaultClientConfig);
export const saveClientConfig = (config) => writeJson(CLIENT_CONFIG_KEY, config);

export const getLicenseConfig = () => readJson(LICENSE_CONFIG_KEY, defaultLicenseConfig);
export const saveLicenseConfig = (config) => writeJson(LICENSE_CONFIG_KEY, config);

export const getCloudConfig = () => readJson(CLOUD_CONFIG_KEY, defaultCloudConfig);
export const saveCloudConfig = (config) => writeJson(CLOUD_CONFIG_KEY, config);

export const getEnterprisePayload = () => ({
  ...getClientConfig(),
  ...getLicenseConfig(),
  ...getCloudConfig(),
});
