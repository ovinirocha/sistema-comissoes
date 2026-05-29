import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

function Relatorio() {
  const [vendasDiretas, setVendasDiretas] = useState({});
  const [representantes, setRepresentantes] = useState({});
  const [encarregadas, setEncarregadas] = useState({});
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const q = query(collection(db, 'lancamentos'), where('statusAssessoria', '==', 'Pago'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gruposVendaDireta = {};
      const gruposRepresentante = {};
      const gruposEncarregada = {};

      const inicializarPessoa = (grupo, nome) => {
        if (!grupo[nome]) grupo[nome] = { transacoes: [], total: 0 };
      };

      const contratosDoMes = querySnapshot.docs.filter((doc) => {
        const c = doc.data();
        let mesDoContrato = -1;
        if (c.dataLancamento) {
          mesDoContrato = typeof c.dataLancamento.toDate === 'function' 
            ? c.dataLancamento.toDate().getMonth() + 1 
            : new Date(c.dataLancamento).getMonth() + 1;
        } else {
          mesDoContrato = new Date().getMonth() + 1;
        }
        return mesDoContrato === Number(mesFiltro);
      });

      contratosDoMes.forEach((doc) => {
        const c = doc.data();
        const vendedor = c.vendedor || 'Desconhecido';
        const representante = c.representante || '';
        const encarregada = c.encarregada || '';
        const valorBase = Number(c.valorAssessoria) || 0;
        
        const pVenda = Number(c.perVendaDireta) || 0;
        const pRep = Number(c.perRepresentante) || 0;
        const pEnc = Number(c.perEncarregada) || 0;

        inicializarPessoa(gruposVendaDireta, vendedor);
        const ganhoVenda = valorBase * (pVenda / 100);
        gruposVendaDireta[vendedor].transacoes.push({ ...c, percAplicado: pVenda, valorRecebido: ganhoVenda });
        gruposVendaDireta[vendedor].total += ganhoVenda;

        if (pRep > 0 && representante) {
          inicializarPessoa(gruposRepresentante, representante);
          const ganhoRep = valorBase * (pRep / 100);
          gruposRepresentante[representante].transacoes.push({ ...c, tipo: `Da equipe de: ${vendedor}`, percAplicado: pRep, valorRecebido: ganhoRep });
          gruposRepresentante[representante].total += ganhoRep;
        }

        if (pEnc > 0 && encarregada) {
          inicializarPessoa(gruposEncarregada, encarregada);
          const ganhoEnc = valorBase * (pEnc / 100);
          gruposEncarregada[encarregada].transacoes.push({ ...c, tipo: `Da equipe de: ${vendedor}`, percAplicado: pEnc, valorRecebido: ganhoEnc });
          gruposEncarregada[encarregada].total += ganhoEnc;
        }
      });

      setVendasDiretas(gruposVendaDireta);
      setRepresentantes(gruposRepresentante);
      setEncarregadas(gruposEncarregada);
    });

    return () => unsubscribe();
  }, [mesFiltro]);

  const exportarExcelComissoes = () => {
    const arquivo = XLSX.book_new();

    const linhasVendas = [];
    Object.entries(vendasDiretas).forEach(([nome, dados]) => {
      dados.transacoes.forEach((t) => {
        linhasVendas.push({ 'Vendedor(a)': nome, 'Marca': t.marca, 'Telefone': t.telefone || '-', 'Nº Contrato': t.contrato || '-', 'Valor Assessoria Base (R$)': t.valorAssessoria, '% Comissão': t.percAplicado, 'Comissão Ganha (R$)': t.valorRecebido });
      });
    });
    if(linhasVendas.length > 0) XLSX.utils.book_append_sheet(arquivo, XLSX.utils.json_to_sheet(linhasVendas), 'Vendas Diretas');

    const linhasRep = [];
    Object.entries(representantes).forEach(([nome, dados]) => {
      dados.transacoes.forEach((t) => {
        linhasRep.push({ 'Representante': nome, 'Venda Realizada Por': t.vendedor, 'Marca': t.marca, 'Nº Contrato': t.contrato || '-', 'Valor Assessoria Base (R$)': t.valorAssessoria, '% Comissão': t.percAplicado, 'Comissão Ganha (R$)': t.valorRecebido });
      });
    });
    if(linhasRep.length > 0) XLSX.utils.book_append_sheet(arquivo, XLSX.utils.json_to_sheet(linhasRep), 'Representantes');

    const linhasEnc = [];
    Object.entries(encarregadas).forEach(([nome, dados]) => {
      dados.transacoes.forEach((t) => {
        linhasEnc.push({ 'Encarregada': nome, 'Venda Realizada Por': t.vendedor, 'Marca': t.marca, 'Nº Contrato': t.contrato || '-', 'Valor Assessoria Base (R$)': t.valorAssessoria, '% Comissão': t.percAplicado, 'Comissão Ganha (R$)': t.valorRecebido });
      });
    });
    if(linhasEnc.length > 0) XLSX.utils.book_append_sheet(arquivo, XLSX.utils.json_to_sheet(linhasEnc), 'Encarregadas');

    XLSX.writeFile(arquivo, `Comissoes_Mes_${mesFiltro}.xlsx`);
  };

  const renderTabela = (titulo, corBg, dadosAgrupados, isLideranca = false) => {
    if (Object.keys(dadosAgrupados).length === 0) return null;
    return (
      <div style={{ marginBottom: '50px' }}>
        <h3 style={{ borderBottom: `3px solid ${corBg}`, paddingBottom: '10px', color: '#333' }}>{titulo}</h3>
        {Object.entries(dadosAgrupados).map(([nome, dados]) => (
          <div key={nome} style={{ marginBottom: '30px' }}>
            <div style={{ backgroundColor: corBg, padding: '10px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>{nome.toUpperCase()}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {isLideranca && <th style={thStyle}>VENDA DE</th>}
                    <th style={thStyle}>MARCA</th>
                    <th style={thStyle}>CONTRATO / OS</th>
                    <th style={thStyle}>VALOR ASSESSORIA</th>
                    <th style={thStyle}>% APLICADA</th>
                    <th style={thStyle}>VALOR DA COMISSÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.transacoes.map((t, index) => (
                    <tr key={index}>
                      {isLideranca && <td style={{...tdStyle, color: '#666', fontStyle: 'italic'}}>{t.vendedor}</td>}
                      <td style={tdStyle}>{t.marca}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>CT: {t.contrato || '-'}<br/><span style={{fontSize: '12px', fontWeight: 'normal'}}>OS: {t.os || '-'}</span></td>
                      <td style={tdStyle}>R$ {Number(t.valorAssessoria).toFixed(2)}</td>
                      <td style={tdStyle}>{t.percAplicado}%</td>
                      <td style={{...tdStyle, color: '#28a745', fontWeight: 'bold'}}>R$ {t.valorRecebido.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ border: '1px solid #000', padding: '15px', borderRadius: '4px', backgroundColor: '#fafafa', width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745', fontWeight: 'bold', fontSize: '18px' }}>
                  <span>TOTAL A RECEBER:</span>
                  <span>R$ {dados.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
          <h2 style={{ color: '#333', margin: 0 }}>📊 Relatório de Comissões</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Mês Referência:</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarExcelComissoes} style={btnExcel}>📊 Excel Comissões</button>
            <button onClick={window.print} style={btnPdf}>📄 Imprimir</button>
            <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
          </div>
        </div>
        {Object.keys(vendasDiretas).length === 0 && Object.keys(representantes).length === 0 && Object.keys(encarregadas).length === 0 ? (
          <p style={{textAlign: 'center', color: '#888'}}>Não há comissões pagas neste mês.</p>
        ) : (
          <>
            {renderTabela('🟢 Comissões de Vendas Diretas', '#28a745', vendasDiretas, false)}
            {renderTabela('🔵 Comissões de Representantes', '#007bff', representantes, true)}
            {renderTabela('🟣 Comissões de Encarregadas', '#6f42c1', encarregadas, true)}
          </>
        )}
      </div>
    </div>
  );
}

const btnPdf = { padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnExcel = { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' };
const thStyle = { padding: '10px', textAlign: 'center', border: '1px solid #000', fontSize: '14px' };
const tdStyle = { padding: '10px', textAlign: 'center', border: '1px solid #000', fontSize: '14px' };

export default Relatorio;