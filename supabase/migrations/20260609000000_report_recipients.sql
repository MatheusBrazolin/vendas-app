-- ============================================================
-- REPORT RECIPIENTS: destinatarios do relatorio diario por email
-- ============================================================
-- Permite ao admin gerenciar (pela UI) quem recebe o relatorio de
-- fechamento de caixa, sem depender exclusivamente da env REPORT_EMAIL.
-- A resolucao final mescla: admins com email real + REPORT_EMAIL + esta tabela.

create table public.report_recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_report_recipients_active on public.report_recipients(active);

-- ------------------------------------------------------------
-- RLS: apenas admins gerenciam e leem destinatarios.
-- O cron usa o service-role client (bypassa RLS), entao continua lendo.
-- Reaproveita o helper is_admin() definido na migration de user_roles.
-- ------------------------------------------------------------
alter table public.report_recipients enable row level security;

create policy "admin_read_report_recipients" on public.report_recipients
  for select using (public.is_admin());

create policy "admin_insert_report_recipients" on public.report_recipients
  for insert with check (public.is_admin());

create policy "admin_update_report_recipients" on public.report_recipients
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin_delete_report_recipients" on public.report_recipients
  for delete using (public.is_admin());
