# LivrariaVirtual
Projeto desenvolvido para prática de automação de API e Frontend.

## Estrutura do Projeto

## Backend

O backend é construído utilizando Node.js e Express. Ele também utiliza Supabase para autenticação e armazenamento de dados.

### Dependências

- express
- swagger-ui-express
- yamljs
- cors
- @supabase/supabase-js
- dotenv
- uuid

### Scripts

- `start`: Inicia o servidor.
- `dev`: Inicia o servidor com nodemon para desenvolvimento.

### Arquivo Principal

O arquivo principal do backend é [backend/index.js](backend/index.js).

### Configuração
Certifique-se de criar um arquivo `.env` no diretório `backend` com as seguintes variáveis:
```bash
SUPABASE_URL=your_supabase_url 
SUPABASE_ANON_KEY=your_supabase_anon_key
```


## Frontend

O frontend é construído utilizando React e Vite. Ele também utiliza Tailwind CSS para estilização.

### Dependências

- react
- react-dom
- react-router-dom
- @supabase/supabase-js
- lucide-react
- react-hot-toast
- zustand

### Scripts

- `dev`: Inicia o servidor de desenvolvimento.
- `build`: Compila o projeto para produção.
- `lint`: Executa o linter.
- `preview`: Visualiza a versão de produção.

### Arquivo Principal

O arquivo principal do frontend é [frontend/src/main.tsx](frontend/src/main.tsx).

### Configuração

Certifique-se de criar um arquivo `.env` no diretório `frontend` com as variáveis necessárias.

## Como Executar

1. Clone o repositório.
2. Instale as dependências do backend:
   ```sh
   cd backend
   npm install
   ```
3. Instale as dependências do frontend:
   ```sh
   cd frontend
   npm install
   ```
4. Inicie o backend:
   ```sh
   cd backend
   npm run dev
   ```
5. Inicie o frontend:
   ```sh
   cd frontend
   npm run dev
   ```
