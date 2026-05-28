import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import logoEmpresa from '../assets/provincia-logo.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(''); // Estado para guardar mensagens de erro

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro(''); // Limpa os erros antes de tentar logar
    
    try {
      // Tenta logar usando o Firebase
      await signInWithEmailAndPassword(auth, email, senha);
      navigate('/painel');
      // Aqui no futuro nós vamos redirecionar o usuário para o Painel!
      
    } catch (error) {
      // Se der erro (senha errada, usuario nao existe), cai aqui
      console.error(error);
      setErro("E-mail ou senha incorretos.");
    }
  };

  return (
// Fundo Preto Elegante
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a1a1a' }}>
      
<div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', maxWidth: '400px' }}>
  
  {/* LOGO NO CENTRO */}
  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
    <img src={logoEmpresa} alt="Logo da Empresa" style={{ width: '150px', objectFit: 'contain' }} />
  </div>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Sistema de Comissões</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          
          {/* Se tiver algum erro, mostra essa mensagem em vermelho */}
          {erro && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{erro}</p>}

          <button type="submit" style={{ padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
            Entrar
          </button>
        </form>
      </div>

    </div>
  );
}

export default Login;