-- ============================================================
-- TEskBuy — Marketplace, Fase 1: fundações na base de dados
--
-- Esta migração NÃO altera nada do que já existe e funciona.
-- Só acrescenta: empresas/vendedores, afiliados, KYC, parcerias,
-- avaliações de vendedor, denúncias, mensagens, tickets de suporte,
-- notificações, auditoria, métodos de pagamento e preferências.
--
-- Os produtos actuais ficam com company_id NULL, o que significa
-- "vendido pela própria TEskBuy". Nada deixa de funcionar.
-- ============================================================

-- ── tipos ───────────────────────────────────────────────────

do $$ begin
  create type application_status as enum (
    'pendente', 'em_analise', 'info_pedida', 'aprovado', 'rejeitado', 'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type company_status as enum ('pendente', 'aprovada', 'rejeitada', 'suspensa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partnership_status as enum (
    'pendente', 'em_analise_admin', 'enviado_vendedor', 'aceite', 'recusado', 'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('nova', 'em_analise', 'resolvida', 'rejeitada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum (
    'aberto', 'em_analise', 'aguarda_empresa', 'aguarda_admin', 'resolvido', 'fechado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_kind as enum ('cliente_empresa', 'afiliado_empresa');
exception when duplicate_object then null; end $$;

-- ── empresas (vendedores/parceiros) ─────────────────────────

create table if not exists public.companies (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete restrict,
  name            text not null,
  slug            text not null unique,
  legal_name      text,
  tax_id          text,                       -- NIF
  email           text,
  phone           text,
  province        text default 'Luanda',
  municipality    text,
  address         text,
  logo_url        text,
  description     text,
  status          company_status not null default 'pendente',
  commission_rate numeric not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  rating          numeric not null default 0,
  rating_count    integer not null default 0,
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  suspended_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists companies_owner_idx  on public.companies(owner_id);
create index if not exists companies_status_idx on public.companies(status);

-- ── afiliados ───────────────────────────────────────────────

create table if not exists public.affiliates (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  code            text not null unique,
  status          company_status not null default 'pendente',
  commission_rate numeric not null default 5 check (commission_rate >= 0 and commission_rate <= 100),
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- ── candidaturas (vendedor e afiliado) ──────────────────────
-- O mesmo quadro serve os dois pedidos; "kind" distingue-os.

create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('vendedor', 'afiliado')),
  status        application_status not null default 'pendente',
  payload       jsonb not null default '{}'::jsonb,   -- dados da empresa ou do afiliado
  admin_note    text,                                  -- o que falta, motivo da recusa
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  company_id    uuid references public.companies(id),  -- preenchido quando aprovado
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists applications_user_idx   on public.applications(user_id);
create index if not exists applications_status_idx on public.applications(status);

-- ── KYC ─────────────────────────────────────────────────────

create table if not exists public.kyc_submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  full_name      text not null,
  document_type  text not null,          -- BI, passaporte, NIF da empresa…
  document_number text not null,
  birth_date     date,
  address        text,
  status         application_status not null default 'pendente',
  admin_note     text,
  reviewed_by    uuid references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists kyc_user_idx   on public.kyc_submissions(user_id);
create index if not exists kyc_status_idx on public.kyc_submissions(status);

create table if not exists public.kyc_documents (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.kyc_submissions(id) on delete cascade,
  kind          text not null,           -- frente_bi, verso_bi, comprovativo_morada…
  storage_path  text not null,           -- caminho no Supabase Storage, nunca o ficheiro
  mime          text,
  created_at    timestamptz not null default now()
);

-- ── produtos pertencem a uma empresa ────────────────────────
-- NULL = vendido pela própria TEskBuy (todos os produtos actuais).

alter table public.products
  add column if not exists company_id uuid references public.companies(id) on delete restrict;
create index if not exists products_company_idx on public.products(company_id);

-- Moderação: os produtos de parceiros ficam à espera de aprovação.
-- Os que já existem entram como 'aprovado' para nada desaparecer da loja.
do $$ begin
  create type product_moderation as enum ('pendente', 'aprovado', 'rejeitado');
exception when duplicate_object then null; end $$;

alter table public.products
  add column if not exists moderation_status product_moderation not null default 'aprovado',
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;
create index if not exists products_moderacao_idx on public.products(moderation_status);

alter table public.order_items
  add column if not exists company_id uuid references public.companies(id);

-- ── parcerias afiliado ↔ empresa ────────────────────────────

create table if not exists public.affiliate_partnerships (
  id                uuid primary key default gen_random_uuid(),
  affiliate_id      uuid not null references public.affiliates(user_id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  status            partnership_status not null default 'pendente',
  commission_rate   numeric check (commission_rate >= 0 and commission_rate <= 100),
  message           text,                -- o que o afiliado escreveu no pedido
  admin_note        text,
  admin_reviewed_by uuid references public.profiles(id),
  admin_reviewed_at timestamptz,
  company_note      text,
  company_decided_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (affiliate_id, company_id)
);
create index if not exists partnerships_status_idx on public.affiliate_partnerships(status);

-- Produtos concretos que a empresa autorizou. Sem linhas = todos os da empresa.
create table if not exists public.affiliate_partnership_products (
  partnership_id uuid not null references public.affiliate_partnerships(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  primary key (partnership_id, product_id)
);

-- Vendas atribuídas a um afiliado, para calcular comissões.
create table if not exists public.affiliate_sales (
  id                uuid primary key default gen_random_uuid(),
  affiliate_id      uuid not null references public.affiliates(user_id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  order_id          uuid not null references public.orders(id) on delete cascade,
  order_item_id     uuid references public.order_items(id) on delete set null,
  amount            numeric not null default 0,
  commission_rate   numeric not null default 0,
  commission_amount numeric not null default 0,
  status            text not null default 'pendente'
                    check (status in ('pendente', 'confirmada', 'paga', 'anulada')),
  created_at        timestamptz not null default now()
);
create index if not exists affiliate_sales_aff_idx on public.affiliate_sales(affiliate_id);

-- ── avaliações do vendedor ──────────────────────────────────
-- Só quem comprou àquela empresa pode avaliar: a chave única por
-- (empresa, utilizador, encomenda) impede avaliações repetidas.

create table if not exists public.seller_reviews (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  reply       text,                       -- resposta da empresa
  replied_at  timestamptz,
  is_approved boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, user_id, order_id)
);

-- ── denúncias ───────────────────────────────────────────────

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  company_id  uuid references public.companies(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  reason      text not null,              -- mau_estado, diferente_descricao, falsificado…
  description text,
  status      report_status not null default 'nova',
  resolution  text,
  handled_by  uuid references public.profiles(id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status);

create table if not exists public.report_attachments (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  mime         text,
  created_at   timestamptz not null default now()
);

-- ── mensagens cliente/afiliado ↔ empresa ────────────────────
-- O administrador não participa nestas conversas, por desenho.

create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  kind         conversation_kind not null,
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject      text,
  last_message_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (kind, company_id, user_id)
);

create table if not exists public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists conv_messages_idx on public.conversation_messages(conversation_id, created_at);

-- ── tickets empresa ↔ administrador ─────────────────────────

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('TK-' || upper(substr(md5(random()::text), 1, 8))),
  company_id   uuid not null references public.companies(id) on delete cascade,
  opened_by    uuid not null references public.profiles(id) on delete cascade,
  subject      text not null,
  category     text not null,
  status       ticket_status not null default 'aberto',
  assigned_to  uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tickets_status_idx on public.support_tickets(status);

create table if not exists public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── notificações ────────────────────────────────────────────
-- user_id NULL = notificação para a equipa (administradores e gestores).

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  audience   text not null default 'utilizador'
             check (audience in ('utilizador', 'equipa', 'empresa')),
  company_id uuid references public.companies(id) on delete cascade,
  type       text not null,               -- nova_denuncia, pedido_vendedor, venda…
  title      text not null,
  body       text,
  link       text,
  meta       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read_at);
create index if not exists notifications_team_idx on public.notifications(audience, read_at);

-- ── auditoria ───────────────────────────────────────────────

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,              -- produto.criado, vendedor.aprovado…
  entity      text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_entity_idx on public.audit_log(entity, entity_id);
create index if not exists audit_created_idx on public.audit_log(created_at desc);

-- ── métodos de pagamento e preferências ─────────────────────
-- Nunca guardamos números de cartão: só o que o provedor devolve
-- (identificador do método) e os últimos dígitos, para mostrar.

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  kind        text not null,              -- multicaixa, transferencia, numerario…
  label       text not null,
  details     jsonb not null default '{}'::jsonb,
  provider_ref text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  check (user_id is not null or company_id is not null)
);

create table if not exists public.user_preferences (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  language           text not null default 'pt',
  notify_email       boolean not null default true,
  notify_platform    boolean not null default true,
  updated_at         timestamptz not null default now()
);

-- ── funções de apoio ────────────────────────────────────────

-- Empresa aprovada de que este utilizador é dono.
create or replace function public.minha_empresa()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.companies
   where owner_id = auth.uid() and status = 'aprovada'
   limit 1;
$$;

-- Deixa um aviso no painel da equipa. Usada pelos gatilhos abaixo.
create or replace function public.notificar_equipa(
  p_type text, p_title text, p_body text, p_link text default null, p_meta jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = public
as $$
  insert into public.notifications (audience, type, title, body, link, meta)
  values ('equipa', p_type, p_title, p_body, p_link, p_meta);
$$;

-- É afiliado aprovado?
create or replace function public.sou_afiliado()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.affiliates
     where user_id = auth.uid() and status = 'aprovada'
  );
$$;

-- ── Row Level Security ──────────────────────────────────────

alter table public.companies                     enable row level security;
alter table public.affiliates                    enable row level security;
alter table public.applications                  enable row level security;
alter table public.kyc_submissions               enable row level security;
alter table public.kyc_documents                 enable row level security;
alter table public.affiliate_partnerships        enable row level security;
alter table public.affiliate_partnership_products enable row level security;
alter table public.affiliate_sales               enable row level security;
alter table public.seller_reviews                enable row level security;
alter table public.reports                       enable row level security;
alter table public.report_attachments            enable row level security;
alter table public.conversations                 enable row level security;
alter table public.conversation_messages         enable row level security;
alter table public.support_tickets               enable row level security;
alter table public.ticket_messages               enable row level security;
alter table public.notifications                 enable row level security;
alter table public.audit_log                     enable row level security;
alter table public.payment_methods               enable row level security;
alter table public.user_preferences              enable row level security;

-- Empresas: toda a gente vê as aprovadas; o dono vê a sua; a equipa vê tudo.
drop policy if exists companies_leitura on public.companies;
create policy companies_leitura on public.companies for select
  using (status = 'aprovada' or owner_id = auth.uid() or public.is_staff());

drop policy if exists companies_dono_actualiza on public.companies;
create policy companies_dono_actualiza on public.companies for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists companies_admin_insere on public.companies;
create policy companies_admin_insere on public.companies for insert
  with check (public.is_admin());

-- Afiliados: cada um vê o seu; a equipa vê todos.
drop policy if exists affiliates_leitura on public.affiliates;
create policy affiliates_leitura on public.affiliates for select
  using (user_id = auth.uid() or public.is_staff());

-- Candidaturas: cada um vê e cria as suas; só a equipa decide.
drop policy if exists applications_leitura on public.applications;
create policy applications_leitura on public.applications for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists applications_insercao on public.applications;
create policy applications_insercao on public.applications for insert
  with check (user_id = auth.uid());

drop policy if exists applications_equipa_actualiza on public.applications;
create policy applications_equipa_actualiza on public.applications for update
  using (public.is_staff()) with check (public.is_staff());

-- KYC: dados sensíveis. Só o próprio e a equipa.
drop policy if exists kyc_leitura on public.kyc_submissions;
create policy kyc_leitura on public.kyc_submissions for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists kyc_insercao on public.kyc_submissions;
create policy kyc_insercao on public.kyc_submissions for insert
  with check (user_id = auth.uid());

drop policy if exists kyc_docs_leitura on public.kyc_documents;
create policy kyc_docs_leitura on public.kyc_documents for select
  using (exists (
    select 1 from public.kyc_submissions s
     where s.id = submission_id and (s.user_id = auth.uid() or public.is_staff())
  ));

drop policy if exists kyc_docs_insercao on public.kyc_documents;
create policy kyc_docs_insercao on public.kyc_documents for insert
  with check (exists (
    select 1 from public.kyc_submissions s
     where s.id = submission_id and s.user_id = auth.uid()
  ));

-- Parcerias: o afiliado, a empresa envolvida e a equipa.
drop policy if exists parcerias_leitura on public.affiliate_partnerships;
create policy parcerias_leitura on public.affiliate_partnerships for select
  using (
    affiliate_id = auth.uid()
    or company_id = public.minha_empresa()
    or public.is_staff()
  );

drop policy if exists parcerias_afiliado_cria on public.affiliate_partnerships;
create policy parcerias_afiliado_cria on public.affiliate_partnerships for insert
  with check (affiliate_id = auth.uid() and public.sou_afiliado());

drop policy if exists parcerias_decisao on public.affiliate_partnerships;
create policy parcerias_decisao on public.affiliate_partnerships for update
  using (company_id = public.minha_empresa() or public.is_staff())
  with check (company_id = public.minha_empresa() or public.is_staff());

-- Comissões: o afiliado vê as suas, a empresa as dela.
drop policy if exists comissoes_leitura on public.affiliate_sales;
create policy comissoes_leitura on public.affiliate_sales for select
  using (affiliate_id = auth.uid() or company_id = public.minha_empresa() or public.is_staff());

-- Avaliações de vendedor: públicas quando aprovadas.
drop policy if exists seller_reviews_leitura on public.seller_reviews;
create policy seller_reviews_leitura on public.seller_reviews for select
  using (is_approved or user_id = auth.uid() or company_id = public.minha_empresa() or public.is_staff());

drop policy if exists seller_reviews_insercao on public.seller_reviews;
create policy seller_reviews_insercao on public.seller_reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders o
       where o.id = order_id and o.user_id = auth.uid() and o.status = 'entregue'
    )
  );

drop policy if exists seller_reviews_resposta on public.seller_reviews;
create policy seller_reviews_resposta on public.seller_reviews for update
  using (company_id = public.minha_empresa() or public.is_staff())
  with check (company_id = public.minha_empresa() or public.is_staff());

-- Denúncias: quem denuncia vê a sua; a empresa vê as que lhe dizem respeito.
drop policy if exists reports_leitura on public.reports;
create policy reports_leitura on public.reports for select
  using (user_id = auth.uid() or company_id = public.minha_empresa() or public.is_staff());

drop policy if exists reports_insercao on public.reports;
create policy reports_insercao on public.reports for insert
  with check (user_id = auth.uid());

drop policy if exists reports_equipa on public.reports;
create policy reports_equipa on public.reports for update
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists report_anexos on public.report_attachments;
create policy report_anexos on public.report_attachments for select
  using (exists (
    select 1 from public.reports r
     where r.id = report_id and (r.user_id = auth.uid() or public.is_staff())
  ));

-- Conversas: só quem participa. O administrador NÃO entra aqui.
drop policy if exists conversas_leitura on public.conversations;
create policy conversas_leitura on public.conversations for select
  using (user_id = auth.uid() or company_id = public.minha_empresa());

drop policy if exists conversas_criacao on public.conversations;
create policy conversas_criacao on public.conversations for insert
  with check (user_id = auth.uid());

drop policy if exists conversa_msg_leitura on public.conversation_messages;
create policy conversa_msg_leitura on public.conversation_messages for select
  using (exists (
    select 1 from public.conversations c
     where c.id = conversation_id
       and (c.user_id = auth.uid() or c.company_id = public.minha_empresa())
  ));

drop policy if exists conversa_msg_envio on public.conversation_messages;
create policy conversa_msg_envio on public.conversation_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (c.user_id = auth.uid() or c.company_id = public.minha_empresa())
    )
  );

