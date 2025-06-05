import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Container } from '@mui/material';
import { callBackend } from '../services/api';

function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const user = await callBackend('/login', 'POST', form);
            if (user && user.username) {
                localStorage.setItem('user', JSON.stringify(user));
                window.location.href = "/pipeline/";
            } else {
                setError('Invalid credentials');
            }
        } catch {
            setError('Login failed. Please check credentials.');
        }
    };

    return (
        <Container maxWidth="sm" style={{ marginTop: '50px' }}>
            <Typography variant="h5" gutterBottom>Login</Typography>
            <form onSubmit={handleLogin}>
                <TextField
                    fullWidth label="Username" name="username"
                    value={form.username} onChange={handleChange}
                    style={{ marginBottom: '16px' }} required
                />
                <TextField
                    fullWidth label="Password" name="password"
                    type="password"
                    value={form.password} onChange={handleChange}
                    style={{ marginBottom: '16px' }} required
                />
                <Button variant="contained" fullWidth type="submit">Login</Button>
                {error && <Typography color="error" style={{ marginTop: '8px' }}>{error}</Typography>}
            </form>
        </Container>
    );
}

export default Login;
