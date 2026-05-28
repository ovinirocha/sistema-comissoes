import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Relatorio from './pages/Relatorio';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/relatorio" element={<Relatorio />} /> {/* <-- Nova rota */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;