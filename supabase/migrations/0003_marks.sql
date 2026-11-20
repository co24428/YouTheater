-- Personal timeline marks and replies. Run once in Supabase → SQL Editor.

create table if not exists public.marks (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  seconds    integer not null check (seconds >= 0),
  label      text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.mark_replies (
  id         uuid primary key default gen_random_uuid(),
  mark_id    uuid not null references public.marks(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists marks_video_idx on public.marks(video_id, seconds);
create index if not exists mark_replies_mark_idx on public.mark_replies(mark_id, created_at);

alter table public.marks        enable row level security;
alter table public.mark_replies enable row level security;

grant select, insert, update, delete on table public.marks, public.mark_replies to service_role;
