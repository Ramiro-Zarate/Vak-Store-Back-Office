-- ============================================================
-- Vak Store Back Office · RLS para escritura
-- ADITIVO: solo agrega permisos para los administradores.
-- No modifica políticas existentes ni el esquema.
-- Requiere haber corrido primero supabase/migration.sql
-- (que crea la función public.is_back_office_admin()).
-- Correr cuando quieras permitir que el back office
-- inserte/actualice órdenes, items y stock.
-- ============================================================

do $$
declare
  t text;
  policies text[] := array[
    'orders', 'order_items', 'product_variants', 'products', 'product_costs'
  ];
  ops text[] := array['select', 'insert', 'update'];
  op text;
  pol text;
begin
  foreach t in array policies loop
    foreach op in array ops loop
      pol := 'back_office_' || t || '_' || op;
      execute format('drop policy if exists %I on public.%I', pol, t);
      if op = 'select' then
        execute format(
          'create policy %I on public.%I for select to authenticated using (public.is_back_office_admin())',
          pol, t
        );
      elsif op = 'insert' then
        execute format(
          'create policy %I on public.%I for insert to authenticated with check (public.is_back_office_admin())',
          pol, t
        );
      else
        execute format(
          'create policy %I on public.%I for %s to authenticated using (public.is_back_office_admin()) with check (public.is_back_office_admin())',
          pol, t, op
        );
      end if;
    end loop;
  end loop;
end $$;
