-- ============================================================
-- Vak Store Back Office · Gastos y movimientos de plata
-- SOLO AGREGA UNA TABLA NUEVA. No modifica ninguna tabla del
-- ecommerce, por lo que la tienda no se ve afectada.
-- Requiere haber corrido primero supabase/migration.sql
-- (que crea la función public.is_back_office_admin()).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla expenses: gastos y retiros, con fondo de origen
--    fund: 'cost' (costo/reinversión), 'marketing' o 'profit' (ganancia)
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  category text not null default '',
  fund text not null check (fund in ('cost', 'marketing', 'profit')),
  amount numeric not null default 0,
  spent_at date not null default current_date,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_spent_at_idx on public.expenses (spent_at desc);
create index if not exists expenses_fund_idx on public.expenses (fund);

-- ------------------------------------------------------------
-- 2) RLS sobre expenses (solo accede el back office)
-- ------------------------------------------------------------
alter table public.expenses enable row level security;

drop policy if exists "expenses_select_admin" on public.expenses;
create policy "expenses_select_admin"
  on public.expenses
  for select
  to authenticated
  using (public.is_back_office_admin());

drop policy if exists "expenses_insert_admin" on public.expenses;
create policy "expenses_insert_admin"
  on public.expenses
  for insert
  to authenticated
  with check (public.is_back_office_admin());

drop policy if exists "expenses_update_admin" on public.expenses;
create policy "expenses_update_admin"
  on public.expenses
  for update
  to authenticated
  using (public.is_back_office_admin())
  with check (public.is_back_office_admin());

drop policy if exists "expenses_delete_admin" on public.expenses;
create policy "expenses_delete_admin"
  on public.expenses
  for delete
  to authenticated
  using (public.is_back_office_admin());
