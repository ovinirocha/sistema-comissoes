import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Relatorio from './pages/Relatorio';
import Geral from './pages/Geral';
import Bonus from './pages/Bonus';
import ExportadorPersonalizado from './pages/ExportadorPersonalizado'; 
import PrivateRoute from './pages/PrivateRoute'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública: Tela de Login */}
        <Route path="/" element={<Login />} />

        {/* Rotas blindadas: O PrivateRoute bloqueia quem não tá logado */}
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
        <Route path="/exportador" element={
          <PrivateRoute><ExportadorPersonalizado /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;