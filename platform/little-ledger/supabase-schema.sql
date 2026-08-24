-- 在 Supabase Dashboard -> SQL Editor 中完整粘贴并点击 Run。
create table if not exists public.ledger_users (
  username text primary key check (char_length(username) between 1 and 20),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_records (
  id uuid primary key default gen_random_uuid(),
  username text not null references public.ledger_users(username) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency char(3) not null default 'CNY',
  source_amount numeric(14, 2) not null default 0,
  source_currency char(3) not null default 'CNY',
  exchange_rate numeric(18, 8) not null default 1,
  category text not null,
  note text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists ledger_records_username_created_idx
  on public.ledger_records (username, created_at desc);

alter table public.ledger_users enable row level security;
alter table public.ledger_records enable row level security;

-- 浏览器不直接访问 Supabase；Node 服务使用 service_role key 访问。
-- 因此这里不开放 anon policy，避免绕过本项目的用户名+密码登录。