-- Tickets: a empresa que abriu e a equipa.
drop policy if exists tickets_leitura on public.support_tickets;
create policy tickets_leitura on public.support_tickets for select
  using (company_id = public.minha_empresa() or public.is_staff());

drop policy if exists tickets_criacao on public.support_tickets;
create policy tickets_criacao on public.support_tickets for insert
  with check (company_id = public.minha_empresa());

drop policy if exists tickets_actualiza on public.support_tickets;
create policy tickets_actualiza on public.support_tickets for update
  using (company_id = public.minha_empresa() or public.is_staff())
  with check (company_id = public.minha_empresa() or public.is_staff());

drop policy if exists ticket_msg_leitura on public.ticket_messages;
create policy ticket_msg_leitura on public.ticket_messages for select
  using (exists (
    select 1 from public.support_tickets t
     where t.id = ticket_id and (t.company_id = public.minha_empresa() or public.is_staff())
  ));

drop policy if exists ticket_msg_envio on public.ticket_messages;
create policy ticket_msg_envio on public.ticket_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
       where t.id = ticket_id and (t.company_id = public.minha_empresa() or public.is_staff())
    )
  );

-- Notificações: as minhas, as da minha empresa, e as da equipa se for equipa.
drop policy if exists notificacoes_leitura on public.notifications;
create policy notificacoes_leitura on public.notifications for select
  using (
    user_id = auth.uid()
    or (audience = 'equipa' and public.is_staff())
    or (audience = 'empresa' and company_id = public.minha_empresa())
  );

