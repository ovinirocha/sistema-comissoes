import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

function Relatorio() {
  const [dadosAgrupados, setDadosAgrupados] = useState({});
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const q = query(collection(db, 'lancamentos'), where('status', '==', 'Pago'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const grupos = {};

      const inicializarPessoa = (nome) => {
        if (!grupos[nome]) {
          grupos[nome] = { transacoes: [], totalVenda: 0, totalGerencia: 0, totalFilial: 0, totalGeral: 0 };
        }
      };

      const contratosDoMes = querySnapshot.docs.filter((doc) => {
        const c = doc.data();

        // BLINDAGEM DE DATAS: Impede o sistema de crachar se a data for inválida ou não existir
        let mesDoContrato = -1;
        
        if (c.dataLancamento) {
          if (typeof c.dataLancamento.toDate === 'function') {
            // Se for data perfeita do Firebase
            mesDoContrato = c.dataLancamento.toDate().getMonth() + 1;
          } else {
            // Se for um texto ou data convertida
            mesDoContrato = new Date(c.dataLancamento).getMonth() + 1;
          }
        } else {
          // Se o contrato for antigão e não tiver data, manda ele pro mês atual para não sumir
          mesDoContrato = new Date().getMonth() + 1;
        }

        return mesDoContrato === Number(mesFiltro);
      });

      contratosDoMes.forEach((doc) => {
        const c = doc.data();

        const vendedor = c.vendedor || 'Desconhecido';
        const gerente = c.gerente || '';
        const encarregado = c.encarregado || '';

        const valor = Number(c.valorAssessoria) || 0;
        const pVenda = Number(c.perVendaDireta) || 0;
        const pGer = Number(c.perGerencia) || 0;
        const pFil = Number(c.perFilial) || 0;

        const valVenda = valor * (pVenda / 100);
        const valGer = valor * (pGer / 100);
        const valFil = valor * (pFil / 100);

        if (pVenda > 0) {
          inicializarPessoa(vendedor);
          grupos[vendedor].transacoes.push({ ...c, tipo: 'Venda Direta', percAplicado: pVenda, valorRecebido: valVenda });
          grupos[vendedor].totalVenda += valVenda;
          grupos[vendedor].totalGeral += valVenda;
        }

        if (pGer > 0 && gerente) {
          inicializarPessoa(gerente);
          grupos[gerente].transacoes.push({ ...c, tipo: `Gerência (Venda: ${vendedor})`, percAplicado: pGer, valorRecebido: valGer });
          grupos[gerente].totalGerencia += valGer;
          grupos[gerente].totalGeral += valGer;
        }

        if (pFil > 0 && encarregado) {
          inicializarPessoa(encarregado);
          grupos[encarregado].transacoes.push({ ...c, tipo: `Filial (Venda: ${vendedor})`, percAplicado: pFil, valorRecebido: valFil });
          grupos[encarregado].totalFilial += valFil;
          grupos[encarregado].totalGeral += valFil;
        }
      });

      const gruposOrdenados = Object.keys(grupos).sort().reduce((obj, key) => {
        obj[key] = grupos[key];
        return obj;
      }, {});

      setDadosAgrupados(gruposOrdenados);
    });

    return () => unsubscribe();
  }, [mesFiltro]);

  const exportarExcel = () => {
    const linhasPlanilha = [];

    Object.entries(dadosAgrupados).forEach(([nome, dados]) => {
      dados.transacoes.forEach((t) => {
        linhasPlanilha.push({
          Colaborador: nome,
          Marca: t.marca,
          'Nº Contrato': t.contrato || '-',
          'Nº OS': t.os || '-',
          'Tipo Comissão': t.tipo,
          'Assessoria Base (R$)': t.valorAssessoria,
          '% Aplicada': t.percAplicado,
          'Valor Ganho (R$)': t.valorRecebido
        });
      });
    });

    const planilha = XLSX.utils.json_to_sheet(linhasPlanilha);
    const arquivo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(arquivo, planilha, 'Relatório');
    XLSX.writeFile(arquivo, `Relatorio_Comissoes_Mes_${mesFiltro}.xlsx`);
  };

  const imprimirPDF = () => {
    window.print();
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
        
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
          <h2 style={{ color: '#333', margin: 0 }}>Relatório Detalhado</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Mês Referência:</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value={1}>Janeiro</option>
              <option value={2}>Fevereiro</option>
              <option value={3}>Março</option>
              <option value={4}>Abril</option>
              <option value={5}>Maio</option>
              <option value={6}>Junho</option>
              <option value={7}>Julho</option>
              <option value={8}>Agosto</option>
              <option value={9}>Setembro</option>
              <option value={10}>Outubro</option>
              <option value={11}>Novembro</option>
              <option value={12}>Dezembro</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={imprimirPDF} style={btnPdf}>📄 PDF</button>
            <button onClick={exportarExcel} style={btnExcel}>📊 Excel</button>
            <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
          </div>
        </div>

        {Object.keys(dadosAgrupados).length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Não há contratos pagos neste mês.</p>
        ) : (
          Object.entries(dadosAgrupados).map(([nome, dados]) => {
            return (
              <div key={nome} style={{ marginBottom: '50px' }}>
                <div style={{ backgroundColor: '#fcd5b4', padding: '10px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', fontSize: '18px' }}>
                  {nome.toUpperCase()}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={thStyle}>MARCA</th>
                      <th style={thStyle}>CONTRATO</th>
                      <th style={thStyle}>OS</th>
                      <th style={thStyle}>TIPO</th>
                      <th style={thStyle}>ASSESSORIA</th>
                      <th style={thStyle}>%</th>
                      <th style={thStyle}>VALOR GANHO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.transacoes.map((t, index) => (
                      <tr key={index}>
                        <td style={tdStyle}>{t.marca}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{t.contrato || '-'}</td>
                        <td style={tdStyle}>{t.os || '-'}</td>
                        <td style={{ ...tdStyle, color: t.tipo === 'Venda Direta' ? '#333' : '#007bff' }}>{t.tipo}</td>
                        <td style={tdStyle}>R$ {Number(t.valorAssessoria).toFixed(2)}</td>
                        <td style={tdStyle}>{t.percAplicado}%</td>
                        <td style={tdStyle}>R$ {t.valorRecebido.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', fontSize: '14px' }}>
                  <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', backgroundColor: '#fafafa', width: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Soma Vendas:</span>
                      <span>R$ {dados.totalVenda.toFixed(2)}</span>
                    </div>
                    {dados.totalGerencia > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#007bff' }}>
                        <span>Gerência:</span>
                        <span>R$ {dados.totalGerencia.toFixed(2)}</span>
                      </div>
                    )}
                    {dados.totalFilial > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#007bff' }}>
                        <span>Filial:</span>
                        <span>R$ {dados.totalFilial.toFixed(2)}</span>
                      </div>
                    )}
                    <hr />
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>
                      <span>TOTAL:</span>
                      <span>R$ {dados.totalGeral.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; }
            div { box-shadow: none !important; }
          }
        `}
      </style>
    </div>
  );
}

const btnPdf = { padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnExcel = { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' };
const thStyle = { padding: '8px', textAlign: 'center', border: '1px solid #000', fontSize: '14px' };
const tdStyle = { padding: '8px', textAlign: 'center', border: '1px solid #000', fontSize: '14px' };

export default Relatorio;