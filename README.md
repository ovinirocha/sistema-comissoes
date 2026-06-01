# 📊 Sistema de Gestão de Comissões e Faturamento

Uma aplicação Full-Stack desenvolvida para resolver problemas reais de contabilidade e gestão de vendas: a separação entre o **Regime de Competência** (quando a venda é realizada) e o **Regime de Caixa** (quando o dinheiro entra na conta da empresa).

---

# 🚀 O Problema Resolvido

Sistemas comuns costumam misturar a data de assinatura do contrato com a data de pagamento da comissão.

Neste projeto, foi criada uma inteligência financeira que protege o caixa da empresa e automatiza o repasse de valores de forma precisa.

## ✅ Planilha Geral (Visão Gerencial)

- Contratos registrados e organizados
- Separação automática por semanas do mês
- Ordenação inteligente por data e ordem alfabética

## ✅ Relatório de Comissões (Visão Financeira)

A comissão padrão:

- Venda Direta
- Representantes
- Encarregadas

Só é calculada quando o contrato muda para o status **"Pago"**.

Contratos:

- Pendentes
- "Só a Taxa"

Recebem avisos visuais personalizados para facilitar a comunicação da equipe financeira.

## ✅ Sistema de Bônus Especiais

Lógica separada para:

- Pix
- Boletos
- Cartões

Com exportações exclusivas para manter o caixa principal limpo e organizado.

---

# 🛠️ Tecnologias Utilizadas

## Front-end

- **React + Vite** → Interface rápida, moderna e responsiva
- **React Router** → Navegação entre múltiplas páginas
- **ExcelJS & File-Saver** → Exportação profissional em `.xlsx`
- **CSS Print (`@media print`)** → Geração de PDFs otimizados
- **Netlify** → Deploy contínuo

## Back-end & Banco de Dados

- **Firebase Firestore** → Banco NoSQL em tempo real
- **Firebase Authentication** → Controle de acesso baseado em permissões

---

# ⚙️ Principais Funcionalidades

## 1. Lançamento Inteligente (UX Financeira)

O formulário se adapta dinamicamente às ações do usuário.

Campos sensíveis aparecem apenas quando necessários, reduzindo erros humanos no preenchimento.

---

## 2. Exportação Profissional em Excel

A aplicação gera planilhas profissionais com:

- Cabeçalhos personalizados
- Cores automáticas
- Formatação condicional
- Múltiplas abas
- Organização semanal

Status financeiros recebem destaque visual:

- 🟢 PAGO
- 🟠 SÓ A TAXA
- 🔴 EM ABERTO

---

## 3. Cálculo de Lideranças

Distribuição automática e independente de porcentagens para:

- Venda Direta
- Representantes
- Encarregadas

---

## 4. Proteção Anti-Calote

Travas de segurança impedem:

- Exclusão indevida
- Alterações após compensação financeira

---

## 5. Divisão Semanal Automática

O sistema distribui contratos automaticamente pelas semanas do mês:

- Dias 1 a 7
- Dias 8 a 14
- Dias 15 a 21
- Dias 22 a 31

---

# 👨‍💻 Como rodar localmente

## 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
```

Entre na pasta do projeto:

```bash
cd seu-repositorio
```

---

## 2. Instale as dependências

Instale as dependências principais:

```bash
npm install
```

Instale as bibliotecas adicionais:

```bash
npm install exceljs file-saver react-router-dom
```

---

## 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
```

---

## 4. Inicie o servidor local

```bash
npm run dev
```

O projeto estará disponível em:

```txt
http://localhost:5173
```

---

# 🔐 Controle de Permissões

O sistema possui diferentes níveis de acesso:

## 👤 Vendedores

- Cadastro de contratos
- Visualização básica

## 💰 Financeiro

- Controle de porcentagens
- Validação de pagamentos
- Exclusão de registros
- Gestão completa do faturamento

---

# 📦 Exportações

O sistema permite:

- Exportação Excel formatada
- Separação por semanas
- Relatórios financeiros
- Relatórios de bônus
- Impressão otimizada para PDF

---

# ☕ Desenvolvido com foco em regras de negócios reais
