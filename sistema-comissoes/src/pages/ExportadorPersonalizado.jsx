import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function ExportadorPersonalizado() {
  const [contratos, setContratos] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  
  // Mapeamento de todas as colunas disponíveis no banco de dados
  const colunasDisponiveis = [
    { id: 'vendedor', label: 'Vendedor / Colaborador' },
    { id: 'marca', label: 'Nome da Marca' },
    { id: 'telefone', label: 'Telefone do Cliente' },
    { id: 'dataFechamento', label: 'Data de Fechamento' },
    { id: 'contrato', label: 'Número do Contrato' },
    { id: 'os', label: 'Número da OS' },
    { id: 'valorAssessoria', label: 'Valor da Assessoria' },
    { id: 'formaPagAssessoria', label: 'Forma de Pagamento' },
    { id: 'statusAssessoria', label: 'Status da Assessoria' },
    { id: 'dataPagAssessoria', label: 'Data do Pagamento' },
    { id: 'valorTaxaFederal', label: 'Valor da Taxa Federal' },
    { id: 'statusTaxaFederal', label: 'Status da Taxa Federal' },
    { id: 'observacao', label: 'Observações Internas' }
  ];

  // Estado para controlar quais colunas começam marcadas (true) ou desmarcadas (false)
  const [colunasSelecionadas, setColunasSelecionadas] = useState({
    vendedor: true,
    marca: true,
    telefone: false,
    dataFechamento: false,
    contrato: false,
    os: false,
    valorAssessoria: false,
    formaPagAssessoria: false,
    statusAssessoria: false,
    dataPagAssessoria: false,
    valorTaxaFederal: false,
    statusTaxaFederal: false,
    observacao: false
  });

  useEffect(() => {
    const q = query(collection(db, 'lancamentos'), orderBy('dataLancamento', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setContratos(lista);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleColuna = (id) => {
    setColunasSelecionadas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatarDataBR = (dataString) => {
    if (!dataString) return '-';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataString;
  };

  const exportarPlanilhaDinamica = async () => {
    // Filtra apenas os objetos de colunas que o usuário marcou como true
    const colunasAtivas = colunasDisponiveis.filter(col => colunasSelecionadas[col.id]);

    if (colunasAtivas.length === 0) {
      alert("Por favor, selecione pelo menos uma coluna para exportar!");
      return;
    }

    // Filtra os contratos do mês selecionado
    const contratosFiltrados = contratos.filter((c) => {
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

    if (contratosFiltrados.length === 0) {
      alert("Nenhum contrato encontrado para este mês.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Exportação Customizada');

    // Monta dinamicamente as colunas no ExcelJS baseado no que foi selecionado
    sheet.columns = colunasAtivas.map(col => ({
      header: col.label.toUpperCase(),
      key: col.id,
      width: 25
    }));

    // Estiliza o cabeçalho com um tom Indigo/Roxo bem corporativo
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Insere os dados linha por linha
    contratosFiltrados.forEach((c) => {
      const linhaDado = {};
      
      colunasAtivas.forEach(col => {
        let valor = c[col.id];
        
        // Formatações específicas em tempo de execução
        if (col.id === 'dataFechamento' || col.id === 'dataPagAssessoria') {
          valor = formatarDataBR(valor);
        } else if (col.id === 'valorAssessoria' || col.id === 'valorTaxaFederal') {
          valor = Number(valor) || 0;
        } else if (!valor) {
          valor = '-';
        }

        linhaDado[col.id] = valor;
      });

      const row = sheet.addRow(linhaDado);

      // Se a coluna for de valores, aplica a máscara de R$ na célula correspondente
      colunasAtivas.forEach((col, idx) => {
        if (col.id === 'valorAssessoria' || col.id === 'valorTaxaFederal') {
          const cell = row.getCell(idx + 1);
          cell.numFmt = '"R$" #,##0.00';
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Planilha_Customizada_Mes_${mesFiltro}.xlsx`);
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ color: '#4f46e5', margin: 0 }}>🛠️ Exportador de Planilhas Personalizado</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Escolha as colunas desejadas para montar um arquivo Excel sob medida.</p>
          </div>
          <Link to="/painel" style={btnVoltar}>⬅ Voltar</Link>
        </div>

        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Filtrar por Mês:</label>
          <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
            <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
          </select>
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #efefef', paddingBottom: '8px' }}>Selecione as Colunas que Devem Aparecer:</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', margin: '20px 0 35px 0' }}>
          {colunasDisponiveis.map((col) => (
            <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: colunasSelecionadas[col.id] ? '#f0f0ff' : '#fff', border: `1px solid ${colunasSelecionadas[col.id] ? '#4f46e5' : '#ccc'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <input type="checkbox" checked={colunasSelecionadas[col.id]} onChange={() => handleToggleColuna(col.id)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <span style={{ fontSize: '14px', fontWeight: colunasSelecionadas[col.id] ? 'bold' : 'normal', color: colunasSelecionadas[col.id] ? '#4f46e5' : '#333' }}>{col.label}</span>
            </label>
          ))}
        </div>

        <button onClick={exportarPlanilhaDinamica} style={btnGerar}>
          🚀 Gerar e Baixar Planilha Excel
        </button>

      </div>
    </div>
  );
}

const btnVoltar = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' };
const btnGerar = { width: '100%', padding: '15px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' };

export default ExportadorPersonalizado;