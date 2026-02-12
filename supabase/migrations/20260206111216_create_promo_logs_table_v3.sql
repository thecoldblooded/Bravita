create table if not exists promo_logs (
  id uuid default gen_random_uuid() primary key,
  promo_code_id uuid references promo_codes(id) on delete cascade not null,
  order_id uuid references orders(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  discount_amount numeric
);

alter table promo_logs enable row level security;

create policy "Admins can view promo logs" on promo_logs
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "System can insert logs" on promo_logs
  for insert with check (true);;
