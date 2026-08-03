import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

function ApplicationSelector({ applications, value, onChange, disabled = false }) {
  return (
    <FormControl fullWidth sx={{ my: 2 }} disabled={disabled}>
      <InputLabel>Select Application</InputLabel>
      <Select value={value} onChange={(event) => onChange(event.target.value)} label="Select Application">
        {applications.map((application) => (
          <MenuItem key={application} value={application}>{application}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default ApplicationSelector;
