# 💰 Sistema de Gestão de Comissões

Uma aplicação web completa desenvolvida para modernizar, otimizar e assegurar o controle financeiro e o repasse de comissões de uma equipe de vendas. O sistema substitui o controle manual por uma plataforma responsiva, segura e em tempo real.

## 🚀 Sobre o Projeto

Este projeto foi construído para resolver um problema real de administração financeira: a necessidade de controlar contratos lançados por múltiplos vendedores, calculando automaticamente as porcentagens de comissão de acordo com a hierarquia da equipe (Venda Direta, Gerência e Filial).

O sistema conta com um **Controle de Acesso Baseado em Cargos (RBAC)**. Isso significa que a interface e as permissões mudam dependendo de quem faz o login:
- **Administrador (Financeiro):** Possui controle total para visualizar todos os contratos, alterar status de pagamento, adicionar vendedores, editar porcentagens e excluir registros.
- **Vendedor:** Possui uma visão restrita apenas aos dados essenciais para o seu dia a dia, garantindo o sigilo financeiro da empresa.

## ✨ Funcionalidades Principais

- **Autenticação Segura:** Login protegido através do Firebase Authentication.
- **Painel Dinâmico:** Atualização de dados em tempo real sem precisar recarregar a página.
- **Regras de Segurança (Backend):** O Firestore está configurado com regras estritas que impedem a exclusão ou alteração indevida de contratos por usuários não autorizados, mesmo que tentem burlar o frontend.
- **Notificações em Tela:** Feedbacks visuais e elegantes (Toasts) para ações de sucesso ou erro do usuário.
- **Design Responsivo:** A tabela de contratos e os formulários se adaptam perfeitamente a dispositivos móveis, permitindo o uso da equipe em campo.
- **Filtros e Buscas:** Barra de pesquisa inteligente para localizar contratos por marca ou vendedor instantaneamente.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React (com Vite para build ultrarrápido)
- **Banco de Dados:** Firebase Firestore (NoSQL, Real-time)
- **Autenticação:** Firebase Auth
- **Notificações:** React Hot Toast
- **Hospedagem:** Netlify (Deploy via CI/CD simplificado)

## 💻 Como rodar este projeto localmente

Siga as instruções abaixo para rodar o projeto na sua máquina:

### Pré-requisitos
- Node.js instalado (versão 20+ recomendada)
- Uma conta ativa no Firebase

### Passo a Passo

1. Clone o repositório:
```bash
git clone [https://github.com/ovinirocha/sistema-comissoes.git](https://github.com/ovinirocha/sistema-comissoes.git)