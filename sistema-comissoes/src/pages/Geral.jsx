import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

function Geral() {
  const [contratosMes, setContratosMes] = useState([]);
  const [busca, setBusca] = useState('');
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const q = query(collection(db, 'lancamentos'), orderBy('dataLancamento', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const listaDoMes = [];
      querySnapshot.forEach((doc) => {
        const c = doc.data();
        let mesDoContrato = -1;
        
        if (c.dataFechamento) {
          mesDoContrato = parseInt(c.dataFechamento.split('-')[1], 10);
        } else if (c.dataLancamento) {
          if (typeof c.dataLancamento.toDate === 'function') {
            mesDoContrato = c.dataLancamento.toDate().getMonth() + 1;
          } else {
            mesDoContrato = new Date(c.dataLancamento).getMonth() + 1;
          }
        } else {
          mesDoContrato = new Date().getMonth() + 1;
        }

        if (mesDoContrato === Number(mesFiltro)) {
          listaDoMes.push({ id: doc.id, ...c });
        }
      });
      setContratosMes(listaDoMes);
    });

    return () => unsubscribe();
  }, [mesFiltro]);

  const listaFiltrada = contratosMes.filter((c) =>
    c.marca?.toLowerCase().includes(busca.toLowerCase()) ||
    c.vendedor?.toLowerCase().includes(busca.toLowerCase()) ||
    c.contrato?.toLowerCase().includes(busca.toLowerCase())
  );

  const formatarDataBR = (dataString) => {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
  };

  const agruparPorSemanas = (contratos) => {
    const semanas = {
      "Semana 1 (Dias 1 a 7)": [],
      "Semana 2 (Dias 8 a 14)": [],
      "Semana 3 (Dias 15 a 21)": [],
      "Semana 4 (Dias 22 a 28)": [],
      "Semana 5 (Dias 29+)": [],
      "Sem Data de Fechamento": [] 
    };

    contratos.forEach((c) => {
      if (!c.dataFechamento) {
        semanas["Sem Data de Fechamento"].push(c);
      } else {
        const dia = parseInt(c.dataFechamento.split('-')[2], 10);
        if (dia <= 7) semanas["Semana 1 (Dias 1 a 7)"].push(c);
        else if (dia <= 14) semanas["Semana 2 (Dias 8 a 14)"].push(c);
        else if (dia <= 21) semanas["Semana 3 (Dias 15 a 21)"].push(c);
        else if (dia <= 28) semanas["Semana 4 (Dias 22 a 28)"].push(c);
        else semanas["Semana 5 (Dias 29+)"].push(c);
      }
    });
    return semanas;
  };

  const contratosAgrupados = agruparPorSemanas(listaFiltrada);

  const exportarExcelGeral = () => {
    const workbook = XLSX.utils.book_new();

    Object.keys(contratosAgrupados).forEach((nomeSemana) => {
      const contratosDaSemana = contratosAgrupados[nomeSemana];

      if (contratosDaSemana.length > 0) {
        const linhasGeral = contratosDaSemana.map((c) => {
          
          // Lógica de texto pro Excel (Taxa)
          const statusTaxa = c.statusTaxaFederal || 'Em Aberto';
          let infoTaxa = statusTaxa;
          if (Number(c.valorTaxaFederal) > 0) {
            infoTaxa = `R$ ${Number(c.valorTaxaFederal).toFixed(2)} - ${statusTaxa}`;
            if (statusTaxa === 'Pago' && c.dataPagTaxaFederal) {
              infoTaxa += ` (${c.formaPagTaxaFederal || 'S/N'} dia ${formatarDataBR(c.dataPagTaxaFederal)})`;
            } else if (statusTaxa === 'Em Aberto' && c.dataVencimentoTaxaFederal) {
              infoTaxa += ` (${c.formaPagTaxaFederal || 'S/N'} - Vence: ${formatarDataBR(c.dataVencimentoTaxaFederal)})`;
            }
          }

          // Lógica de texto pro Excel (Assessoria)
          const statusAss = c.statusAssessoria || 'Em Aberto';
          let infoAssessoria = `R$ ${Number(c.valorAssessoria || 0).toFixed(2)} - ${statusAss}`;
          if (statusAss === 'Pago' && c.dataPagAssessoria) {
            infoAssessoria += ` (${c.formaPagAssessoria || 'S/N'} dia ${formatarDataBR(c.dataPagAssessoria)})`;
          } else if (statusAss === 'Em Aberto' && c.dataVencimentoAssessoria) {
             infoAssessoria += ` (${c.formaPagAssessoria || 'S/N'} - Vence: ${formatarDataBR(c.dataVencimentoAssessoria)})`;
          }

          return {
            'COLABORADOR': c.vendedor || '-',
            'MARCAS': c.marca || '-',
            'TELEFONE': c.telefone || '-',
            'FECHADO EM': formatarDataBR(c.dataFechamento) || 'Sem Data',
            'TAXA / VALOR / DATA': infoTaxa,
            'N* CONTRATO': c.contrato || '-',
            'N* OS': c.os || '-',
            'OBSERVAÇÃO': c.observacao || '-',
            'VALOR DE CONTRATO': infoAssessoria
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(linhasGeral);
        XLSX.utils.book_append_sheet(workbook, worksheet, nomeSemana);
      }
    });

    if (workbook.SheetNames.length === 0) {
      alert("Nenhum contrato encontrado nesta competência para gerar a planilha!");
      return;
    }

    XLSX.writeFile(workbook, `Fechamento_Geral_Mes_${mesFiltro}.xlsx`);
  };

  const imprimirPDFGeral = () => {
    window.print();
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div className="container-geral" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1300px', margin: '0 auto' }}>
        
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
          <h2 style={{ color: '#333', margin: 0 }}>📋 Planilha Geral (Por Semanas)</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Competência:</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option>
              <option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option>
              <option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option>
              <option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={imprimirPDFGeral} style={btnPdf}>📄 Imprimir / PDF</button>
            <button onClick={exportarExcelGeral} style={btnExcel}>📊 Baixar Excel Semanal</button>
            <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
          </div>
        </div>

        <div className="no-print" style={{ marginBottom: '20px' }}>
          <input type="text" placeholder="🔍 Filtrar planilha por marca, vendedor ou contrato..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }} />
        </div>

        {Object.keys(contratosAgrupados).map((nomeSemana) => {
          const contratosDaSemana = contratosAgrupados[nomeSemana];
          if (contratosDaSemana.length === 0) return null;

          return (
            <div key={nomeSemana} style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
              <h3 className="titulo-semana" style={{ backgroundColor: '#0284c7', color: 'white', padding: '10px 15px', borderRadius: '6px 6px 0 0', margin: 0, fontSize: '16px' }}>
                {nomeSemana}
              </h3>
              
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tabela-print" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #94a3b8', minWidth: '1100px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                      <th style={thStyle}>COLABORADOR</th>
                      <th style={thStyle}>MARCAS</th>
                      <th style={thStyle}>FECHADO EM</th>
                      <th style={thStyle}>TAXA / VALOR / DATA</th>
                      <th style={thStyle}>Nº CONTRATO</th>
                      <th style={thStyle}>VALOR DE CONTRATO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratosDaSemana.map((c, index) => {
                      const statusAss = c.statusAssessoria || 'Em Aberto';
                      const statusTaxa = c.statusTaxaFederal || 'Em Aberto';

                      return (
                        <tr key={c.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ ...tdStyle, fontWeight: 'bold', color: '#0284c7' }}>{c.vendedor}</td>
                          <td style={tdStyle}>{c.marca}</td>
                          <td style={{ ...tdStyle, color: '#475569', fontWeight: 'bold' }}>{formatarDataBR(c.dataFechamento) || '-'}</td>
                          
                          <td style={tdStyle}>
                            <strong>R$ {Number(c.valorTaxaFederal || 0).toFixed(2)}</strong> <br/>
                            <span className="badge-status" style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', backgroundColor: statusTaxa === 'Pago' ? '#d4edda' : '#fff3cd', color: statusTaxa === 'Pago' ? '#155724' : '#856404', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>
                              {statusTaxa} 
                              {statusTaxa === 'Pago' && c.dataPagTaxaFederal ? ` (${c.formaPagTaxaFederal} dia ${formatarDataBR(c.dataPagTaxaFederal)})` : ''}
                              {statusTaxa === 'Em Aberto' && c.dataVencimentoTaxaFederal ? ` (${c.formaPagTaxaFederal || 'Boleto'} - Vence: ${formatarDataBR(c.dataVencimentoTaxaFederal)})` : ''}
                            </span>
                          </td>
                          
                          <td style={{ ...tdStyle, fontWeight: 'bold' }}>{c.contrato || '-'}</td>
                          
                          <td style={tdStyle}>
                            <strong>R$ {Number(c.valorAssessoria || 0).toFixed(2)}</strong> <br/>
                            <span className="badge-status" style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', backgroundColor: statusAss === 'Pago' ? '#d4edda' : '#fff3cd', color: statusAss === 'Pago' ? '#155724' : '#856404', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>
                              {statusAss} 
                              {statusAss === 'Pago' && c.dataPagAssessoria ? ` (${c.formaPagAssessoria} dia ${formatarDataBR(c.dataPagAssessoria)})` : ''}
                              {statusAss === 'Em Aberto' && c.dataVencimentoAssessoria ? ` (${c.formaPagAssessoria || 'Boleto'} - Vence: ${formatarDataBR(c.dataVencimentoAssessoria)})` : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {listaFiltrada.length === 0 && <p style={{ textAlign: 'center', marginTop: '30px', color: '#64748b' }}>Nenhum contrato encontrado nesta competência.</p>}
      </div>

      <style>
        {`
          @media print {
            body { background-color: white !important; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .container-geral { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
            .tabela-print { border-collapse: collapse !important; width: 100% !important; margin-bottom: 20px !important; }
            .titulo-semana { background-color: #0284c7 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border: 1px solid #0284c7; }
            .tabela-print th { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 8px !important; }
            .tabela-print td { padding: 6px !important; font-size: 11px !important; border: 1px solid #ddd !important; }
            .badge-status { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}
      </style>
    </div>
  );
}

const thStyle = { padding: '12px 10px', textAlign: 'left', fontSize: '13px', border: '1px solid #cbd5e1' };
const tdStyle = { padding: '12px 10px', fontSize: '13px', border: '1px solid #e2e8f0' };
const btnPdf = { padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnExcel = { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' };

export default Geral;