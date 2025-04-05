import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './Home';
import { ARView } from './ARView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/ar-view" replace />} />
        <Route path="/ar-view" element={<Home />} />
        <Route path="/ar" element={<ARView />} />
      </Routes>
    </Router>
  );
}

export default App;

