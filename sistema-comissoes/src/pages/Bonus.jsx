import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function Bonus() {
  const [bonusPagamento, setBonusPagamento] = useState({});
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);

  const formatarDataBR = (dataString) => {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
  };

  useEffect(() => {
    const q = query(collection(db, 'lancamentos'), orderBy('dataLancamento', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gruposBonus = {};

      const inicializarPessoa = (grupo, nome) => {
        if (!grupo[nome]) grupo[nome] = { transacoes: [], total: 0 };
      };

      const contratosDoMes = querySnapshot.docs.filter((doc) => {
        const c = doc.data();
        let mesReferencia = -1;
        
        if (c.statusAssessoria === 'Pago' && c.dataPagAssessoria) {
          mesReferencia = parseInt(c.dataPagAssessoria.split('-')[1], 10);
        } else if (c.dataFechamento) {
          mesReferencia = parseInt(c.dataFechamento.split('-')[1], 10);
        } else if (c.dataLancamento) {
          mesReferencia = typeof c.dataLancamento.toDate === 'function' 
            ? c.dataLancamento.toDate().getMonth() + 1 
            : new Date(c.dataLancamento).getMonth() + 1;
        } else {
          mesReferencia = new Date().getMonth() + 1;
        }
        
        return mesReferencia === Number(mesFiltro);
      });

      contratosDoMes.forEach((doc) => {
        const c = doc.data();
        const vendedor = c.vendedor || 'Desconhecido';
        const valorBase = Number(c.valorAssessoria) || 0;
        const pBonus = Number(c.perBonusPagamento) || 0; 
        const forma = c.formaPagAssessoria || '';

        const formasAceitas = ['Cartão de Crédito', 'Cartão de Débito', 'Cartão Recorrente', 'Pix', 'Boleto'];

        if (formasAceitas.includes(forma)) {
          
          // MÁGICA ATUALIZADA: IDENTIFICA SE PAGOU SÓ A TAXA
          let msgStatus = 'PAGO';
          if (c.statusAssessoria !== 'Pago') {
              if (c.statusTaxaFederal === 'Pago') {
                  msgStatus = 'PAGOU SÓ A TAXA';
              } else {
                  msgStatus = 'EM ABERTO';
              }
          }

          const valorGanho = msgStatus === 'PAGO' ? valorBase * (pBonus / 100) : 0;

          inicializarPessoa(gruposBonus, vendedor);
          gruposBonus[vendedor].transacoes.push({ 
            ...c, 
            aviso: msgStatus, 
            percAplicado: pBonus, 
            valorRecebido: valorGanho 
          });
          gruposBonus[vendedor].total += valorGanho;
        }
      });

      setBonusPagamento(gruposBonus);
    });

    return () => unsubscribe();
  }, [mesFiltro]);

  const exportarExcelBonus = async () => {
    const workbook = new ExcelJS.Workbook();

    if (Object.keys(bonusPagamento).length > 0) {
      const sheet = workbook.addWorksheet('Bônus Especiais');

      sheet.columns = [
        { header: 'VENDEDOR(A)', key: 'nome', width: 25 },
        { header: 'MARCA', key: 'marca', width: 30 },
        { header: 'SITUAÇÃO / CONTRATO', key: 'situacao', width: 25 },
        { header: 'FORMA PAGAMENTO', key: 'forma', width: 25 },
        { header: 'FECHADO EM', key: 'fechou', width: 15 },
        { header: 'PAGO EM', key: 'pagou', width: 15 },
        { header: 'VALOR BASE', key: 'base', width: 15 },
        { header: '% BÔNUS', key: 'perc', width: 15 },
        { header: 'BÔNUS A PAGAR', key: 'comissao', width: 20 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFD7E14' } }; 
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      Object.entries(bonusPagamento).forEach(([nomePessoa, dados]) => {
        dados.transacoes.forEach((t) => {
          const linhaDado = {
            nome: nomePessoa,
            marca: t.marca,
            forma: t.formaPagAssessoria,
            fechou: t.dataFechamento ? formatarDataBR(t.dataFechamento) : 'Sem Data'
          };

          if (t.aviso === 'PAGO') {
            linhaDado.situacao = t.contrato || '-';
            linhaDado.pagou = t.dataPagAssessoria ? formatarDataBR(t.dataPagAssessoria) : '-';
            linhaDado.base = Number(t.valorAssessoria);
            linhaDado.perc = t.percAplicado + '%';
            linhaDado.comissao = Number(t.valorRecebido);
          } else {
            linhaDado.situacao = t.aviso;
            linhaDado.pagou = '-';
            linhaDado.base = '-';
            linhaDado.perc = '-';
            linhaDado.comissao = 0;
          }

          const row = sheet.addRow(linhaDado);

          if (t.aviso !== 'PAGO') {
            // COLORE O EXCEL DE LARANJA SE FOR TAXA E VERMELHO SE FOR EM ABERTO
            row.getCell('situacao').font = { 
              bold: true, 
              color: { argb: t.aviso === 'EM ABERTO' ? 'FFDC3545' : 'FFFD7E14' } 
            };
          } else {
            row.getCell('base').numFmt = '"R$" #,##0.00';
            row.getCell('comissao').numFmt = '"R$" #,##0.00';
            row.getCell('comissao').font = { bold: true, color: { argb: 'FF28A745' } }; 
          }
        });
        sheet.addRow({}); 
      });
    } else {
      alert("Nenhum bônus encontrado para este mês.");
      return;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bonus_Pagamentos_Mes_${mesFiltro}.xlsx`);
  };

  const renderTabelaBonus = (titulo, corBg, dadosAgrupados) => {
    if (Object.keys(dadosAgrupados).length === 0) return null;
    return (
      <div style={{ marginBottom: '50px' }}>
        <h3 style={{ borderBottom: `3px solid ${corBg}`, paddingBottom: '10px', color: '#333' }}>{titulo}</h3>
        {Object.entries(dadosAgrupados).map(([nome, dados]) => (
          <div key={nome} style={{ marginBottom: '30px' }}>
            <div style={{ backgroundColor: corBg, padding: '10px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', fontSize: '18px', color: '#fff' }} className="print-header-color">
              {nome.toUpperCase()}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabela-print" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={thStyle}>MARCA / DATAS</th>
                    <th style={thStyle}>CONTRATO / OS</th>
                    <th style={thStyle}>FORMA DE PAGAMENTO</th>
                    <th style={thStyle}>VALOR BASE</th>
                    <th style={thStyle}>% APLICADA</th>
                    <th style={thStyle}>BÔNUS A PAGAR</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.transacoes.map((t, index) => (
                    <tr key={index} style={{ backgroundColor: t.aviso !== 'PAGO' ? '#fdf8f5' : 'transparent' }}>
                      
                      {t.aviso === 'PAGO' ? (
                        <>
                          <td style={tdStyle}>
                            <strong>{t.marca}</strong><br/>
                            <span style={{fontSize: '11px', color: '#64748b'}}>Fechou: {formatarDataBR(t.dataFechamento) || '-'}</span><br/>
                            <span style={{fontSize: '11px', color: '#155724', fontWeight: 'bold'}}>Pagou: {formatarDataBR(t.dataPagAssessoria) || '-'}</span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 'bold' }}>CT: {t.contrato || '-'}<br/><span style={{fontSize: '12px', fontWeight: 'normal'}}>OS: {t.os || '-'}</span></td>
                          <td style={tdStyle}><strong>{t.formaPagAssessoria}</strong></td>
                          <td style={tdStyle}>R$ {Number(t.valorAssessoria).toFixed(2)}</td>
                          <td style={tdStyle}>{t.percAplicado}%</td>
                          <td style={{...tdStyle, color: '#28a745', fontWeight: 'bold', whiteSpace: 'nowrap'}}>R$ {t.valorRecebido.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td style={tdStyle}>
                            <strong>{t.marca}</strong><br/>
                            <span style={{fontSize: '11px', color: '#64748b'}}>Fechou: {formatarDataBR(t.dataFechamento) || '-'}</span>
                          </td>
                          {/* COLORE A FONTE BASEADO NA MENSAGEM */}
                          <td colSpan="5" style={{...tdStyle, textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px', color: t.aviso === 'EM ABERTO' ? '#dc3545' : '#fd7e14', whiteSpace: 'nowrap'}}>
                            {t.aviso}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ border: '1px solid #000', padding: '15px', borderRadius: '4px', backgroundColor: '#fafafa', width: '300px' }} className="print-total-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fd7e14', fontWeight: 'bold', fontSize: '18px' }}>
                  <span>TOTAL DE BÔNUS:</span>
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
    <div className="container-bg" style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div className="container-white" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
          
          <div>
            <h2 style={{ color: '#fd7e14', margin: 0 }}>🟠 Bônus Especiais por Pagamento</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Pix, Boletos e Cartões lançados pelo Financeiro.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Mês Referência:</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarExcelBonus} style={btnExcel}>📊 Excel de Bônus</button>
            <button onClick={window.print} style={btnPdf}>📄 Imprimir PDF</button>
            <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
          </div>
        </div>
        
        {Object.keys(bonusPagamento).length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc'}}>
            <p style={{color: '#666', fontSize: '16px', margin: 0}}>Nenhum bônus especial encontrado para este mês.</p>
          </div>
        ) : (
          renderTabelaBonus('🟠 Comissões de Bônus (Pix/Boleto/Cartão)', '#fd7e14', bonusPagamento)
        )}
      </div>

      <style>
        {`
          @media print {
            body { background-color: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .container-bg { padding: 0 !important; background-color: white !important; }
            .container-white { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
            
            .tabela-print { width: 100% !important; min-width: 100% !important; table-layout: auto !important; page-break-inside: auto; margin-bottom: 20px !important; }
            .tabela-print thead { display: table-header-group; }
            .tabela-print tr { page-break-inside: avoid; break-inside: avoid; }
            .tabela-print th, .tabela-print td { font-size: 11px !important; padding: 6px !important; }
            
            .print-header-color { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-after: avoid !important; break-after: avoid !important; }
            h3 { font-size: 16px !important; margin-bottom: 10px !important; page-break-after: avoid !important; break-after: avoid !important; }
            .print-total-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-top: 10px; page-break-inside: avoid; break-inside: avoid; }
          }
        `}
      </style>
    </div>
  );
}

const btnPdf = { padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnExcel = { padding: '10px 15px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' };
const thStyle = { padding: '10px', textAlign: 'left', border: '1px solid #000', fontSize: '13px' };
const tdStyle = { padding: '10px', textAlign: 'left', border: '1px solid #000', fontSize: '13px' };

export default Bonus;