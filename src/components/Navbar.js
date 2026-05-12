import './Navbar.css';
import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import { isPlatformAdmin } from '../utils/authz';

function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = isPlatformAdmin(user);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="logo-container">
                <img src={`${process.env.PUBLIC_URL}/jenkins.png`} alt="Jenkins Kubernetes Deployment" className="logo" />
                <span className="company-name">Horizon Relevance</span>
            </div>

            <div className="auth-controls">
                {user ? (
                    <>
                        <Stack direction="row" spacing={0.5} className="nav-links">
                            <Button color="inherit" size="small" onClick={() => navigate('/')}>Pipelines</Button>
                            <Button color="inherit" size="small" onClick={() => navigate('/vulnerabilities')}>Findings</Button>
                            {isAdmin && <Button color="inherit" size="small" onClick={() => navigate('/client-settings')}>Client</Button>}
                            {isAdmin && <Button color="inherit" size="small" onClick={() => navigate('/environment-catalog')}>Environment Catalog</Button>}
                            {isAdmin && <Button color="inherit" size="small" onClick={() => navigate('/license')}>License</Button>}
                        </Stack>
                        <span className="username">{user.fullName}</span>
                        <Button color="inherit" onClick={handleLogout}>Logout</Button>
                    </>
                ) : (
                    <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
