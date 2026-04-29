import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PipelineForm from './components/pipelineForm';
import Login from './components/Login';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import LicensePage from './pages/LicensePage';
import ClientSettingsPage from './pages/ClientSettingsPage';
import CloudConnectorPage from './pages/CloudConnectorPage';

const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router basename="/pipeline">
            <Navbar />
            <Routes>
                <Route path="/" element={<PrivateRoute><PipelineForm /></PrivateRoute>} />
                {/* <Route path="/" element={<Navigate to="/pipeline" />} /> */}
                <Route path="/login" element={<Login />} />
                <Route path="/vulnerabilities" element={<PrivateRoute><VulnerabilitiesPage /></PrivateRoute>} />
                <Route path="/license" element={<PrivateRoute><LicensePage /></PrivateRoute>} />
                <Route path="/client-settings" element={<PrivateRoute><ClientSettingsPage /></PrivateRoute>} />
                <Route path="/cloud-connector" element={<PrivateRoute><CloudConnectorPage /></PrivateRoute>} />
                {/* <Route path="/pipeline" element={
                    <PrivateRoute>
                        <PipelineForm />
                    </PrivateRoute>
                } /> */}
            </Routes>
        </Router>
    );
}

export default App;
