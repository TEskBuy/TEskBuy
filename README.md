<p align="center">
  <img src="public/assets/img/logo-full.png" alt="TEskBuy" width="330">
</p>

<p align="center">
  A loja online angolana de eletrodomésticos, telemóveis, computadores,<br>
  livros e impressoras — novos e usados.
</p>

---

## O que é isto

E-commerce completo de ponta a ponta: catálogo, carrinho, favoritos, checkout com
métodos de pagamento angolanos, gestão de encomendas, controlo de stock com histórico
de movimentos e painel de gestão. Frontend sem framework, API em Express, dados e
autenticação no Supabase, publicado no Vercel.

Tudo em português de Angola — interface, mensagens de erro, moeda em kwanzas e
províncias reais no checkout.

## Stack

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend | HTML, CSS e JavaScript sem build | Carrega depressa em ligações lentas e não precisa de compilação |
| API | Node.js 20 + Express 4 | Uma única função serverless no Vercel |
| Dados | Supabase (PostgreSQL 17) | Row Level Security faz a autorização dentro da própria base de dados |
| Autenticação | Supabase Auth | Registo, sessões, recuperação de palavra-passe |
| Alojamento | Vercel | Estático no CDN, API em serverless |

## Estrutura

```
teskbuy/
├── index.js                   Ponto de entrada único (exporta a app Express)
├── server/
│   ├── app.js                 Express: segurança, CORS, rotas, estáticos
│   ├── index.js               Servidor para desenvolvimento local
│   ├── config/
│   │   ├── env.js             Variáveis de ambiente num só sítio
│   │   └── supabase.js        Clientes Supabase e contexto por pedido
│   ├── middleware/
│   │   ├── auth.js            Sessão opcional, exigir sessão, equipa, admin
│   │   ├── validar.js         Validação com Zod
│   │   ├── limites.js         Rate limiting
│   │   └── erro.js            Tratamento uniforme de erros
│   ├── routes/                Definição dos endpoints
│   ├── controllers/           Ligação entre HTTP e serviços
│   ├── services/              Regras de negócio e acesso a dados
│   └── utils/                 Esquemas, respostas, erros
├── public/
│   ├── index.html             Montra
│   ├── loja.html              Catálogo com filtros
│   ├── produto.html           Ficha de produto
│   ├── carrinho.html          Carrinho
│   ├── checkout.html          Finalizar encomenda
│   ├── encomendas.html        Histórico do cliente
│   ├── encomenda.html         Detalhe e percurso da encomenda
│   ├── favoritos.html         Lista de favoritos
│   ├── conta.html             Dados, moradas, segurança
│   ├── admin.html             Painel de gestão
│   ├── entrar.html            Entrar, registar, recuperar, nova palavra-passe
│   └── assets/
│       ├── css/teskbuy.css    Sistema visual completo
│       ├── js/api.js          Cliente da API com renovação de sessão
│       ├── js/estado.js       Carrinho e favoritos de visitante
│       ├── js/ui.js           Cabeçalho, rodapé, cartões, notificações
│       └── js/pagina-*.js     Um módulo por página
├── supabase/migrations/       Esquema versionado
├── scripts/                   Verificação de configuração e criação de admin
└── vercel.json                Rotas, cache e cabeçalhos de segurança
```

## Correr localmente

```bash
npm install
npm run check     # mostra a configuração activa
npm run dev       # http://localhost:3000
```

Funciona sem `.env`: os valores por omissão apontam para o Supabase da TEskBuy e usam
apenas a chave publicável. Para outro projecto ou outras taxas de entrega, copie
`.env.example` para `.env`.

## Modelo de segurança

A autorização não vive no Express — vive no PostgreSQL.

A API recebe o token de sessão de quem faz o pedido e cria um cliente Supabase com esse
token. Todas as consultas passam pelas políticas de Row Level Security, por isso a base
de dados aplica exactamente as mesmas regras venha o pedido da API ou directamente do
browser. Os middlewares (`exigirSessao`, `exigirEquipa`, `exigirAdmin`) são a primeira
barreira; o RLS é a que conta.

Operações sensíveis passam por funções `SECURITY DEFINER` que verificam o papel dentro
da base de dados:

- `place_order` — valida stock e preços actuais, aplica cupões, cria a encomenda e dá baixa no stock, tudo numa transacção
- `admin_adjust_stock` — só equipa
- `change_order_status` — equipa, ou o próprio cliente a cancelar uma encomenda ainda cancelável
- `admin_register_payment` — só equipa

As funções internas `adjust_stock` e `update_order_status` não são invocáveis por
clientes: o `EXECUTE` foi revogado a `anon` e `authenticated`.

Outras medidas: cabeçalhos com Helmet e Content Security Policy, CORS por lista de
domínios, rate limiting mais apertado na autenticação e nas escritas, validação de toda
a entrada com Zod, e resposta neutra na recuperação de palavra-passe para não revelar
que e-mails existem.

A `service_role` **não é necessária**. Se a definir, fica só no servidor.

