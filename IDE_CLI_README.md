# 🚀 Guia de Exportação para IDE/CLI, Supabase & Vercel

Este guia descreve como exportar este projeto (SalesFlow), executá-lo localmente em qualquer IDE (como **VS Code**), configurar um banco de dados real em Nuvem usando o **Supabase** e publicá-lo de forma gratuita no **Vercel**.

---

## 📂 1. Estrutura de Arquivos Importantes de Sincronia

- `supabase-schema.sql`: Arquivo SQL contendo toda a modelagem de tabelas do banco de dados relacional.
- `/src/lib/supabase.ts`: Inicializador seguro do cliente Supabase.
- `/src/lib/supabaseSync.ts`: Controlador de sincronização bidirecional em tempo real.
- `vercel.json`: Arquivo de roteamento inteligente para deploy no Vercel (evita erros 404).

---

## 💻 2. Como Rodar Localmente (IDE / VS Code)

### Passo 1: Baixar e Extrair o ZIP do Projeto
Você pode exportar este projeto como um arquivo ZIP diretamente no menu de configurações do AI Studio e extraí-lo no seu computador.

### Passo 2: Instalar Dependências
Abra seu terminal no diretório da pasta do projeto e instale as dependências:
```bash
npm install
```

### Passo 3: Configurar Variáveis de Ambiente
Crie um arquivo na raiz do projeto chamado `.env` e configure conforme abaixo:
```env
# URL de homologação para o servidor (caso use backend)
APP_URL="http://localhost:3000"

# Credenciais do Supabase (Insira as chaves que você obterá no Passo 3)
VITE_SUPABASE_URL="https://seu-id-unico.supabase.co"
VITE_SUPABASE_ANON_KEY="sua_chave_public_anon_key"
```

### Passo 4: Executar o Servidor de Desenvolvimento
Rode o comando de inicialização local:
```bash
npm run dev
```
O sistema estará disponível em: `http://localhost:3000`.

---

## ⚡ 3. Configurando o Supabase (Banco de Dados em Nuvem)

O **Supabase** é uma excelente ferramenta "backend-as-a-service" que roda o poderoso **PostgreSQL** com suporte a bancos de dados em tempo real e autenticação.

### Passo 1: Criar sua Conta Gratuita
Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.

### Passo 2: Criar um Novo Projeto
No menu inicial, clique em **New Project**, preencha o nome do app (`SalesFlow`), configure a senha do banco de dados e selecione a região de servidores adequada (recomenda-se `sa-east-1` - São Paulo para menor latência).

### Passo 3: Obter as Chaves API
Assim que o seu projeto for provisionado, o painel do Supabase exibirá as informações de conexão:
- **Project URL** (Mapear na variável `VITE_SUPABASE_URL`)
- **API Key anon public** (Mapear na variável `VITE_SUPABASE_ANON_KEY`)

### Passo 4: Executar a Modelagem das Tabelas (Migration)
1. No menu lateral esquerdo do Supabase, clique em **SQL Editor** (ícone de terminal `>_`).
2. Clique em **New Query** (Nova Consulta).
3. Abra o arquivo local `supabase-schema.sql` gerado nesta raiz, copie todo o seu conteúdo e cole dentro do editor de SQL do Supabase.
4. Clique em **Run** no canto inferior direito.
5. Pronto! Todas as tabelas (`products`, `comandas`, `categories`, `unidades` e `notifications`) e políticas de permissão RLS foram criadas instantaneamente e estão prontas para gravação.

---

## 🚀 4. Como Hospedar Gratuitamente no Vercel

O **Vercel** é a melhor plataforma para hospedar o front-end deste aplicativo Vite/React.

### Método 1: Vinculando ao GitHub (Recomendado)
1. Salve o código em um diretório Git local e faça o upload para o seu repositório no **GitHub**, **GitLab** ou **Bitbucket**.
2. Acesse [vercel.com](https://vercel.com) e faça o login usando a conta do GitHub.
3. No painel inicial do Vercel, clique em **Add New...** -> **Project**.
4. Importe o repositório que você acabou de enviar do SalesFlow.
5. Em **Framework Preset**, o Vercel reconhecerá automaticamente como **Vite**.
6. Expanda a seção **Environment Variables** e adicione as variáveis de conexão do seu banco Supabase:
   - Nome: `VITE_SUPABASE_URL` | Valor: *Sua URL do Supabase*
   - Nome: `VITE_SUPABASE_ANON_KEY` | Valor: *Seu token anônimo*
7. Clique em **Deploy**. O Vercel gerará um link público seguro com HTTPS integrado para você usar em qualquer lugar!

### Método 2: Usando a CLI do Vercel
Se você prefere efetuar o deploy direto pelo terminal do seu computador:
1. Instale a CLI do Vercel globalmente:
   ```bash
   npm install -g vercel
   ```
2. Faça login pela linha de comando:
   ```bash
   vercel login
   ```
3. Inicie o deploy no diretório raiz do projeto:
   ```bash
   vercel
   ```
4. Siga as etapas na tela e, ao final, configure as variáveis de ambiente no dashboard criado na sua conta Vercel.

---

## 🔄 5. Sincronização Automática
Quando o aplicativo carregar e detectar as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o painel do administrador exibirá a opção **"Sair do Modo Sandbox"** ou **"Migrar para Banco na Nuvem"**, permitindo que você envie todo o seu progresso local e trabalhe inteiramente sincronizado com o PostgreSQL.
