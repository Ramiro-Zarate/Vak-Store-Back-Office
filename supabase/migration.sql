-- ============================================================
-- Vak Store Back Office · Migración
-- SOLO AGREGA UNA TABLA NUEVA. No modifica tablas existentes,
-- por lo que el ecommerce actual no se ve afectado.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla product_costs: costo por producto (centralizado)
-- ------------------------------------------------------------
create table if not exists public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) RLS sobre product_costs (solo accede el back office)
-- ------------------------------------------------------------
alter table public.product_costs enable row level security;

-- IMPORTANTE: reemplazá los dos emails por los de los administradores
create or replace function public.is_back_office_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'ramazara13@gmail.com',
    'valennnalvarez107@gmail.com'
  );
$$;

drop policy if exists "product_costs_select_admin" on public.product_costs;
create policy "product_costs_select_admin"
  on public.product_costs
  for select
  to authenticated
  using (public.is_back_office_admin());

drop policy if exists "product_costs_insert_admin" on public.product_costs;
create policy "product_costs_insert_admin"
  on public.product_costs
  for insert
  to authenticated
  with check (public.is_back_office_admin());

drop policy if exists "product_costs_update_admin" on public.product_costs;
create policy "product_costs_update_admin"
  on public.product_costs
  for update
  to authenticated
  using (public.is_back_office_admin())
  with check (public.is_back_office_admin());

drop policy if exists "product_costs_delete_admin" on public.product_costs;
create policy "product_costs_delete_admin"
  on public.product_costs
  for delete
  to authenticated
  using (public.is_back_office_admin());
