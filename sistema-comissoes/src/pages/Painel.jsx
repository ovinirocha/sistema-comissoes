import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
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
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [telefone, setTelefone] = useState(''); 
  const [observacao, setObservacao] = useState(''); 
  const [dataFechamento, setDataFechamento] = useState(''); 
  
  const [valorAssessoria, setValorAssessoria] = useState('');
  const [formaPagAssessoria, setFormaPagAssessoria] = useState('');
  const [statusAssessoria, setStatusAssessoria] = useState('Em Aberto');
  const [dataVencimentoAssessoria, setDataVencimentoAssessoria] = useState(''); 
  const [dataPagAssessoria, setDataPagAssessoria] = useState('');

  const [valorTaxaFederal, setValorTaxaFederal] = useState('');
  const [formaPagTaxaFederal, setFormaPagTaxaFederal] = useState('');
  const [statusTaxaFederal, setStatusTaxaFederal] = useState('Em Aberto');
  const [dataVencimentoTaxaFederal, setDataVencimentoTaxaFederal] = useState(''); 
  const [dataPagTaxaFederal, setDataPagTaxaFederal] = useState('');

  const [perVendaDireta, setPerVendaDireta] = useState('');
  const [perBonusPagamento, setPerBonusPagamento] = useState(''); 
  const [perRepresentante, setPerRepresentante] = useState('');
  const [representanteSelecionado, setRepresentanteSelecionado] = useState('');
  const [perEncarregada, setPerEncarregada] = useState('');
  const [encarregadaSelecionada, setEncarregadaSelecionada] = useState('');

  const [vendedoresLista, setVendedoresLista] = useState([]);
  const [contratosLista, setContratosLista] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState('');
  const [totalPago, setTotalPago] = useState(0);
  const [totalAberto, setTotalAberto] = useState(0);

  const emailLogado = auth.currentUser ? auth.currentUser.email : '';
  const isFinanceiro = emailLogado === 'financeiro@provincia.com'; 

  const formasAceitasBonus = ['Cartão de Crédito', 'Cartão de Débito', 'Cartão Recorrente', 'Pix', 'Boleto'];
  const mostrarCampoBonus = formasAceitasBonus.includes(formaPagAssessoria);

  useEffect(() => {
    if (!mostrarCampoBonus) {
      setPerBonusPagamento('');
    }
  }, [formaPagAssessoria, mostrarCampoBonus]);

  useEffect(() => {
    const qContratos = query(collection(db, 'lancamentos'), orderBy('dataLancamento', 'desc'));
    const unsubContratos = onSnapshot(qContratos, (querySnapshot) => {
      const lista = [];
      let pago = 0;
      let aberto = 0;

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        lista.push(data);
        
        if (data.statusAssessoria === 'Pago') pago += Number(data.valorAssessoria || 0);
        else aberto += Number(data.valorAssessoria || 0);

        if (data.statusTaxaFederal === 'Pago') pago += Number(data.valorTaxaFederal || 0);
        else aberto += Number(data.valorTaxaFederal || 0);
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
    c.vendedor?.toLowerCase().includes(busca.toLowerCase()) ||
    c.observacao?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAdicionarVendedor = async () => {
    const nome = window.prompt('Digite o NOME do novo colaborador:');
    if (nome && nome.trim() !== '') {
      try {
        await addDoc(collection(db, 'vendedores'), { nome: nome.toUpperCase().trim() });
        toast.success('Pessoa adicionada com sucesso! 👥'); 
      } catch (error) {
        toast.error('Erro ao adicionar.'); 
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
        vendedor: vendedorSelecionado,
        telefone: telefone, 
        observacao: observacao, 
        dataFechamento: dataFechamento, 
        
        valorAssessoria: tratarNumero(valorAssessoria),
        formaPagAssessoria: isFinanceiro ? formaPagAssessoria : '',
        statusAssessoria: isFinanceiro ? statusAssessoria : 'Em Aberto',
        dataVencimentoAssessoria: isFinanceiro ? dataVencimentoAssessoria : '',
        dataPagAssessoria: isFinanceiro ? dataPagAssessoria : '',

        valorTaxaFederal: isFinanceiro ? tratarNumero(valorTaxaFederal) : 0,
        formaPagTaxaFederal: isFinanceiro ? formaPagTaxaFederal : '',
        statusTaxaFederal: isFinanceiro ? statusTaxaFederal : 'Em Aberto',
        dataVencimentoTaxaFederal: isFinanceiro ? dataVencimentoTaxaFederal : '',
        dataPagTaxaFederal: isFinanceiro ? dataPagTaxaFederal : '',

        perVendaDireta: isFinanceiro ? tratarNumero(perVendaDireta) : 0,
        perBonusPagamento: isFinanceiro && mostrarCampoBonus ? tratarNumero(perBonusPagamento) : 0,
        perRepresentante: isFinanceiro ? tratarNumero(perRepresentante) : 0,
        representante: isFinanceiro ? representanteSelecionado : '',
        perEncarregada: isFinanceiro ? tratarNumero(perEncarregada) : 0,
        encarregada: isFinanceiro ? encarregadaSelecionada : ''
      };

      if (editandoId) {
        await updateDoc(doc(db, 'lancamentos', editandoId), dadosDoContrato);
        toast.success('Contrato atualizado com sucesso! ✏️'); 
      } else {
        await addDoc(collection(db, 'lancamentos'), {
          ...dadosDoContrato,
          dataLancamento: new Date() 
        });
        toast.success('Contrato salvo com sucesso! ✅'); 
      }
      limparCampos();
    } catch (error) {
      console.error('Erro ao salvar: ', error);
      toast.error('Erro ao salvar o contrato.'); 
    }
  };

  const puxarParaEdicao = (item) => {
    setMarca(item.marca || '');
    setContrato(item.contrato || '');
    setOs(item.os || '');
    setVendedorSelecionado(item.vendedor || '');
    setTelefone(item.telefone || ''); 
    setObservacao(item.observacao || ''); 
    setDataFechamento(item.dataFechamento || ''); 
    
    setValorAssessoria(item.valorAssessoria || '');
    setFormaPagAssessoria(item.formaPagAssessoria || '');
    setStatusAssessoria(item.statusAssessoria || 'Em Aberto');
    setDataVencimentoAssessoria(item.dataVencimentoAssessoria || '');
    setDataPagAssessoria(item.dataPagAssessoria || '');

    setValorTaxaFederal(item.valorTaxaFederal || '');
    setFormaPagTaxaFederal(item.formaPagTaxaFederal || '');
    setStatusTaxaFederal(item.statusTaxaFederal || 'Em Aberto');
    setDataVencimentoTaxaFederal(item.dataVencimentoTaxaFederal || '');
    setDataPagTaxaFederal(item.dataPagTaxaFederal || '');

    setPerVendaDireta(item.perVendaDireta || '');
    setPerBonusPagamento(item.perBonusPagamento || ''); 
    setPerRepresentante(item.perRepresentante || '');
    setRepresentanteSelecionado(item.representante || '');
    setPerEncarregada(item.perEncarregada || '');
    setEncarregadaSelecionada(item.encarregada || '');

    setEditandoId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id, statAssessoria, statTaxa) => {
    if (!isFinanceiro && (statAssessoria === 'Pago' || statTaxa === 'Pago')) {
      toast.error('Não podes excluir um contrato com pagamentos realizados.'); 
      return;
    }
    const confirmacao = window.confirm('Desejas excluir este contrato?');
    if (confirmacao) {
      try {
        await deleteDoc(doc(db, 'lancamentos', id));
        toast.success('Contrato excluído com sucesso! 🗑️'); 
      } catch (error) {
        toast.error('Erro ao excluir o contrato.'); 
      }
    }
  };

  const limparCampos = () => {
    setMarca('');
    setContrato('');
    setOs('');
    setVendedorSelecionado('');
    setTelefone('');
    setObservacao('');
    setDataFechamento('');
    
    setValorAssessoria('');
    setFormaPagAssessoria('');
    setStatusAssessoria('Em Aberto');
    setDataVencimentoAssessoria('');
    setDataPagAssessoria('');

    setValorTaxaFederal('');
    setFormaPagTaxaFederal('');
    setStatusTaxaFederal('Em Aberto');
    setDataVencimentoTaxaFederal('');
    setDataPagTaxaFederal('');

    setPerVendaDireta('');
    setPerBonusPagamento(''); 
    setPerRepresentante('');
    setRepresentanteSelecionado('');
    setPerEncarregada('');
    setEncarregadaSelecionada('');
    setEditandoId(null);
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <Toaster position="top-right" reverseOrder={false} />

      <div style={{ display: 'flex', gap: '20px', maxWidth: '1000px', margin: '0 auto 20px auto', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, color: '#28a745' }}>💰 Total Pago</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>R$ {totalPago.toFixed(2)}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: 0, color: '#856404' }}>⏳ Total Em Aberto</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>R$ {totalAberto.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>
            {editandoId ? 'Editando Contrato' : 'Lançar Contrato'}
            {!isFinanceiro && <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>(Vendedor)</span>}
          </h2>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isFinanceiro && (
              <button type="button" onClick={handleAdicionarVendedor} style={btnAmarelo}>👥 Cadastros</button>
            )}
            {isFinanceiro && (
              <Link to="/geral" style={btnGeral}>📋 Planilha Geral</Link>
            )}
            {isFinanceiro && (
              <Link to="/relatorio" style={btnAzul}>📊 Comissões</Link>
            )}
            {isFinanceiro && (
              <Link to="/bonus" style={btnBonus}>🟠 Bônus Pagamento</Link>
            )}
            <button type="button" onClick={handleSair} style={btnVermelho}>Sair</button>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Vendedor Principal:</label>
              <select value={vendedorSelecionado} onChange={(e) => setVendedorSelecionado(e.target.value)} required style={{...inputStyle, width: '100%', marginTop: '2px'}}>
                <option value="" disabled>Selecione...</option>
                {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Contrato Fechado Em:</label>
               <input type="date" value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} required style={{...inputStyle, width: '100%', marginTop: '2px'}} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Marca:</label>
               <input type="text" placeholder="Nome da Marca" value={marca} onChange={(e) => setMarca(e.target.value)} required style={{...inputStyle, width: '100%', marginTop: '2px'}} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Telefone do Cliente:</label>
               <input type="text" placeholder="(XX) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '2px' }} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Nº Contrato:</label>
               <input type="text" placeholder="Ex: 1234" value={contrato} onChange={(e) => setContrato(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '2px' }} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Nº OS:</label>
               <input type="text" placeholder="Ex: 5678" value={os} onChange={(e) => setOs(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '2px' }} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
               <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Valor Assessoria (R$):</label>
               <input type="number" step="any" placeholder="Ex: 1000.00" value={valorAssessoria} onChange={(e) => setValorAssessoria(e.target.value)} required style={{...inputStyle, width: '100%', marginTop: '2px'}} />
            </div>
          </div>

          {isFinanceiro && (
            <>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', backgroundColor: '#e9ecef', padding: '15px', borderRadius: '8px', border: '1px solid #ced4da' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📌 Pagamento Assessoria</h4>
                  
                  <label style={labelStyle}>Forma de Pagamento</label>
                  <select value={formaPagAssessoria} onChange={(e) => setFormaPagAssessoria(e.target.value)} style={{...inputStyle, width: '100%', marginBottom: '10px'}}>
                    <option value="">Selecione...</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão Recorrente">Cartão Recorrente</option>
                    <option value="Transferência">Transferência</option>
                  </select>

                  <label style={labelStyle}>Status</label>
                  <select value={statusAssessoria} onChange={(e) => setStatusAssessoria(e.target.value)} style={{...inputStyle, width: '100%', marginBottom: '10px'}}>
                    <option value="Em Aberto">Em Aberto</option>
                    <option value="Pago">Pago</option>
                  </select>

                  {statusAssessoria === 'Em Aberto' && (
                    <>
                      <label style={labelStyle}>Data de Vencimento (Previsão)</label>
                      <input type="date" value={dataVencimentoAssessoria} onChange={(e) => setDataVencimentoAssessoria(e.target.value)} style={{...inputStyle, width: '100%'}} />
                    </>
                  )}

                  {statusAssessoria === 'Pago' && (
                    <>
                      <label style={labelStyle}>Data do Pagamento (Caiu na conta)</label>
                      <input type="date" value={dataPagAssessoria} onChange={(e) => setDataPagAssessoria(e.target.value)} style={{...inputStyle, width: '100%'}} />
                    </>
                  )}
                </div>

                <div style={{ flex: '1 1 300px', backgroundColor: '#e9ecef', padding: '15px', borderRadius: '8px', border: '1px solid #ced4da' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🏛️ Pagamento Taxa Federal</h4>
                  <label style={labelStyle}>Valor da Taxa (R$)</label>
                  <input type="number" step="any" placeholder="Ex: 150.00" value={valorTaxaFederal} onChange={(e) => setValorTaxaFederal(e.target.value)} style={{...inputStyle, width: '100%', marginBottom: '10px'}} />
                  
                  <label style={labelStyle}>Forma de Pagamento</label>
                  <select value={formaPagTaxaFederal} onChange={(e) => setFormaPagTaxaFederal(e.target.value)} style={{...inputStyle, width: '100%', marginBottom: '10px'}}>
                    <option value="">Selecione...</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão Recorrente">Cartão Recorrente</option>
                    <option value="Transferência">Transferência</option>
                  </select>

                  <label style={labelStyle}>Status</label>
                  <select value={statusTaxaFederal} onChange={(e) => setStatusTaxaFederal(e.target.value)} style={{...inputStyle, width: '100%', marginBottom: '10px'}}>
                    <option value="Em Aberto">Em Aberto</option>
                    <option value="Pago">Pago</option>
                  </select>

                  {statusTaxaFederal === 'Em Aberto' && (
                    <>
                      <label style={labelStyle}>Data de Vencimento (Previsão)</label>
                      <input type="date" value={dataVencimentoTaxaFederal} onChange={(e) => setDataVencimentoTaxaFederal(e.target.value)} style={{...inputStyle, width: '100%'}} />
                    </>
                  )}

                  {statusTaxaFederal === 'Pago' && (
                    <>
                      <label style={labelStyle}>Data do Pagamento (Caiu na conta)</label>
                      <input type="date" value={dataPagTaxaFederal} onChange={(e) => setDataPagTaxaFederal(e.target.value)} style={{...inputStyle, width: '100%'}} />
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', backgroundColor: '#e2e3e5', padding: '15px', borderRadius: '8px', border: '1px solid #d6d8db', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={labelStyle}>% Venda Direta</label>
                  <input type="number" step="any" placeholder="Ex: 7" value={perVendaDireta} onChange={(e) => setPerVendaDireta(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                </div>
                
                {mostrarCampoBonus && (
                  <div style={{ flex: '1 1 150px', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', border: '1px dashed #fd7e14' }}>
                    <label style={{...labelStyle, color: '#fd7e14', marginTop: 0}}>% Bônus Pagamento</label>
                    <input type="number" step="any" placeholder="Ex: 2" value={perBonusPagamento} onChange={(e) => setPerBonusPagamento(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                  </div>
                )}

                <div style={{ flex: '1 1 200px' }}>
                  <label style={labelStyle}>% Representante</label>
                  <input type="number" step="any" placeholder="Ex: 3" value={perRepresentante} onChange={(e) => setPerRepresentante(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                  <select value={representanteSelecionado} onChange={(e) => setRepresentanteSelecionado(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }}>
                    <option value="">Quem é o Representante?</option>
                    {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={labelStyle}>% Encarregada</label>
                  <input type="number" step="any" placeholder="Ex: 2" value={perEncarregada} onChange={(e) => setPerEncarregada(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                  <select value={encarregadaSelecionada} onChange={(e) => setEncarregadaSelecionada(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }}>
                    <option value="">Quem é a Encarregada?</option>
                    {vendedoresLista.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <label style={labelStyle}>Observações Internas (Ex: avisos, detalhes de negociação...)</label>
            <input type="text" placeholder="Digite avisos gerais..." value={observacao} onChange={(e) => setObservacao(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
          </div>

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

      <div style={{ maxWidth: '1000px', margin: '20px auto' }}>
        <input type="text" placeholder="🔍 Pesquisar por marca, vendedor ou observações..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '30px auto' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Contratos Lançados Recentemente</h2>
        
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={thStyle}>Vendedor</th>
                <th style={thStyle}>Marca / Obs</th>
                <th style={thStyle}>Contato / Doc</th>
                <th style={thStyle}>Assessoria</th>
                <th style={thStyle}>Taxa Federal</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#007bff' }}>{item.vendedor}</td>
                  <td style={tdStyle}>
                    <strong>{item.marca}</strong><br/>
                    {item.dataFechamento && <span style={{ fontSize: '12px', color: '#666' }}>📅 Fechado: {item.dataFechamento.split('-').reverse().join('/')}</span>}
                    {item.observacao && (
                      <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px', fontStyle: 'italic' }}>
                        💬 {item.observacao}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {item.telefone && <span style={{fontSize: '12px', color: '#475569'}}>📞 {item.telefone}<br/></span>}
                    <strong>CT:</strong> {item.contrato || '-'}<br/>
                    <strong>OS:</strong> {item.os || '-'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ marginBottom: '5px' }}>R$ {Number(item.valorAssessoria || 0).toFixed(2)}</div>
                    <span style={{ backgroundColor: item.statusAssessoria === 'Pago' ? '#d4edda' : '#fff3cd', color: item.statusAssessoria === 'Pago' ? '#155724' : '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {item.statusAssessoria || 'Em Aberto'} {item.formaPagAssessoria ? `(${item.formaPagAssessoria})` : ''}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ marginBottom: '5px' }}>R$ {Number(item.valorTaxaFederal || 0).toFixed(2)}</div>
                    <span style={{ backgroundColor: item.statusTaxaFederal === 'Pago' ? '#d4edda' : '#fff3cd', color: item.statusTaxaFederal === 'Pago' ? '#155724' : '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {item.statusTaxaFederal || 'Em Aberto'} {item.formaPagTaxaFederal ? `(${item.formaPagTaxaFederal})` : ''}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {(!isFinanceiro && (item.statusAssessoria === 'Pago' || item.statusTaxaFederal === 'Pago')) ? (
                      <span style={{ fontSize: '12px', color: '#888' }}>🔒 Bloqueado</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexDirection: 'column' }}>
                        <button onClick={() => puxarParaEdicao(item)} style={{ padding: '6px 10px', backgroundColor: '#f8f9fa', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>✏️ Editar</button>
                        <button onClick={() => handleExcluir(item.id, item.statusAssessoria, item.statusTaxaFederal)} style={{ padding: '6px 10px', backgroundColor: '#ffeeba', color: '#856404', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '14px', color: '#555', fontWeight: 'bold', display: 'block', marginTop: '5px' };
const thStyle = { padding: '12px', textAlign: 'left', color: '#555', whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px', color: '#333' };
const cardStyle = { flex: '1 1 250px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
const btnAmarelo = { padding: '10px 15px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnGeral = { padding: '10px 15px', backgroundColor: '#6366f1', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const btnAzul = { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const btnBonus = { padding: '10px 15px', backgroundColor: '#fd7e14', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const btnVermelho = { padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

export default Painel;