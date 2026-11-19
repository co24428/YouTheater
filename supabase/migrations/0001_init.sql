-- YouTheater schema. Run once in Supabase → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  youtube_id       text not null unique,
  title            text not null default '',
  channel_title    text,
  channel_id       text,
  duration_seconds integer,
  thumbnail_url    text,
  published_at     timestamptz,
  view_count       bigint,
  description      text,
  note             text,
  status           text not null default 'available', -- available | unavailable (deleted or made private on YouTube)
  added_at         timestamptz not null default now(),
  checked_at       timestamptz
);

create table if not exists public.libraries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.library_videos (
  library_id uuid not null references public.libraries(id) on delete cascade,
  video_id   uuid not null references public.videos(id) on delete cascade,
  position   integer not null default 0,
  added_at   timestamptz not null default now(),
  primary key (library_id, video_id)
);

create index if not exists library_videos_video_idx on public.library_videos(video_id);
create index if not exists library_videos_order_idx on public.library_videos(library_id, position);

-- The app talks to the database only from the server with the service-role key.
-- RLS on with no policies = the public anon key can read/write nothing.
alter table public.videos         enable row level security;
alter table public.libraries      enable row level security;
alter table public.library_videos enable row level security;

-- Reorder helpers: pass ids in the new order.
create or replace function public.reorder_libraries(ids uuid[])
returns void language sql as $$
  update public.libraries l
     set position = o.ord
    from unnest(ids) with ordinality as o(id, ord)
   where l.id = o.id;
$$;

create or replace function public.reorder_library_videos(lib uuid, ids uuid[])
returns void language sql as $$
  update public.library_videos lv
     set position = o.ord
    from unnest(ids) with ordinality as o(id, ord)
   where lv.library_id = lib and lv.video_id = o.id;
$$;

revoke execute on function public.reorder_libraries(uuid[]) from public, anon, authenticated;
revoke execute on function public.reorder_library_videos(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_libraries(uuid[]) to service_role;
grant execute on function public.reorder_library_videos(uuid, uuid[]) to service_role;
