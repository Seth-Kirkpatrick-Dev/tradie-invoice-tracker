-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,

  first_name            text,
  last_name             text,
  business_name         text,
  phone                 text,
  country               text not null default 'NZ'  check (country in ('NZ', 'AU', 'GB', 'US')),
  currency              text not null default 'NZD' check (currency in ('NZD', 'AUD', 'GBP', 'USD')),
  tax_number            text,
  tax_rate              numeric(5,4) not null default 0.15,
  tax_label             text         not null default 'GST',
  bank_account_details  text,
  logo_url              text,

  invoice_number_prefix text    not null default 'INV',
  next_invoice_number   integer not null default 1,

  reminder_schedule     jsonb not null default '[1, 7, 14, 21]'::jsonb,

  default_email_subject text not null default
    'Friendly reminder: Invoice {invoice_number} is overdue',

  default_email_body text not null default
    E'Hi {client_first_name},\n\nJust a friendly reminder that Invoice {invoice_number} for {amount} {currency} was due on {due_date}. It is now {days_overdue} day(s) overdue.\n\nPayment details:\n{payment_method}\n\nIf you''ve already paid, please ignore this message.\n\nCheers,\n{tradie_business_name}',

  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  subscription_tier      text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'pro_plus')),
  subscription_status    text not null default 'free'
    check (subscription_status in ('free', 'active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at          timestamptz,

  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name    text not null,
  email   text,
  phone   text,
  address text,
  notes   text,

  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,

  invoice_number     text    not null,
  invoice_number_int integer not null,

  description text,
  line_items  jsonb not null default '[]'::jsonb,

  currency   text          not null default 'NZD',
  subtotal   numeric(12,2) not null default 0,
  tax_rate   numeric(5,4)  not null default 0.15,
  tax_label  text          not null default 'GST',
  tax_amount numeric(12,2) not null default 0,
  total      numeric(12,2) not null default 0,

  issue_date date,
  due_date   date,
  sent_date  timestamptz,
  paid_date  timestamptz,

  status text not null default 'draft'
    check (status in ('draft', 'sent', 'overdue', 'paid')),

  payment_method text,
  notes          text,

  auto_reminders_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, invoice_number)
);

-- ============================================================
-- REMINDERS LOG
-- ============================================================
create table public.reminders_log (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,

  sent_at         timestamptz not null default now(),
  channel         text not null default 'email' check (channel in ('email', 'sms')),

  recipient_email text,
  recipient_phone text,
  subject         text,
  content         text,
  days_overdue    integer,

  status        text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS (in-app)
-- ============================================================
create table public.notifications (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  type       text not null,
  title      text not null,
  body       text not null,
  invoice_id uuid references public.invoices(id) on delete set null,

  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- EMAIL TEMPLATES (Pro)
-- ============================================================
create table public.email_templates (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name             text    not null,
  subject_template text    not null,
  body_template    text    not null,
  is_default       boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', false);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.handle_updated_at();

create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
create index invoices_user_id_idx      on public.invoices(user_id);
create index invoices_status_idx       on public.invoices(status);
create index invoices_due_date_idx     on public.invoices(due_date);
create index invoices_user_status_idx  on public.invoices(user_id, status);
create index clients_user_id_idx       on public.clients(user_id);
create index reminders_log_invoice_idx on public.reminders_log(invoice_id);
create index reminders_log_user_idx    on public.reminders_log(user_id);
create index notifications_user_idx    on public.notifications(user_id);
create index notifications_unread_idx  on public.notifications(user_id, read_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.invoices        enable row level security;
alter table public.reminders_log   enable row level security;
alter table public.notifications   enable row level security;
alter table public.email_templates enable row level security;

-- profiles
create policy "profiles: select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- clients
create policy "clients: select own" on public.clients for select using (auth.uid() = user_id);
create policy "clients: insert own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients: update own" on public.clients for update using (auth.uid() = user_id);
create policy "clients: delete own" on public.clients for delete using (auth.uid() = user_id);

-- invoices
create policy "invoices: select own" on public.invoices for select using (auth.uid() = user_id);
create policy "invoices: insert own" on public.invoices for insert with check (auth.uid() = user_id);
create policy "invoices: update own" on public.invoices for update using (auth.uid() = user_id);
create policy "invoices: delete own" on public.invoices for delete using (auth.uid() = user_id);

-- reminders_log (read-only for users — cron writes via service role)
create policy "reminders_log: select own" on public.reminders_log for select using (auth.uid() = user_id);

-- notifications
create policy "notifications: select own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications: update own" on public.notifications for update using (auth.uid() = user_id);

-- email_templates
create policy "email_templates: select own" on public.email_templates for select using (auth.uid() = user_id);
create policy "email_templates: insert own" on public.email_templates for insert with check (auth.uid() = user_id);
create policy "email_templates: update own" on public.email_templates for update using (auth.uid() = user_id);
create policy "email_templates: delete own" on public.email_templates for delete using (auth.uid() = user_id);

-- storage: business-logos (scoped to user's folder)
create policy "logos: insert own" on storage.objects for insert
  with check (bucket_id = 'business-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "logos: select own" on storage.objects for select
  using (bucket_id = 'business-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "logos: update own" on storage.objects for update
  using (bucket_id = 'business-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "logos: delete own" on storage.objects for delete
  using (bucket_id = 'business-logos' and auth.uid()::text = (storage.foldername(name))[1]);
