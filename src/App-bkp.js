import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
//import Login from './components/Login';
import PipelineForm from './components/pipelineForm';

const isAuthenticated = () => !!localStorage.getItem("token");

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<PipelineForm />} />
                <Route path="/pipeline" element={<PipelineForm />} />
                {/* <Route path="/dashboard" element={<pipelineForm />} /> */}
            </Routes>
        </Router>
    );
}

export default App;
