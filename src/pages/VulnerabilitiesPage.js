import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Container, Typography, Chip, TextField, Button, Grid, Card, CardContent,
  Tabs, Tab, Box, IconButton, Tooltip, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { callBackend } from '../services/api';
import { saveAs } from 'file-saver';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const severityColors = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success',
};

const findingCategories = [
  'Container Vulnerability',
  'Dependency Vulnerability',
  'IaC Misconfiguration',
  'Secret Exposure',
  'Code Security Finding',
  'Static Code Security Finding',
  'Policy Violation',
  'Security Finding',
];

const enterpriseCsvHeaders = [
  'Finding ID', 'Category', 'Target', 'Affected Component', 'Installed Version',
  'Reference', 'Severity', 'Recommended Fix', 'Risk Score', 'Line', 'Status',
  'Policy Bundle', 'Policy Version', 'Policy Ref', 'Policy Decision',
  'Waiver Status', 'Waiver Expiry', 'Evidence URI', 'Detected At',
  'Jenkins Job', 'Build Number', 'Description'
];

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const newestTimestamp = (findings) => {
  return findings.reduce((latest, finding) => {
    const current = Date.parse(finding.timestamp || '') || 0;
    return Math.max(latest, current);
  }, 0);
};

function VulnerabilitiesDashboard() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user?.email;

  useEffect(() => {
    if (userEmail) {
      callBackend(`/my_applications?email=${userEmail}`)
        .then(async (apps) => {
          if (Array.isArray(apps)) {
            setApplications(apps);
            if (apps.length > 0) {
              const appFindings = await Promise.all(
                apps.map((app) =>
                  callBackend(`/security/findings?email=${userEmail}&application=${encodeURIComponent(app)}`)
                    .then((data) => ({ app, findings: Array.isArray(data) ? data : [] }))
                    .catch(() => ({ app, findings: [] }))
                )
              );
              const bestApp = appFindings
                .filter((item) => item.findings.length > 0)
                .sort((a, b) => newestTimestamp(b.findings) - newestTimestamp(a.findings))[0]?.app;
              setSelectedApp((current) => current || bestApp || apps[0]);
            }
          } else {
            console.warn("Expected array, received:", apps);
            setApplications([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching applications:", err);
          setApplications([]);
        });
    }
  }, [userEmail]);

  useEffect(() => {
    if (selectedApp && userEmail) {
      callBackend(`/security/findings?email=${userEmail}&application=${selectedApp}`)
        .then((data) => setVulnerabilities(Array.isArray(data) ? data : []))
        .catch((error) => {
          console.error('Error fetching vulnerabilities:', error);
          setVulnerabilities([]);
        });
    }
  }, [selectedApp, userEmail]);

  const filteredVulnerabilities = vulnerabilities.filter(vuln => {
    const matchesTab =
      activeTab === 'ALL' ||
      vuln.category === activeTab;

    const matchesSearch =
      vuln.package_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.affected_component?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.vulnerability_id?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.category?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.policy_bundle?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.policy_ref?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.policy_decision?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.waiver_status?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.remediation?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.description?.toLowerCase().includes(searchText.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const counts = {
    critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
    high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
    medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
  };

  const exportCSV = () => {
    const csvRows = [
      enterpriseCsvHeaders,
      ...filteredVulnerabilities.map(vuln => [
        vuln.finding_id,
        vuln.category,
        vuln.target,
        vuln.affected_component || vuln.package_name,
        vuln.installed_version,
        vuln.vulnerability_id,
        vuln.severity,
        vuln.remediation || vuln.fixed_version,
        vuln.risk_score,
        vuln.line || '',
        vuln.status || '',
        vuln.policy_bundle || '',
        vuln.policy_version || '',
        vuln.policy_ref || '',
        vuln.policy_decision || '',
        vuln.waiver_status || '',
        vuln.waiver_expiry || '',
        vuln.evidence_uri || '',
        vuln.timestamp || '',
        vuln.jenkins_job || '',
        vuln.build_number || '',
        vuln.description || ''
      ])
    ];
    const csvContent = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'vulnerabilities.csv');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const columns = [
    { field: 'finding_id', headerName: 'Finding ID', width: 150 },
    { field: 'category', headerName: 'Category', width: 190 },
    { field: 'target', headerName: 'Target', width: 220 },
    { field: 'affected_component', headerName: 'Affected Component', width: 180 },
    { field: 'installed_version', headerName: 'Installed Version', width: 140 },
    { field: 'vulnerability_id', headerName: 'Reference', width: 190 },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={severityColors[params.value] || 'default'} size="small" />
      )
    },
    { field: 'remediation', headerName: 'Recommended Fix', width: 320 },
    {
      field: 'risk_score',
      headerName: 'Risk Score',
      width: 110,
      type: 'number',
      sortComparator: (v1, v2) => v2 - v1
    },
    { field: 'line', headerName: 'Line', width: 90 },
    { field: 'status', headerName: 'Status', width: 110 },
    { field: 'policy_bundle', headerName: 'Policy Bundle', width: 230 },
    { field: 'policy_version', headerName: 'Policy Version', width: 130 },
    { field: 'policy_ref', headerName: 'Policy Ref', width: 260 },
    {
      field: 'policy_decision',
      headerName: 'Policy Decision',
      width: 150,
      renderCell: (params) => (
        params.value ? <Chip label={params.value} color={params.value === 'deny' ? 'warning' : 'info'} size="small" /> : 'N/A'
      )
    },
    {
      field: 'waiver_status',
      headerName: 'Waiver',
      width: 130,
      renderCell: (params) => (
        params.value ? <Chip label={params.value} color={params.value === 'active' ? 'success' : 'default'} size="small" /> : 'N/A'
      )
    },
    { field: 'waiver_expiry', headerName: 'Waiver Expires', width: 160 },
    { field: 'evidence_uri', headerName: 'Evidence URI', width: 260 },
    {
      field: 'timestamp',
      headerName: 'Detected At',
      width: 180,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : 'N/A'
    },
    { field: 'description', headerName: 'Evidence', width: 360 },
    { field: 'jenkins_job', headerName: 'Jenkins Job', width: 210 },
    { field: 'build_number', headerName: 'Build #', width: 100 },
    {
      field: 'jenkins_url',
      headerName: 'Build Trace',
      width: 250,
      renderCell: (params) => (
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            View Build
          </a>
        ) : 'N/A'
      )
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Security Findings Dashboard</Typography>

      <FormControl fullWidth sx={{ my: 2 }}>
        <InputLabel>Select Application</InputLabel>
        <Select value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)} label="Select Application">
          {Array.isArray(applications) && applications.map(app => (
            <MenuItem key={app} value={app}>{app}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Card sx={{ minWidth: 180 }}>
            <CardContent>
              <Typography variant="h6">Critical</Typography>
              <Typography variant="h5" color="error">{counts.critical}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item>
          <Card sx={{ minWidth: 180 }}>
            <CardContent>
              <Typography variant="h6">High</Typography>
              <Typography variant="h5" color="warning.main">{counts.high}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item>
          <Card sx={{ minWidth: 180 }}>
            <CardContent>
              <Typography variant="h6">Medium</Typography>
              <Typography variant="h5" color="info.main">{counts.medium}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="All" value="ALL" />
          {findingCategories.map((category) => (
            <Tab key={category} label={category} value={category} />
          ))}
        </Tabs>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <TextField
            label="Search component / finding / remediation"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" onClick={exportCSV}>Export CSV</Button>
        </Grid>
        <Grid item>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <IconButton onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>

      <Box
        sx={{
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? 0 : 'auto',
          left: isFullscreen ? 0 : 'auto',
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 700,
          backgroundColor: 'white',
          zIndex: isFullscreen ? 1500 : 'auto',
          overflow: 'auto'
        }}
      >
        <Box sx={{ minWidth: '2600px', p: isFullscreen ? 2 : 0 }}>
          <DataGrid
            rows={filteredVulnerabilities.map((row, index) => ({ id: index, ...row }))}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            initialState={{
              sorting: { sortModel: [{ field: 'risk_score', sort: 'desc' }] }
            }}
          />
        </Box>
      </Box>
    </Container>
  );
}

export default VulnerabilitiesDashboard;