drop policy if exists notificacoes_marcar_lida on public.notifications;
create policy notificacoes_marcar_lida on public.notifications for update
  using (
    user_id = auth.uid()
    or (audience = 'equipa' and public.is_staff())
    or (audience = 'empresa' and company_id = public.minha_empresa())
  )
  with check (true);

-- Auditoria: só a equipa lê. Ninguém apaga.
drop policy if exists auditoria_equipa on public.audit_log;
create policy auditoria_equipa on public.audit_log for select using (public.is_staff());

-- Métodos de pagamento e preferências: só o próprio.
drop policy if exists pagamentos_proprio on public.payment_methods;
create policy pagamentos_proprio on public.payment_methods for all
  using (user_id = auth.uid() or company_id = public.minha_empresa())
  with check (user_id = auth.uid() or company_id = public.minha_empresa());

drop policy if exists preferencias_proprio on public.user_preferences;
create policy preferencias_proprio on public.user_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── produtos: um vendedor só mexe nos seus ──────────────────
-- Acrescenta-se uma política; as que já existem para a equipa mantêm-se.

drop policy if exists produtos_vendedor on public.products;
create policy produtos_vendedor on public.products for all
  using (company_id is not null and company_id = public.minha_empresa())
  with check (company_id is not null and company_id = public.minha_empresa());

