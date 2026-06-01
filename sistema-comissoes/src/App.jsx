import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Relatorio from './pages/Relatorio';
import Geral from './pages/Geral'; // ou o caminho da sua pasta
import Bonus from './pages/Bonus'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/relatorio" element={<Relatorio />} /> {/* <-- Nova rota */}
        <Route path="/geral" element={<Geral />} />
        <Route path="/bonus" element={<Bonus />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;