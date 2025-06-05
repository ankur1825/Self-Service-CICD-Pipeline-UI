import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PipelineForm from './components/pipelineForm';
import Login from './components/Login';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';

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
                <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
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
