## API - Núbia Rocha
### Integrantes: Fernanda Barbosa Rodrigues, Gabriela Martins Matos Gomes, Heloísa Almeida Miranda, Kamila Santiago dos Santos e Luiza Emanuelle Soares Dias.

Este documento explica o funcionamento do back-end da API, suas rotas, autenticação, interação com o banco de dados, uso do Supabase para armazenamento de imagens, e como os arquivos se relacionam.

---

### Visão Geral

A API foi desenvolvida em Node.js usando Express, com autenticação JWT, validação de dados, e integração com banco de dados PostgreSQL hospedado na [neon.tech](https://neon.tech). O armazenamento de imagens utiliza o Supabase (CDN), pois o projeto é hospedado na Vercel via Github, e essa foi a solução encontrada para upload e acesso público de arquivos.

---

## Estrutura dos Arquivos

- **server.js**: Ponto de entrada da aplicação. Carrega variáveis de ambiente, configura middlewares, importa e registra as rotas públicas, administrativas e de autenticação.
- **lib/db.js**: Configura a conexão com o banco PostgreSQL usando a URL do ambiente.
- **lib/supabase.js**: Inicializa o cliente Supabase para upload, remoção e obtenção de URLs públicas de imagens.
- **middlewares/authmw.js**: Implementa autenticação JWT e verificação de acesso do Owner.
- **routes/public.js**: Rotas públicas para consulta de produtos, instrumentos e professores.
- **routes/admin.js**: Rotas administrativas para CRUD de produtos, instrumentos e professores. Requer autenticação.
- **routes/auth.js**: Rotas de login e perfil do administrador.

---

## Banco de Dados

O banco é PostgreSQL, hospedado na neon.tech. As principais tabelas são:

- **administrador**: Usuários administradores (login).
- **produto**: Produtos cadastrados, com nome, preço e imagens (array de URLs).
- **instrumento**: Instrumentos musicais.
- **professor**: Professores cadastrados.
- **professor_instrumento**: Relação entre professores e instrumentos.

---

## Supabase (CDN de Imagens)

O Supabase é usado para upload e armazenamento de imagens dos produtos. O bucket é configurado via variável de ambiente. Após o upload, a URL pública é obtida para ser salva no banco e acessada pelo frontend.

---

## Autenticação e Permissões

- **Autenticação JWT**: Usuários administradores fazem login e recebem um token JWT, que deve ser enviado nas rotas protegidas via header `Authorization: Bearer <token>`.
- **Owner**: Usuário especial identificado por ID e email definidos nas variáveis de ambiente. Apenas o Owner pode acessar certas rotas administrativas.
- **Rotas públicas**: Não exigem autenticação.
- **Rotas administrativas**: Exigem autenticação JWT válida.

---

## Rotas da API

### Rotas Públicas

#### Listar Produtos
- **URL**: `https://api-nr.vercel.app/api/produtos`
- **Método**: GET
- **Acesso**: Público
- **Descrição**: Retorna todos os produtos cadastrados, incluindo nome, preço e URLs das imagens.

#### Listar Instrumentos
- **URL**: `https://api-nr.vercel.app/api/instrumentos`
- **Método**: GET
- **Acesso**: Público
- **Descrição**: Retorna todos os instrumentos cadastrados.

#### Listar Professores
- **URL**: `https://api-nr.vercel.app/api/professores`
- **Método**: GET
- **Acesso**: Público
- **Descrição**: Retorna todos os professores e os instrumentos que cada um leciona.

---

### Rotas de Autenticação

#### Login
- **URL**: `https://api-nr.vercel.app/api/auth/login`
- **Método**: POST
- **Acesso**: Público
- **Body**:
```json
{
	"email": "email@exemplo.com",
	"senha": "senha"
}
```
- **Descrição**: Retorna um token JWT e o tipo de usuário (admin ou Owner).

#### Perfil do Administrador
- **URL**: `https://api-nr.vercel.app/api/auth/perfil`
- **Método**: GET
- **Acesso**: Autenticado (admin ou Owner)
- **Header**: `Authorization: Bearer <token>`
- **Descrição**: Retorna dados do administrador logado.

#### Atualizar Perfil
- **URL**: `https://api-nr.vercel.app/api/auth/perfil`
- **Método**: PUT
- **Acesso**: Autenticado
- **Body**: Pode conter email, novaSenha, senhaAtual
- **Descrição**: Permite atualizar email ou senha do administrador.

---

### Rotas Administrativas (CRUD)

Todas exigem autenticação JWT.

#### Produtos
- **Criar Produto**
	- **URL**: `https://api-nr.vercel.app/api/admin/produtos`
	- **Método**: POST
	- **Acesso**: Autenticado
	- **Body**: FormData com campos `nome`, `preco` e arquivos `imagens[]`

- **Editar Produto**
	- **URL**: `https://api-nr.vercel.app/api/admin/produtos/:id`
	- **Método**: PUT
	- **Acesso**: Autenticado
	- **Body**: FormData com campos `nome`, `preco` e arquivos `imagens[]`

- **Excluir Produto**
	- **URL**: `https://api-nr.vercel.app/api/admin/produtos/:id`
	- **Método**: DELETE
	- **Acesso**: Autenticado

#### Instrumentos
- **Criar Instrumento**
	- **URL**: `https://api-nr.vercel.app/api/admin/instrumentos`
	- **Método**: POST
	- **Acesso**: Autenticado
	- **Body**:
		```json
		{
			"nome": "Violão",
			"descricao": "Instrumento de cordas..."
		}
		```

- **Editar Instrumento**
	- **URL**: `https://api-nr.vercel.app/api/admin/instrumentos/:id`
	- **Método**: PUT
	- **Acesso**: Autenticado
	- **Body**: Igual ao POST

- **Excluir Instrumento**
	- **URL**: `https://api-nr.vercel.app/api/admin/instrumentos/:id`
	- **Método**: DELETE
	- **Acesso**: Autenticado

#### Professores
- **Criar Professor**
	- **URL**: `https://api-nr.vercel.app/api/admin/professores`
	- **Método**: POST
	- **Acesso**: Autenticado
	- **Body**:
		```json
		{
			"nome": "Fulano"
		}
		```

- **Listar Professores**
	- **URL**: `https://api-nr.vercel.app/api/admin/professores`
	- **Método**: GET
	- **Acesso**: Autenticado

- **Editar Professor**
	- **URL**: `https://api-nr.vercel.app/api/admin/professores/:id`
	- **Método**: PUT
	- **Acesso**: Autenticado
	- **Body**: Igual ao POST

- **Excluir Professor**
	- **URL**: `https://api-nr.vercel.app/api/admin/professores/:id`
	- **Método**: DELETE
	- **Acesso**: Autenticado

---

## Interação entre Arquivos

- **server.js** importa e registra todas as rotas e middlewares.
- **Rotas** usam funções de autenticação do `middlewares/authmw.js` para proteger endpoints.
- **Rotas** acessam o banco via `lib/db.js` (pool de conexões PostgreSQL).
- **Rotas administrativas** usam o Supabase via `lib/supabase.js` para upload/remover imagens.
- **Variáveis de ambiente** são carregadas via dotenv em todos os arquivos que precisam delas.

---

## Observações Finais

- O Supabase foi escolhido para armazenamento de imagens por ser compatível com Vercel e facilitar o acesso público via CDN.
- O banco de dados é hospedado na neon.tech, garantindo alta disponibilidade e integração com Node.js.
- O sistema de autenticação garante que apenas administradores autenticados (ou Owner) possam acessar rotas sensíveis.

---