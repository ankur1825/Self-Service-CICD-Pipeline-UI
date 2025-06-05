import { useState, useEffect } from 'react';
import {
    Container, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Button, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { callBackend } from '../services/api';

function PipelineForm() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [formData, setFormData] = useState({
        service: '',
        productGroup: '',
        project_name: '',
        app_type: '',
        repo_url: '',
        branch: '',
        sonarQubeEnabled: false,
        opaScanEnabled: false,
        environment: ''
    });

    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState('');
    const [buildNumber, setBuildNumber] = useState(1);
    const [intervalId, setIntervalId] = useState(null);

    useEffect(() => {
        if (!user) {
            alert("Please log in to access the pipeline form.");
            navigate("/login");
        }
    }, [user, navigate]);

    useEffect(() => {
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [intervalId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSwitchChange = (e) => {
        const { name, checked } = e.target;
        setFormData({ ...formData, [name]: checked });
    };

    const startPollingLogs = (jobName, buildNumber) => {
        const id = setInterval(async () => {
            try {
                const result = await callBackend(`/pipeline/logs/${jobName}/${buildNumber}`, 'GET');
                setLogs(result.logs || '');
            } catch (err) {
                console.error('Error fetching logs:', err);
            }
        }, 3000);
        setIntervalId(id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            requestedBy: user.username,
            project_name: formData.project_name,
            app_type: formData.app_type.toLowerCase(),
            repo_url: formData.repo_url,
            branch: formData.branch,
            ENABLE_SONARQUBE: formData.sonarQubeEnabled,
            ENABLE_OPA: formData.opaScanEnabled,
        };

        try {
            const response = await callBackend('/pipeline', 'POST', payload);
            alert(response.status || 'Pipeline triggered!');
            setBuildNumber(1);
            setShowLogs(true);
            startPollingLogs(payload.project_name, 1);
        } catch (err) {
            alert('Failed to trigger pipeline');
            console.error(err);
        }
    };

    const showPipelineFields = formData.service === 'CI/CD pipeline';

    return (
        <Container maxWidth="sm" style={{ marginTop: '20px' }}>
            <Typography variant="h4" gutterBottom>
                Create Jenkins Pipeline
            </Typography>

            <form onSubmit={handleSubmit}>
                <TextField
                    label="Requested By"
                    variant="outlined"
                    fullWidth
                    value={`${user?.fullName || ''} (${user?.username || ''})`}
                    disabled
                    style={{ marginBottom: '16px' }}
                />

                <FormControl fullWidth style={{ marginBottom: '16px' }}>
                    <InputLabel>Service</InputLabel>
                    <Select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        required
                    >
                        <MenuItem value="CI/CD pipeline">CI/CD pipeline</MenuItem>
                        <MenuItem value="Automation">Automation</MenuItem>
                    </Select>
                </FormControl>

                {showPipelineFields && (
                    <>
                        <FormControl fullWidth style={{ marginBottom: '16px' }}>
                            <InputLabel>Product Group</InputLabel>
                            <Select
                                name="productGroup"
                                value={formData.productGroup}
                                onChange={handleChange}
                                required
                            >
                                <MenuItem value="Millennium Citrix ProductOps">Millennium Citrix ProductOps</MenuItem>
                                <MenuItem value="Ancillary">Ancillary</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Project Name"
                            variant="outlined"
                            name="project_name"
                            value={formData.project_name}
                            onChange={handleChange}
                            style={{ marginBottom: '16px' }}
                            required
                        />

                        <TextField
                            fullWidth
                            label="Git Repo URL"
                            variant="outlined"
                            name="repo_url"
                            value={formData.repo_url}
                            onChange={handleChange}
                            style={{ marginBottom: '16px' }}
                            required
                        />

                        <TextField
                            fullWidth
                            label="Branch"
                            variant="outlined"
                            name="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            style={{ marginBottom: '16px' }}
                            required
                        />

                        <FormControl fullWidth style={{ marginBottom: '16px' }}>
                            <InputLabel>Application Type</InputLabel>
                            <Select
                                name="app_type"
                                value={formData.app_type}
                                onChange={handleChange}
                                required
                            >
                                <MenuItem value="Java">Java</MenuItem>
                                <MenuItem value="Python">Python</MenuItem>
                                <MenuItem value="Docker">Docker</MenuItem>
                                <MenuItem value="NPM">NPM</MenuItem>
                                <MenuItem value=".NET">.NET</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.sonarQubeEnabled}
                                    onChange={handleSwitchChange}
                                    name="sonarQubeEnabled"
                                />
                            }
                            label={formData.sonarQubeEnabled ? "SonarQube Enabled" : "SonarQube Disabled"}
                            style={{ marginBottom: '16px' }}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.opaScanEnabled}
                                    onChange={handleSwitchChange}
                                    name="opaScanEnabled"
                                />
                            }
                            label={formData.opaScanEnabled ? "OPA Scan Enabled" : "OPA Scan Disabled"}
                            style={{ marginBottom: '16px' }}
                        />
                    </>
                )}

                <FormControl fullWidth style={{ marginBottom: '16px' }}>
                    <InputLabel>Environment</InputLabel>
                    <Select
                        name="environment"
                        value={formData.environment}
                        onChange={handleChange}
                    >
                        <MenuItem value="Prod">Prod</MenuItem>
                        <MenuItem value="Nonprod">Nonprod</MenuItem>
                    </Select>
                </FormControl>

                <Button variant="contained" color="primary" fullWidth type="submit">
                    Create Pipeline
                </Button>
            </form>

            {showLogs && (
                <div style={{
                    marginTop: '20px',
                    backgroundColor: '#000',
                    color: '#0f0',
                    padding: '10px',
                    fontFamily: 'monospace',
                    maxHeight: '400px',
                    overflowY: 'scroll',
                    borderRadius: '8px'
                }}>
                    <Typography variant="h6" style={{ color: '#fff', marginBottom: '8px' }}>Console Logs</Typography>
                    <pre>{logs}</pre>
                </div>
            )}
        </Container>
    );
}

export default PipelineForm;