## API

Todas as respostas seguem o mesmo formato:

```json
{ "sucesso": true, "dados": {}, "mensagem": "opcional", "paginacao": {} }
```

Erros trazem `{ "sucesso": false, "erro": { "codigo", "mensagem", "detalhes" } }`, com
mensagens escritas para o cliente ler.

### Autenticação — `/api/auth`

| Método | Caminho | O que faz |
|---|---|---|
| POST | `/registar` | Cria conta |
| POST | `/entrar` | Inicia sessão |
| POST | `/sair` | Termina sessão |
| POST | `/renovar` | Renova a sessão a partir do refresh token |
| GET | `/eu` | Perfil, favoritos e resumo do carrinho |
| POST | `/recuperar` | Envia e-mail de recuperação |
| POST | `/nova-palavra-passe` | Define nova palavra-passe a partir do e-mail |
| POST | `/alterar-palavra-passe` | Altera com confirmação da actual |

### Catálogo — `/api/catalogo` e `/api/produtos`

| Método | Caminho | Acesso |
|---|---|---|
| GET | `/catalogo/categorias` · `/catalogo/marcas` · `/catalogo/definicoes` | Público |
| POST · PATCH · DELETE | `/catalogo/categorias` | Equipa |
| GET | `/produtos` | Público — filtros `q`, `categoria`, `marca`, `condicao`, `preco_min`, `preco_max`, `destaque`, `apenas_com_stock`, `ordenar`, `pagina`, `limite` |
| GET | `/produtos/:slug` | Público |
| POST | `/produtos/:slug/avaliacoes` | Cliente |
| POST · PATCH · DELETE | `/produtos` | Equipa |

### Compra

| Método | Caminho | Acesso |
|---|---|---|
| GET · DELETE | `/carrinho` | Cliente |
| POST | `/carrinho/itens` | Cliente |
| PATCH · DELETE | `/carrinho/itens/:id` | Cliente |
| POST | `/carrinho/sincronizar` | Junta o carrinho do dispositivo à conta |
| GET · POST | `/favoritos` · `/favoritos/:produtoId` | Cliente |
| GET · POST | `/encomendas` | Cliente |
| GET | `/encomendas/:id` | Cliente (dono) ou equipa |
| POST | `/encomendas/:id/cancelar` | Cliente (dono) |

### Conta — `/api/utilizadores`

`GET` e `PATCH` em `/eu`; CRUD completo em `/eu/moradas`.

### Gestão — `/api/admin` (equipa)

`/painel`, `/encomendas`, `/encomendas/:id/estado`, `/stock/baixo`,
`/stock/movimentos`, `/cupoes`. Só administradores: `/utilizadores`,
`/utilizadores/:id/papel`, `/definicoes/:chave`.

## Níveis de acesso

| Papel | Pode |
|---|---|
| `cliente` | Comprar, gerir a própria conta, cancelar encomendas ainda pendentes |
| `gestor` | Tudo o anterior mais produtos, categorias, encomendas, stock e cupões |
| `admin` | Tudo, mais utilizadores, níveis de acesso e definições da loja |

Para criar o primeiro administrador, registe-se pelo site e corra no SQL Editor do
Supabase:

```sql
update public.profiles set role = 'admin' where email = 'o-seu@email.com';
```

## Publicar no Vercel

O `vercel.json` encaminha todos os pedidos para `index.js`, que exporta a aplicação
Express — o formato que a Vercel documenta para Express. O próprio Express trata do
resto: `/api/*` vai para a API e tudo o resto sai de `public/`, com cache imutável em
`/assets` e os cabeçalhos `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy` e `Permissions-Policy`.

Os links dos e-mails de confirmação e de recuperação usam o domínio real do pedido, por
isso funcionam mesmo antes de definir `SITE_URL`.

Falta um passo do lado do Supabase: em **Authentication → URL Configuration**,
acrescente o domínio do site em *Site URL* e em *Redirect URLs*
(`https://SEU-DOMINIO/**`). Sem isto o Supabase recusa os links de confirmação e o
registo falha.

## Base de dados

Projecto Supabase `TEskBuy-Group-Ltd` (`ipmzxiqmzcjvyxxyoisf`), com o esquema completo
versionado em `supabase/migrations/`. Ver `supabase/README.md` para o detalhe de cada
migração e para criar o primeiro administrador.

## Notas

- Preços em kwanzas, sem casas decimais — é como se escrevem preços em Angola.
- Entrega grátis acima de 250 000 Kz; 3 500 Kz em Luanda, 12 000 Kz nas restantes províncias. Configurável por variáveis de ambiente.
- Os telefones são validados no formato angolano (`+244 9XX XXX XXX`).
- Produtos sem fotografia mostram um cartão gerado com a identidade da marca, em vez de uma imagem partida.
- O checkout exige conta: é o que permite guardar o histórico e dar seguimento à encomenda.

---

TEskBuy Group Ltd · +244 943 277 184 · info@teskbuy.com
