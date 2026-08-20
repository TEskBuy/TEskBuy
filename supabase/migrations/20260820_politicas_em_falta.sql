-- ============================================================
-- Políticas em falta — afiliados e notificações
--
-- Descobertas nos registos do Postgres: a aprovação de uma candidatura de
-- afiliado e o aviso ao candidato falhavam com "new row violates row-level
-- security policy". As duas tabelas tinham RLS ligada e nenhuma regra de
-- escrita, por isso nem a equipa conseguia escrever.
-- ============================================================

-- Afiliados: só a equipa cria e altera. O próprio continua a ler o seu.
drop policy if exists afiliados_criacao on public.affiliates;
create policy afiliados_criacao on public.affiliates
  for insert to authenticated
  with check (is_staff());

drop policy if exists afiliados_gestao on public.affiliates;
create policy afiliados_gestao on public.affiliates
  for update to authenticated
  using (is_staff())
  with check (is_staff());

-- Notificações: a equipa pode dirigir um aviso a alguém. Os gatilhos
-- continuam a escrever pelo caminho de sempre, que não passa por aqui.
drop policy if exists notificacoes_criacao on public.notifications;
create policy notificacoes_criacao on public.notifications
  for insert to authenticated
  with check (is_staff());
