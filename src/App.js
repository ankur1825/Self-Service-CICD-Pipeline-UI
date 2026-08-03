import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PipelineForm from './components/pipelineForm';
import Login from './components/Login';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import LicensePage from './pages/LicensePage';
import ClientSettingsPage from './pages/ClientSettingsPage';
import CloudConnectorPage from './pages/CloudConnectorPage';
import ReleaseTrustDashboard from './pages/ReleaseTrustDashboard';
import ReleaseTrustDetail from './pages/ReleaseTrustDetail';
import { isPlatformAdmin } from './utils/authz';

const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    return isPlatformAdmin(user) ? children : <Navigate to="/" />;
};

function App() {
    return (
        <Router basename="/pipeline">
            <Navbar />
            <Routes>
                <Route path="/" element={<PrivateRoute><PipelineForm /></PrivateRoute>} />
                <Route path="/login" element={<Login />} />
                <Route path="/vulnerabilities" element={<PrivateRoute><VulnerabilitiesPage /></PrivateRoute>} />
                <Route path="/release-trust" element={<PrivateRoute><ReleaseTrustDashboard /></PrivateRoute>} />
                <Route path="/release-trust/:releaseId" element={<PrivateRoute><ReleaseTrustDetail /></PrivateRoute>} />
                <Route path="/license" element={<PrivateRoute><AdminRoute><LicensePage /></AdminRoute></PrivateRoute>} />
                <Route path="/client-settings" element={<PrivateRoute><AdminRoute><ClientSettingsPage /></AdminRoute></PrivateRoute>} />
                <Route path="/environment-catalog" element={<PrivateRoute><AdminRoute><CloudConnectorPage /></AdminRoute></PrivateRoute>} />
                <Route path="/cloud-connector" element={<Navigate to="/environment-catalog" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
