📊 Sistema de Gestão de Comissões e Faturamento
Uma aplicação Full-Stack desenvolvida para resolver problemas reais de contabilidade e gestão de vendas: a separação entre o Regime de Competência (quando a venda é realizada) e o Regime de Caixa (quando o dinheiro entra na conta da empresa).

🚀 O Problema Resolvido
Sistemas comuns costumam misturar a data de assinatura do contrato com a data de pagamento da comissão. Neste projeto, criei uma inteligência financeira que blinda o caixa da empresa e automatiza o repasse de valores de forma cirúrgica:

Planilha Geral (Visão Gerencial): Contratos registrados e organizados em abas separadas por semanas do mês, com ordenação inteligente por data e ordem alfabética.

Relatório de Comissões (Visão Financeira): A comissão padrão (Venda Direta, Representantes e Encarregadas) só é calculada e somada quando o status do contrato muda para "Pago". Contratos pendentes ou que pagaram "Só a Taxa" aparecem como avisos visuais customizados para alinhar a comunicação com a equipe.

Sistema de Bônus Especiais: Uma lógica de negócios separada para comissões variáveis baseadas em formas de pagamento específicas (Pix, Boletos e Cartões), com página e exportações exclusivas para não poluir o caixa principal.

🛠️ Tecnologias Utilizadas
Front-end:

React + Vite: Interface rápida, moderna e responsiva.

React Router: Navegação fluida em Múltiplas Páginas (Painel, Planilha Geral, Comissões e Bônus).

ExcelJS & File-Saver: Motor de exportação profissional. Geração de planilhas Excel (.xlsx) com formatação condicional nativa, design de cabeçalhos, larguras ajustadas e divisão em múltiplas abas.

CSS Print (@media print): Arquitetura de estilização avançada para geração de PDFs pixel-perfect. O sistema oculta a interface web e otimiza as tabelas automaticamente para folhas A4, evitando quebras de página no meio das informações.

Netlify: Hospedagem e deploy contínuo.

Back-end & Banco de Dados:

Firebase Firestore: Banco de dados NoSQL real-time para salvar vendedores, contratos e gerenciar status de faturamento.

Firebase Authentication: Controle de acesso baseado em roles (funções). Vendedores têm permissões restritas (apenas lançamentos e visualização básica), enquanto o Perfil Financeiro tem acesso exclusivo para gerenciar porcentagens, validar pagamentos e excluir registros.

⚙️ Principais Funcionalidades
Lançamento Inteligente (UX Financeira): O formulário se adapta dinamicamente às ações do usuário. Campos sensíveis (como a % de Bônus) ficam ocultos e só aparecem magicamente caso a forma de pagamento selecionada permita essa bonificação, evitando erros humanos no preenchimento.

Exportação Profissional em Excel: Diferente de sistemas básicos que exportam CSVs crus, a aplicação gera planilhas coloridas e formatadas, colorindo dados financeiros de verde (PAGO) ou vermelho/laranja (EM ABERTO / SÓ A TAXA) para leitura rápida da gerência.

Cálculo de Lideranças: Distribuição automática e independente de porcentagens para a Venda Direta, os Representantes e as Encarregadas.

Proteção Anti-Calote: Travas no Front-end e verificação de status que impedem a exclusão ou alteração indevida de contratos que já tiveram valores compensados.

Divisão Semanal Automática: O motor de exportação varre os contratos e os distribui matematicamente pelas semanas do mês (Dias 1 a 7, Dias 8 a 14, etc.).

👨‍💻 Como rodar localmente
Clone o repositório:

Bash


git clone https://github.com/seu-usuario/seu-repositorio.git
Instale as dependências do Front-end:

Bash


npm install
npm install exceljs file-saver react-router-dom
Crie um arquivo .env na raiz do projeto com as suas credenciais do Firebase:

Snippet de código


VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
Inicie o servidor local:

Bash


npm run dev
Desenvolvido com ☕ e foco em regras de negócios reais.