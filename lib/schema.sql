-- LancePad Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable RLS
alter table if exists notebooks enable row level security;
alter table if exists notes enable row level security;
alter table if exists cards enable row level security;
alter table if exists card_reviews enable row level security;

-- Notebooks
create table if not exists notebooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Notebook',
  color text not null default '#4D96FF',
  emoji text not null default '📚',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notes (one per notebook, rich text content)
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  notebook_id uuid references notebooks(id) on delete cascade not null unique,
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cards (AI-generated quiz cards)
create table if not exists cards (
  id uuid default gen_random_uuid() primary key,
  notebook_id uuid references notebooks(id) on delete cascade not null,
  question text not null,
  answer text not null,
  type text not null check (type in ('multiple_choice', 'flashcard', 'fill_blank')),
  options jsonb, -- array of strings for multiple_choice
  created_at timestamptz default now()
);

-- Card reviews (for tracking progress)
create table if not exists card_reviews (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  result text not null check (result in ('correct', 'incorrect', 'skipped')),
  reviewed_at timestamptz default now()
);

-- RLS Policies
create policy "Users can manage their own notebooks"
  on notebooks for all using (auth.uid() = user_id);

create policy "Users can manage notes in their notebooks"
  on notes for all using (
    notebook_id in (select id from notebooks where user_id = auth.uid())
  );

create policy "Users can manage cards in their notebooks"
  on cards for all using (
    notebook_id in (select id from notebooks where user_id = auth.uid())
  );

create policy "Users can manage their own reviews"
  on card_reviews for all using (auth.uid() = user_id);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notebooks_updated_at
  before update on notebooks
  for each row execute function update_updated_at();

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();
