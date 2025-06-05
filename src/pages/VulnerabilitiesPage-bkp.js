import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Container, Typography, Chip, TextField, Button, Grid, Card, CardContent, Tabs, Tab, Box, IconButton, Tooltip
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

function VulnerabilitiesDashboard() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await callBackend('/vulnerabilities');
        setVulnerabilities(response || []);
      } catch (error) {
        console.error('Error fetching vulnerabilities:', error);
      }
    }
    fetchData();
  }, []);

  const filteredVulnerabilities = vulnerabilities.filter(vuln => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'Trivy' && (!vuln.source || vuln.source === 'Trivy')) ||
      (activeTab === 'OPA' && vuln.source === 'OPA') ||
      (activeTab === 'OPA-Kubernetes' && vuln.source === 'OPA-Kubernetes') ||
      (activeTab === 'SonarQube' && vuln.source === 'SonarQube');

    const matchesSearch =
      vuln.package_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      vuln.vulnerability_id?.toLowerCase().includes(searchText.toLowerCase()) ||
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
      ['Target', 'Package', 'Installed Version', 'Vulnerability ID', 'Severity', 'AI Severity', 'Fixed Version', 'Risk Score', 'Line', 'Status', 'Scanned At', 'Source', 'Description'],
      ...filteredVulnerabilities.map(vuln => [
        vuln.target,
        vuln.package_name,
        vuln.installed_version,
        vuln.vulnerability_id,
        vuln.severity,
        vuln.predictedSeverity || '',
        vuln.fixed_version,
        vuln.risk_score,
        vuln.line || '',
        vuln.status || '',
        vuln.timestamp || '',
        vuln.source || '',
        vuln.description || ''
      ])
    ];
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'vulnerabilities.csv');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const columns = [
    { field: 'target', headerName: 'Target (File/Image)', width: 200 },
    { field: 'package_name', headerName: 'Package', width: 150 },
    { field: 'installed_version', headerName: 'Installed Version', width: 130 },
    { field: 'vulnerability_id', headerName: 'Vuln ID', width: 200 },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={severityColors[params.value] || 'default'} size="small" />
      )
    },
    {
      field: 'predictedSeverity',
      headerName: 'AI Severity',
      width: 130,
      renderCell: (params) =>
      params.row.source === 'SonarQube' ? (
        <Chip label={params.value || 'N/A'} color={severityColors[params.value] || 'default'} size="small" />
      ) : (
        ''
      )
    },
    { field: 'fixed_version', headerName: 'Fixed Version', width: 130 },
    {
      field: 'risk_score',
      headerName: 'Risk Score',
      width: 110,
      type: 'number',
      sortComparator: (v1, v2) => v2 - v1
    },
    {
      field: 'line',
      headerName: 'Line',
      width: 90
    },
    { field: 'status', headerName: 'Status', width: 110 },
    {
      field: 'timestamp',
      headerName: 'Scanned At',
      width: 180,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : 'N/A'
    },
    { field: 'source', headerName: 'Source', width: 150 },
    { field: 'description', headerName: 'Description / Remediation', width: 400 }
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Vulnerability Dashboard
      </Typography>

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
          <Tab label="Trivy" value="Trivy" />
          <Tab label="OPA" value="OPA" />
          <Tab label="OPA-Kubernetes" value="OPA-Kubernetes" />
          <Tab label="SonarQube" value="SonarQube" /> 
        </Tabs>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <TextField
            label="Search Package / Vuln / Description"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" onClick={exportCSV}>
            Export CSV
          </Button>
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
        <Box sx={{ minWidth: '1600px', p: isFullscreen ? 2 : 0 }}>
          <DataGrid
            rows={filteredVulnerabilities.map((row, index) => ({ id: index, ...row }))}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            initialState={{
              sorting: {
                sortModel: [{ field: 'risk_score', sort: 'desc' }]
              }
            }}
          />
        </Box>
      </Box>
    </Container>
  );
}

export default VulnerabilitiesDashboard;