-- A leitura pública passa a exigir moderação aprovada. O dono da empresa
-- continua a ver os seus, mesmo por aprovar, para os poder corrigir.
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (
    (is_active = true and moderation_status = 'aprovado')
    or public.is_staff()
    or (company_id is not null and company_id = public.minha_empresa())
  );

-- Um parceiro nunca aprova o seu próprio produto: o estado de moderação
-- só a equipa o move.
create or replace function public.trg_moderacao_produto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.moderation_status := 'pendente';
      new.is_featured := false;
    elsif new.moderation_status is distinct from old.moderation_status then
      new.moderation_status := old.moderation_status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists moderacao_produto on public.products;
create trigger moderacao_produto before insert or update on public.products
  for each row execute function public.trg_moderacao_produto();

create or replace function public.trg_produto_para_moderar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is not null and new.moderation_status = 'pendente' then
    perform public.notificar_equipa(
      'produto_moderacao',
      'Novo produto à espera de aprovação',
      new.name,
      '/admin?sep=moderacao',
      jsonb_build_object('product_id', new.id, 'company_id', new.company_id)
    );
  end if;
  return null;
end $$;

drop trigger if exists produto_para_moderar on public.products;
create trigger produto_para_moderar after insert on public.products
  for each row execute function public.trg_produto_para_moderar();

