-- 在 Supabase Dashboard -> SQL Editor 中完整粘贴并点击 Run。
create table if not exists public.ledger_users (
  username text primary key check (char_length(username) between 1 and 20),
  password_hash text not null,
  categories jsonb not null default '["娱乐","吃喝","房租","衣服","日常","交通","医疗","学习","其他"]'::jsonb,
  created_at timestamptz not null default now()
);

-- 已有项目安全补字段；分类属于每个 username，不是全局设置。
alter table public.ledger_users
  add column if not exists categories jsonb not null default '["娱乐","吃喝","房租","衣服","日常","交通","医疗","学习","其他"]'::jsonb;

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

-- Supabase 新项目可能不会自动授予 Data API 的 service_role 表权限。
grant usage on schema public to service_role;
grant select, insert, update, delete on public.ledger_users, public.ledger_records to service_role;

-- 浏览器不直接访问 Supabase；Node 服务使用 service_role key 访问。
-- 因此这里不开放 anon policy，避免绕过本项目的用户名+密码登录。
