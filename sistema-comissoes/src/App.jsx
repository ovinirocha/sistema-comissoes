import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Relatorio from './pages/Relatorio';
import Geral from './pages/Geral';
import Bonus from './pages/Bonus';
import PrivateRoute from './pages/PrivateRoute'; // <--- Importe o porteiro

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública: Todo mundo vê */}
        <Route path="/" element={<Login />} />

        {/* Rotas protegidas: Só entra se estiver logado */}
        <Route path="/painel" element={
          <PrivateRoute><Painel /></PrivateRoute>
        } />
        <Route path="/relatorio" element={
          <PrivateRoute><Relatorio /></PrivateRoute>
        } />
        <Route path="/geral" element={
          <PrivateRoute><Geral /></PrivateRoute>
        } />
        <Route path="/bonus" element={
          <PrivateRoute><Bonus /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;