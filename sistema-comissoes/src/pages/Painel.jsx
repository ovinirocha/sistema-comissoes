import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
// NOVO: Importando as notificações modernas
import toast, { Toaster } from 'react-hot-toast';

function Painel() {
  const navigate = useNavigate();

  const handleSair = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      toast.error('Erro ao sair do sistema.');
    }
  };

  const [marca, setMarca] = useState('');
  const [contrato, setContrato] = useState('');
  const [os, setOs] = useState('');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState('Em Aberto');

  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [vendedoresLista, setVendedoresLista] = useState([]);

  const [perVendaDireta, setPerVendaDireta] = useState('');
  const [perGerencia, setPerGerencia] = useState('');
  const [gerenteSelecionado, setGerenteSelecionado] = useState('');
  const [perFilial, setPerFilial] = useState('');
  const [encarregadoSelecionado, setEncarregadoSelecionado] = useState('');

  const [contratosLista, setContratosLista] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [busca, setBusca] = useState('');
  const [totalPago, setTotalPago] = useState(0);
  const [totalAberto, setTotalAberto] = useState(0);

  const emailLogado = auth.currentUser ? auth.currentUser.email : '';
  const isFinanceiro = emailLogado === 'financeiro@provincia.com'; // Mude para o e-mail real depois!

  useEffect(() => {
    const qContratos = query(collection(db, 'lancamentos'), orderBy('dataLancamento', 'desc'));
    const unsubContratos = onSnapshot(qContratos, (querySnapshot) => {
      const lista = [];
      let pago = 0;
      let aberto = 0;

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        lista.push(data);
        if (data.status === 'Pago') {
          pago += Number(data.valorAssessoria || 0);
        } else {
          aberto += Number(data.valorAssessoria || 0);
        }
      });
      setContratosLista(lista);
      setTotalPago(pago);
      setTotalAberto(aberto);
    });

    const unsubVendedores = onSnapshot(collection(db, 'vendedores'), (querySnapshot) => {
      const vends = [];
      querySnapshot.forEach((doc) => vends.push({ id: doc.id, ...doc.data() }));
      vends.sort((a, b) => a.nome.localeCompare(b.nome));
      setVendedoresLista(vends);
    });

    return () => {
      unsubContratos();
      unsubVendedores();
    };
  }, []);

  const listaFiltrada = contratosLista.filter((c) =>
    c.marca?.toLowerCase().includes(busca.toLowerCase()) ||
    c.vendedor?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAdicionarVendedor = async () => {
    const nome = window.prompt('Digite o NOME do novo vendedor/gerente:');
    if (nome && nome.trim() !== '') {
      try {
        await addDoc(collection(db, 'vendedores'), { nome: nome.toUpperCase().trim() });
        toast.success('Pessoa adicionada com sucesso! 👥'); // Trocado
      } catch (error) {
        toast.error('Erro ao adicionar.'); // Trocado
      }
    }
  };

  const tratarNumero = (num) => Number(String(num).replace(',', '.')) || 0;

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const dadosDoContrato = {
        marca: marca,
        contrato: contrato,
        os: os,
        valorAssessoria: tratarNumero(valor),
        status: isFinanceiro ? status : 'Em Aberto',
        perVendaDireta: tratarNumero(perVendaDireta),
        perGerencia: tratarNumero(perGerencia),
        gerente: gerenteSelecionado,
        perFilial: tratarNumero(perFilial),
        encarregado: encarregadoSelecionado,
        vendedor: vendedorSelecionado
      };

      if (editandoId) {
        await updateDoc(doc(db, 'lancamentos', editandoId), dadosDoContrato);
        toast.success('Contrato atualizado com sucesso! ✏️'); // Trocado
      } else {
        await addDoc(collection(db, 'lancamentos'), {
          ...dadosDoContrato,
          dataLancamento: new Date() 
        });
        toast.success('Contrato salvo com sucesso! ✅'); // Trocado
      }
      limparCampos();
    } catch (error) {
      console.error('Erro ao salvar: ', error);
      toast.error('Erro ao salvar o contrato.'); // Trocado
    }
  };

  const puxarParaEdicao = (item) => {
    setMarca(item.marca || '');
    setContrato(item.contrato || '');
    setOs(item.os || '');
    setValor(item.valorAssessoria || '');
    setStatus(item.status || 'Em Aberto');
    setPerVendaDireta(item.perVendaDireta || '');
    setPerGerencia(item.perGerencia || '');
    setGerenteSelecionado(item.gerente || '');
    setPerFilial(item.perFilial || '');
    setEncarregadoSelecionado(item.encarregado || '');
    setVendedorSelecionado(item.vendedor || '');
    setEditandoId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id, statusAtual) => {
    if (!isFinanceiro && statusAtual === 'Pago') {
      toast.error('Você não pode excluir um contrato pago.'); // Trocado
      return;
    }
    const confirmacao = window.confirm('Tem certeza que deseja excluir este contrato?');
    if (confirmacao) {
      try {
        await deleteDoc(doc(db, 'lancamentos', id));
        toast.success('Contrato excluído com sucesso! 🗑️'); // Trocado
      } catch (error) {
        toast.error('Erro ao excluir o contrato.'); // Trocado
      }
    }
  };

  const limparCampos = () => {
    setMarca('');
    setContrato('');
    setOs('');
    setValor('');
    setStatus('Em Aberto');
    setPerVendaDireta('');
    setPerGerencia('');
    setGerenteSelecionado('');
    setPerFilial('');
    setEncarregadoSelecionado('');
    setVendedorSelecionado('');
    setEditandoId(null);
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Componente Invisível que renderiza as notificações na tela */}
      <Toaster position="top-right" reverseOrder={false} />

      <div style={{ display: 'flex', gap: '20px', maxWidth: '900px', margin: '0 auto 20px auto', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, color: '#28a745' }}>💰 Pago</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>R$ {totalPago.toFixed(2)}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, color: '#856404' }}>⏳ Em Aberto</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>R$ {totalAberto.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>
            {editandoId ? 'Editando Contrato' : 'Lançar Contrato'}
            {!isFinanceiro && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Vendedor)</span>}
          </h2>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isFinanceiro && (
              <button type="button" onClick={handleAdicionarVendedor} style={btnAmarelo}>👥 Vendedor</button>
            )}
            {isFinanceiro && (
              <Link to="/relatorio" style={btnAzul}>📊 Relatórios</Link>
            )}
            <button type="button" onClick={handleSair} style={btnVermelho}>Sair</button>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <select value={vendedorSelecionado} onChange={(e) => setVendedorSelecionado(e.target.value)} required style={inputStyle}>
            <option value="" disabled>Selecione o Vendedor Principal...</option>
            {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
          </select>

          <input type="text" placeholder="Nome da Marca" value={marca} onChange={(e) => setMarca(e.target.value)} required style={inputStyle} />

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Nº do Contrato" value={contrato} onChange={(e) => setContrato(e.target.value)} style={{ ...inputStyle, flex: '1 1 200px' }} />
            <input type="text" placeholder="Nº da OS" value={os} onChange={(e) => setOs(e.target.value)} style={{ ...inputStyle, flex: '1 1 200px' }} />
          </div>

          <input type="number" step="any" placeholder="Valor da Assessoria" value={valor} onChange={(e) => setValor(e.target.value)} required style={inputStyle} />

          {isFinanceiro && (
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="Em Aberto">Em Aberto</option>
              <option value="Pago">Pago</option>
              <option value="Aberto - Pagou só a taxa">Aberto - Pagou só a taxa</option>
            </select>
          )}

          {isFinanceiro && (
            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', border: '1px solid #ddd', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>% Venda Direta</label>
                <input type="number" step="any" placeholder="Ex: 7" value={perVendaDireta} onChange={(e) => setPerVendaDireta(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>% Gerência</label>
                <input type="number" step="any" placeholder="Ex: 3" value={perGerencia} onChange={(e) => setPerGerencia(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                <select value={gerenteSelecionado} onChange={(e) => setGerenteSelecionado(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }}>
                  <option value="">Quem é o Gerente?</option>
                  {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>% Filial</label>
                <input type="number" step="any" placeholder="Ex: 2" value={perFilial} onChange={(e) => setPerFilial(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                <select value={encarregadoSelecionado} onChange={(e) => setEncarregadoSelecionado(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }}>
                  <option value="">Quem é o Encarregado?</option>
                  {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: editandoId ? '#007bff' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
              {editandoId ? 'Atualizar Contrato' : 'Salvar Contrato'}
            </button>
            {editandoId && (
              <button type="button" onClick={limparCampos} style={{ padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      <div style={{ maxWidth: '900px', margin: '20px auto' }}>
        <input type="text" placeholder="🔍 Pesquisar por marca ou vendedor..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '900px', margin: '30px auto' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Contratos Lançados</h2>
        
        {/* NOVO: Div de overflow para o celular não espremer a tabela */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={thStyle}>Vendedor</th>
                <th style={thStyle}>Marca</th>
                <th style={thStyle}>Contrato</th>
                <th style={thStyle}>OS</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#007bff' }}>{item.vendedor}</td>
                  <td style={tdStyle}>{item.marca}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{item.contrato || '-'}</td>
                  <td style={tdStyle}>{item.os || '-'}</td>
                  <td style={tdStyle}>R$ {Number(item.valorAssessoria || 0).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ backgroundColor: item.status === 'Pago' ? '#d4edda' : '#fff3cd', color: item.status === 'Pago' ? '#155724' : '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {(!isFinanceiro && item.status === 'Pago') ? (
                      <span style={{ fontSize: '12px', color: '#888' }}>🔒 Bloqueado</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button onClick={() => puxarParaEdicao(item)} style={{ padding: '6px 10px', backgroundColor: '#f8f9fa', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>✏️ Editar</button>
                        <button onClick={() => handleExcluir(item.id, item.status)} style={{ padding: '6px 10px', backgroundColor: '#ffeeba', color: '#856404', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {listaFiltrada.length === 0 && <p style={{textAlign: 'center', marginTop: '20px', color: '#888'}}>Nenhum contrato encontrado.</p>}
      </div>
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', color: '#555', fontWeight: 'bold' };
const thStyle = { padding: '12px', textAlign: 'left', color: '#555', whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px', color: '#333' };
const cardStyle = { flex: '1 1 250px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };

const btnAmarelo = { padding: '10px 15px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnAzul = { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const btnVermelho = { padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

export default Painel;