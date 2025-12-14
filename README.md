## API - Núbia Rocha
### Integrantes: Fernanda Barbosa Rodrigues, Gabriela Martins Matos Gomes, Heloísa Almeida Miranda, Kamila Santiago dos Santos e Luiza Emanuelle Soares Dias.

Este documento descreve a estrutura e funcionamento da API desenvolvida para gerenciamento de produtos musicais.

---

## Visão Geral

API RESTful desenvolvida com Node.js e Express, utilizando PostgreSQL (Neon.tech) para persistência de dados e Vercel Blob Storage para armazenamento de imagens. A autenticação é implementada via JWT com dois níveis de acesso: administradores comuns e Owner.

**Tecnologias principais:**
- Node.js + Express
- PostgreSQL (Neon.tech)
- JWT (autenticação)
- Vercel Blob Storage (imagens)
- Bcrypt (criptografia)
- Express Validator (validação)

---

## Estrutura de Arquivos

### Núcleo da Aplicação
- **`server.js`**: Inicializa o servidor Express, configura middlewares globais (CORS, JSON, URL-encoded) e registra as rotas.

### Bibliotecas (`lib/`)
- **`db.js`**: Pool de conexões PostgreSQL configurado via `DATABASE_URL`.
- **`blob.js`**: Funções para upload e remoção de imagens no Vercel Blob Storage. Exporta `uploadImageBuffer()`, `removeImage()` e `extractPathFromPublicUrl()`.

### Middlewares (`middlewares/`)
- **`authmw.js`**: Exporta `verificarAutenticacao()` (valida JWT e extrai dados do usuário) e `verificarAcessoOwner()` (restringe acesso apenas ao Owner).

### Rotas (`routes/`)
- **`public.js`**: Endpoints públicos (sem autenticação) para consulta de produtos.
- **`auth.js`**: Login e gerenciamento de perfil do administrador.
- **`admin.js`**: CRUD completo de produtos e administradores (requer autenticação).

---

## Banco de Dados

**Estrutura principal:**
- **`administrador`**: Credenciais e dados dos administradores (id, username, email, senha_hash).
- **`produto`**: Catálogo de produtos (id, nome, preco, imagens[], estoque).

---

## Autenticação

### Níveis de Acesso
1. **Público**: Qualquer usuário pode acessar rotas de consulta.
2. **Administrador**: Acesso via token JWT para operações CRUD.
3. **Owner**: Administrador especial (definido por `OWNER_ID` e `OWNER_EMAIL`) com permissões exclusivas.

### Fluxo de Autenticação
1. Login com `username` e `senha` retorna token JWT.
2. Token deve ser enviado no header: `Authorization: Bearer <token>`.
3. Middleware valida token e injeta dados do usuário em `req.userId`, `req.userEmail`, `req.userType`.

---

## Rotas da API

### Públicas (`/api`)

#### `GET /produtos`
Retorna lista de todos os produtos com id, nome, preço, imagens e estoque.

#### `GET /produtos/:id`
Retorna detalhes de um produto específico.

---

### Autenticação (`/api/auth`)

#### `POST /login`
**Body:** `{ username, senha }`  
**Retorna:** `{ token, userType }`  
Autentica administrador e retorna JWT.

#### `GET /perfil`
**Auth:** Requer token  
**Retorna:** Dados do administrador logado (id, username, email).

#### `PUT /perfil`
**Auth:** Requer token  
**Body:** `{ username?, email?, novaSenha?, senhaAtual }`  
Atualiza dados do perfil. Requer `senhaAtual` para alterações.

---

### Administrativas (`/api/admin`)

#### Produtos

**`POST /produtos`**  
**Auth:** Administrador  
**Body:** FormData com `nome`, `preco`, `estoque`, `imagens[]` (arquivos), `imagensToAdd` (base64)  
Cria novo produto e faz upload das imagens.

**`PUT /produtos/:id`**  
**Auth:** Administrador  
**Body:** FormData com `nome`, `preco`, `estoque`, `imagens[]`, `imagensToAdd`, `imagensToRemove`  
Atualiza produto, gerencia adição/remoção de imagens.

**`DELETE /produtos/:id`**  
**Auth:** Administrador  
Remove produto e todas as imagens associadas.

#### Administradores

**`POST /administradores`**  
**Auth:** Owner  
**Body:** `{ username, email, senha }`  
Cria novo administrador.

**`GET /administradores`**  
**Auth:** Owner  
Lista todos os administradores.

**`GET /administradores/:id`**  
**Auth:** Owner  
Retorna dados de um administrador específico.

**`PUT /administradores/:id`**  
**Auth:** Owner  
**Body:** `{ username?, email? }`  
Atualiza dados de um administrador.

**`DELETE /administradores/:id`**  
**Auth:** Owner  
Remove administrador (exceto Owner - id 1).

---

## Integração com Frontend

O frontend consome a API através de requisições HTTP:

1. **Produtos**: Requisições GET públicas para listagem e exibição.
2. **Autenticação**: Login retorna token que é armazenado (localStorage/sessionStorage) e enviado em requisições subsequentes.
3. **Gerenciamento**: Interfaces administrativas enviam FormData para upload de imagens e JSON para outros dados.
4. **Imagens**: URLs retornadas pela API apontam para Vercel Blob Storage e são usadas diretamente em elementos `<img>`.

### Validações
- Servidor valida todos os campos via `express-validator`.
- Erros retornam status HTTP apropriado com detalhes no body.
- Frontend exibe mensagens de erro e trata respostas de sucesso.

---

## Variáveis de Ambiente

- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Chave secreta para assinatura de tokens
- `OWNER_ID`: ID do administrador Owner
- `OWNER_EMAIL`: Email do administrador Owner
- `BLOB_READ_WRITE_TOKEN`: Token de acesso ao Vercel Blob Storage

---