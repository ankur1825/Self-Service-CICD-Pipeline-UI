import { useState } from 'react';
import {
  Alert, Button, Card, Container, Grid, Stack, TextField, Typography,
} from '@mui/material';
import {
  defaultCloudConfig,
  getCloudConfig,
  saveCloudConfig,
} from '../utils/enterpriseConfig';

function CloudConnectorPage() {
  const [cloud, setCloud] = useState(getCloudConfig());
  const [message, setMessage] = useState('');

  const handleSave = () => {
    saveCloudConfig(cloud);
    setMessage('Cloud connector saved.');
  };

  const handleReset = () => {
    setCloud(defaultCloudConfig);
    saveCloudConfig(defaultCloudConfig);
    setMessage('Cloud connector reset.');
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Cloud Connector</Typography>
      <Typography variant="body2" color="text.secondary">Client-owned AWS execution and artifact settings</Typography>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}

      <Card sx={{ p: 2, mt: 2, borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="AWS Region"
              value={cloud.aws_region}
              onChange={(e) => setCloud((prev) => ({ ...prev, aws_region: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="ECR Registry / Account ID"
              value={cloud.ecr_registry}
              onChange={(e) => setCloud((prev) => ({ ...prev, ecr_registry: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Artifact S3 Bucket"
              value={cloud.artifact_bucket}
              onChange={(e) => setCloud((prev) => ({ ...prev, artifact_bucket: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Client AWS Role ARN"
              value={cloud.client_aws_role_arn}
              onChange={(e) => setCloud((prev) => ({ ...prev, client_aws_role_arn: e.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="SNS Topic ARN"
              value={cloud.sns_topic_arn}
              onChange={(e) => setCloud((prev) => ({ ...prev, sns_topic_arn: e.target.value }))}
              fullWidth
            />
          </Grid>
        </Grid>
      </Card>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave}>Save</Button>
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Stack>
    </Container>
  );
}

export default CloudConnectorPage;
