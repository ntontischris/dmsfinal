-- Γυρίσματα: νέα καρτέλα «Επόμενες 7 ημέρες» (week) στη λίστα E1, με τον ίδιο κανόνα ημερών με την κάρτα
-- «Γυρίσματα των επόμενων 7 ημερών» της Σήμερα (authz.today_week_filmings): ανοιχτά, από σήμερα ως σήμερα + 6, ώρα Ελλάδας.
-- Η κάρτα ανοίγει πια αυτή την καρτέλα, όχι όλα τα ανοιχτά. Τα δικαιώματα της συνάρτησης μένουν ως έχουν (create or replace).

create or replace function public.filmings_view(p_tab text default 'open', p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require_filming_viewer();
  if p_tab is null or p_tab not in ('open', 'week', 'pending', 'needs_outcome', 'closed', 'all') then
    raise exception 'Άγνωστη καρτέλα Γυρισμάτων' using errcode = 'P0001';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Η σελίδα έχει από 1 ως 100 γραμμές' using errcode = 'P0001';
  end if;
  -- Η πιο πρόσφατη πρώτη στις καρτέλες κλεισμένων, όλων και «θέλουν έγινε»· η παλαιότερη πρώτη στις ανοιχτές.
  select coalesce(jsonb_agg(authz.filming_row(f.id) order by f.sort_key), '[]'::jsonb)
    into v_rows
    from (
      select x.id, row_number() over (order by
               (case when p_tab in ('closed', 'all', 'needs_outcome') then x.starts_at end) desc nulls last,
               (case when p_tab not in ('closed', 'all', 'needs_outcome') then x.starts_at end) asc nulls last,
               x.id) as sort_key
        from public.filmings x
       where authz.can_see_filming(x.id) and case p_tab
         when 'open' then x.state in ('pending', 'scheduled')
         when 'week' then x.state in ('pending', 'scheduled')
                          and (x.starts_at at time zone 'Europe/Athens')::date
                              between (now() at time zone 'Europe/Athens')::date and (now() at time zone 'Europe/Athens')::date + 6
         when 'pending' then x.state = 'pending'
         when 'needs_outcome' then x.state = 'scheduled' and x.starts_at < now()
         when 'closed' then x.state in ('done', 'no_show', 'cancelled', 'rejected')
         else true
       end
       order by (case when p_tab in ('closed', 'all', 'needs_outcome') then x.starts_at end) desc nulls last,
                (case when p_tab not in ('closed', 'all', 'needs_outcome') then x.starts_at end) asc nulls last,
                x.id
       limit p_limit
    ) f;
  return v_rows;
end;
$$;

update public.today_cards set link = '/app/filming?tab=week' where code = 'week_filming';