-- ── notificar a equipa automaticamente ──────────────────────

create or replace function public.trg_nova_candidatura()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notificar_equipa(
    'candidatura_' || new.kind,
    'Novo pedido para ser ' || new.kind,
    'Há uma candidatura à espera de análise.',
    '/admin?sep=candidaturas',
    jsonb_build_object('application_id', new.id, 'user_id', new.user_id)
  );
  return new;
end $$;

drop trigger if exists nova_candidatura on public.applications;
create trigger nova_candidatura after insert on public.applications
  for each row execute function public.trg_nova_candidatura();

create or replace function public.trg_nova_denuncia()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notificar_equipa(
    'denuncia',
    'Nova denúncia',
    coalesce(new.reason, 'Um cliente apresentou uma denúncia.'),
    '/admin?sep=denuncias',
    jsonb_build_object('report_id', new.id)
  );
  return new;
end $$;

drop trigger if exists nova_denuncia on public.reports;
create trigger nova_denuncia after insert on public.reports
  for each row execute function public.trg_nova_denuncia();

create or replace function public.trg_novo_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notificar_equipa(
    'ticket',
    'Nova solicitação de uma empresa',
    new.subject,
    '/admin?sep=tickets',
    jsonb_build_object('ticket_id', new.id, 'company_id', new.company_id)
  );
  return new;
end $$;

drop trigger if exists novo_ticket on public.support_tickets;
create trigger novo_ticket after insert on public.support_tickets
  for each row execute function public.trg_novo_ticket();

-- ── média de avaliação da empresa ───────────────────────────

create or replace function public.trg_media_vendedor()
returns trigger language plpgsql security definer set search_path = public as $$
declare alvo uuid;
begin
  -- Numa eliminação o registo NEW não existe; tem de vir do OLD.
  if tg_op = 'DELETE' then alvo := old.company_id; else alvo := new.company_id; end if;
  update public.companies c
     set rating = coalesce((
           select round(avg(r.rating)::numeric, 2) from public.seller_reviews r
            where r.company_id = alvo and r.is_approved
         ), 0),
         rating_count = (
           select count(*) from public.seller_reviews r
            where r.company_id = alvo and r.is_approved
         )
   where c.id = alvo;
  return null;
end $$;

drop trigger if exists media_vendedor on public.seller_reviews;
create trigger media_vendedor after insert or update or delete on public.seller_reviews
  for each row execute function public.trg_media_vendedor();
