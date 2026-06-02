import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function Relatorio() {
  const [vendasDiretas, setVendasDiretas] = useState({});
  const [representantes, setRepresentantes] = useState({});
  const [encarregadas, setEncarregadas] = useState({});
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
      const gruposVendaDireta = {};
      const gruposRepresentante = {};
      const gruposEncarregada = {};
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
        const representante = c.representante || '';
        const encarregada = c.encarregada || '';
        const valorBase = Number(c.valorAssessoria) || 0;
        
        const pVenda = Number(c.perVendaDireta) || 0;
        const pRep = Number(c.perRepresentante) || 0;
        const pEnc = Number(c.perEncarregada) || 0;
        const pBonus = Number(c.perBonusPagamento) || 0;
        const forma = c.formaPagAssessoria || '';

        let msgStatus = 'PAGO';
        if (c.statusAssessoria !== 'Pago') {
            if (c.statusTaxaFederal === 'Pago') {
                msgStatus = 'PAGOU SÓ A TAXA';
            } else {
                msgStatus = 'EM ABERTO';
            }
        }

        inicializarPessoa(gruposVendaDireta, vendedor);
        let ganhoVenda = msgStatus === 'PAGO' ? valorBase * (pVenda / 100) : 0;
        gruposVendaDireta[vendedor].transacoes.push({ ...c, percAplicado: pVenda, valorRecebido: ganhoVenda, aviso: msgStatus });
        gruposVendaDireta[vendedor].total += ganhoVenda;

        if (pRep > 0 && representante) {
          inicializarPessoa(gruposRepresentante, representante);
          let ganhoRep = msgStatus === 'PAGO' ? valorBase * (pRep / 100) : 0;
          gruposRepresentante[representante].transacoes.push({ ...c, tipo: `Da equipe de: ${vendedor}`, percAplicado: pRep, valorRecebido: ganhoRep, aviso: msgStatus });
          gruposRepresentante[representante].total += ganhoRep;
        }

        if (pEnc > 0 && encarregada) {
          inicializarPessoa(gruposEncarregada, encarregada);
          let ganhoEnc = msgStatus === 'PAGO' ? valorBase * (pEnc / 100) : 0;
          gruposEncarregada[encarregada].transacoes.push({ ...c, tipo: `Da equipe de: ${vendedor}`, percAplicado: pEnc, valorRecebido: ganhoEnc, aviso: msgStatus });
          gruposEncarregada[encarregada].total += ganhoEnc;
        }

        const formasAceitas = ['Cartão de Crédito', 'Cartão de Débito', 'Cartão Recorrente', 'Pix', 'Boleto'];
        if (formasAceitas.includes(forma) && pBonus > 0) {
          inicializarPessoa(gruposBonus, vendedor);
          const ganhoBonus = msgStatus === 'PAGO' ? valorBase * (pBonus / 100) : 0;
          gruposBonus[vendedor].transacoes.push({ ...c, aviso: msgStatus, percAplicado: pBonus, valorRecebido: ganhoBonus });
          gruposBonus[vendedor].total += ganhoBonus;
        }
      });

      setVendasDiretas(gruposVendaDireta);
      setRepresentantes(gruposRepresentante);
      setEncarregadas(gruposEncarregada);
      setBonusPagamento(gruposBonus); // O estado continua existindo para alimentar o Excel!
    });

    return () => unsubscribe();
  }, [mesFiltro]);

  const exportarExcelComissoes = async () => {
    const workbook = new ExcelJS.Workbook();

    const criarAba = (nomeAba, corHex, dadosAgrupados, isLideranca = false) => {
      if (Object.keys(dadosAgrupados).length === 0) return;
      const sheet = workbook.addWorksheet(nomeAba);

      let colIndex = 1;
      if (isLideranca) sheet.getColumn(colIndex++).width = 25; 
      sheet.getColumn(colIndex++).width = 30; 
      sheet.getColumn(colIndex++).width = 20; 
      sheet.getColumn(colIndex++).width = 15; 
      sheet.getColumn(colIndex++).width = 20; 
      sheet.getColumn(colIndex++).width = 15; 
      sheet.getColumn(colIndex++).width = 25; 

      Object.entries(dadosAgrupados).forEach(([nomePessoa, dados]) => {
        const tituloRow = sheet.addRow([`${isLideranca ? 'LÍDER' : 'VENDEDOR(A)'}: ${nomePessoa.toUpperCase()}`]);
        const lastCol = isLideranca ? 7 : 6;
        sheet.mergeCells(tituloRow.number, 1, tituloRow.number, lastCol);
        tituloRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
        tituloRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corHex.replace('#', 'FF') } };
        tituloRow.alignment = { vertical: 'middle', horizontal: 'center' };

        const headers = isLideranca
          ? ['VENDA DE', 'MARCA', 'Nº CONTRATO', 'Nº OS', 'VALOR BASE', '% APLICADA', 'COMISSÃO A PAGAR']
          : ['MARCA', 'Nº CONTRATO', 'Nº OS', 'VALOR BASE', '% APLICADA', 'COMISSÃO A PAGAR'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FF333333' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };

        dados.transacoes.forEach((t) => {
          let rowData = [];
          if (isLideranca) rowData.push(t.vendedor || '-');
          
          rowData.push(t.marca || '-');

          if (t.aviso === 'PAGO') {
            rowData.push(t.contrato || '-');
            rowData.push(t.os || '-'); 
            rowData.push(Number(t.valorAssessoria));
            rowData.push(`${t.percAplicado}%`);
            rowData.push(Number(t.valorRecebido));
          } else {
            rowData.push(t.aviso);
            rowData.push(t.os || '-');
            rowData.push('-');
            rowData.push('-');
            rowData.push(0);
          }

          const row = sheet.addRow(rowData);
          const colOffset = isLideranca ? 1 : 0;

          if (t.aviso !== 'PAGO') {
            row.getCell(2 + colOffset).font = { bold: true, color: { argb: t.aviso === 'EM ABERTO' ? 'FFDC3545' : 'FFFD7E14' } };
          } else {
            row.getCell(4 + colOffset).numFmt = '"R$" #,##0.00';
            row.getCell(6 + colOffset).numFmt = '"R$" #,##0.00';
            row.getCell(6 + colOffset).font = { bold: true, color: { argb: 'FF28A745' } };
          }
        });

        const totalRow = sheet.addRow([]);
        const colOffset = isLideranca ? 1 : 0;
        
        const cellTexto = totalRow.getCell(5 + colOffset);
        cellTexto.value = 'TOTAL A RECEBER:';
        cellTexto.font = { bold: true, color: { argb: 'FF28A745' } };
        cellTexto.alignment = { horizontal: 'right' };

        const cellValor = totalRow.getCell(6 + colOffset);
        cellValor.value = Number(dados.total);
        cellValor.numFmt = '"R$" #,##0.00';
        cellValor.font = { bold: true, color: { argb: 'FF28A745' } };

        sheet.addRow([]);
      });
    };

    // A MÁGICA CONTINUA AQUI: O Excel puxa a aba de Bônus mesmo ela não aparecendo na tela!
    const criarAbaBonus = (nomeAba, corHex, dadosAgrupados) => {
      if (Object.keys(dadosAgrupados).length === 0) return;
      const sheet = workbook.addWorksheet(nomeAba);

      sheet.getColumn(1).width = 30; 
      sheet.getColumn(2).width = 20; 
      sheet.getColumn(3).width = 15; 
      sheet.getColumn(4).width = 25; 
      sheet.getColumn(5).width = 20; 
      sheet.getColumn(6).width = 15; 
      sheet.getColumn(7).width = 25; 

      Object.entries(dadosAgrupados).forEach(([nomePessoa, dados]) => {
        const tituloRow = sheet.addRow([`VENDEDOR(A): ${nomePessoa.toUpperCase()}`]);
        sheet.mergeCells(tituloRow.number, 1, tituloRow.number, 7);
        tituloRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
        tituloRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corHex.replace('#', 'FF') } };
        tituloRow.alignment = { vertical: 'middle', horizontal: 'center' };

        const headers = ['MARCA', 'Nº CONTRATO', 'Nº OS', 'FORMA PAGAMENTO', 'VALOR BASE', '% BÔNUS', 'BÔNUS A PAGAR'];
        const headerRow = sheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FF333333' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };

        dados.transacoes.forEach((t) => {
          let rowData = [t.marca || '-'];

          if (t.aviso === 'PAGO') {
            rowData.push(t.contrato || '-');
            rowData.push(t.os || '-');
            rowData.push(t.formaPagAssessoria || '-');
            rowData.push(Number(t.valorAssessoria));
            rowData.push(`${t.percAplicado}%`);
            rowData.push(Number(t.valorRecebido));
          } else {
            rowData.push(t.aviso);
            rowData.push(t.os || '-');
            rowData.push(t.formaPagAssessoria || '-');
            rowData.push('-');
            rowData.push('-');
            rowData.push(0);
          }

          const row = sheet.addRow(rowData);
          if (t.aviso !== 'PAGO') {
            row.getCell(2).font = { bold: true, color: { argb: t.aviso === 'EM ABERTO' ? 'FFDC3545' : 'FFFD7E14' } };
          } else {
            row.getCell(5).numFmt = '"R$" #,##0.00';
            row.getCell(7).numFmt = '"R$" #,##0.00';
            row.getCell(7).font = { bold: true, color: { argb: 'FF28A745' } };
          }
        });

        const totalRow = sheet.addRow([]);
        const cellTexto = totalRow.getCell(6);
        cellTexto.value = 'TOTAL DE BÔNUS:';
        cellTexto.font = { bold: true, color: { argb: 'FFFD7E14' } };
        cellTexto.alignment = { horizontal: 'right' };

        const cellValor = totalRow.getCell(7);
        cellValor.value = Number(dados.total);
        cellValor.numFmt = '"R$" #,##0.00';
        cellValor.font = { bold: true, color: { argb: 'FFFD7E14' } };

        sheet.addRow([]);
      });
    };

    criarAba('Comissões', '#28a745', vendasDiretas, false);
    criarAba('Representantes', '#007bff', representantes, true);
    criarAba('Encarregadas', '#6f42c1', encarregadas, true);
    criarAbaBonus('Bônus Cartão', '#fd7e14', bonusPagamento);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Comissoes_Mes_${mesFiltro}.xlsx`);
  };

  const renderTabela = (titulo, corBg, dadosAgrupados, isLideranca = false) => {
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
              <table className="tabela-print" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {isLideranca && <th style={thStyle}>VENDA DE</th>}
                    <th style={thStyle}>MARCA / DATAS</th>
                    <th style={thStyle}>CONTRATO / OS</th>
                    <th style={thStyle}>VALOR BASE</th>
                    <th style={thStyle}>% APLICADA</th>
                    <th style={thStyle}>COMISSÃO A PAGAR</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.transacoes.map((t, index) => (
                    <tr key={index} style={{ backgroundColor: t.aviso !== 'PAGO' ? '#fdf8f5' : 'transparent' }}>
                      {isLideranca && <td style={{...tdStyle, color: '#666', fontStyle: 'italic'}}>{t.vendedor}</td>}
                      
                      {t.aviso === 'PAGO' ? (
                        <>
                          <td style={tdStyle}>
                            <strong>{t.marca}</strong><br/>
                            <span style={{fontSize: '11px', color: '#64748b'}}>Fechou: {formatarDataBR(t.dataFechamento) || '-'}</span><br/>
                            <span style={{fontSize: '11px', color: '#155724', fontWeight: 'bold'}}>Pagou: {formatarDataBR(t.dataPagAssessoria) || '-'}</span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 'bold' }}>CT: {t.contrato || '-'}<br/><span style={{fontSize: '12px', fontWeight: 'normal'}}>OS: {t.os || '-'}</span></td>
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
                          <td colSpan="4" style={{...tdStyle, textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px', color: t.aviso === 'EM ABERTO' ? '#dc3545' : '#fd7e14', whiteSpace: 'nowrap' }}>
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
    <div className="container-bg" style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div className="container-white" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
          
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>📊 Relatório de Comissões</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Contratos em aberto constam apenas como aviso visual e não somam no total.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Mês Referência:</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarExcelComissoes} style={btnExcel}>📊 Excel Comissões</button>
            <button onClick={window.print} style={btnPdf}>📄 Imprimir PDF</button>
            <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
          </div>
        </div>
        
        {Object.keys(vendasDiretas).length === 0 && Object.keys(representantes).length === 0 && Object.keys(encarregadas).length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc'}}>
            <p style={{color: '#666', fontSize: '16px', margin: 0}}>Nenhum contrato encontrado para este mês.</p>
          </div>
        ) : (
          <>
            {renderTabela('🟢 Comissões de Vendas Diretas', '#28a745', vendasDiretas, false)}
            {renderTabela('🔵 Comissões de Representantes', '#007bff', representantes, true)}
            {renderTabela('🟣 Comissões de Encarregadas', '#6f42c1', encarregadas, true)}
          </>
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
const btnExcel = { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' };
const thStyle = { padding: '10px', textAlign: 'left', border: '1px solid #000', fontSize: '13px' };
const tdStyle = { padding: '10px', textAlign: 'left', border: '1px solid #000', fontSize: '13px' };

export default Relatorio;