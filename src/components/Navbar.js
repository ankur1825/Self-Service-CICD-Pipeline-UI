import './Navbar.css';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

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
