-- =====================================================================
-- LA PORRA DE SANTIAGO — Esquema completo (Supabase / PostgreSQL)
-- Schema for World Cup 2026 prediction game (48 teams, 12 groups A–L)
-- =====================================================================
-- Notas / Notes:
--  * Auth la gestiona Supabase (auth.users). Nosotros guardamos perfil en public.profiles.
--    Auth is handled by Supabase (auth.users); we keep the profile in public.profiles.
--  * NADA de jugadores hardcodeados: se importan vía panel admin o API externa.
--    NO hardcoded players: imported via admin panel or external API.
--  * Los bloqueos (locks) se imponen con triggers, no solo en el frontend.
--    Prediction locks are enforced with triggers, not only in the frontend.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type match_status   as enum ('scheduled', 'live', 'finished', 'postponed');
create type player_status  as enum ('called_up', 'injured', 'replaced', 'suspended');
create type user_role      as enum ('player', 'admin');

-- ---------------------------------------------------------------------
-- CONFIG GLOBAL DEL TORNEO / GLOBAL TOURNAMENT CONFIG
-- Controla el lock global de goleadores y de pronósticos de grupo.
-- Controls the global lock for scorer picks and group-order predictions.
-- ---------------------------------------------------------------------
create table tournament_config (
  id                      smallint primary key default 1 check (id = 1), -- fila única / single row
  name                    text not null default 'FIFA World Cup 2026',
  group_stage_starts_at   timestamptz not null,   -- p.ej. 2026-06-11 / e.g. opening match
  group_stage_ends_at     timestamptz,
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROFILES (extiende auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null,
  avatar_url       text,
  favorite_country text,
  role             user_role not null default 'player',
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- GROUPS (A–L = 12 grupos en 2026)
-- ---------------------------------------------------------------------
create table groups (
  id     smallint primary key,          -- 1..12
  label  char(1) not null unique,       -- 'A'..'L'
  name   text                            -- "Grupo A"
);

-- ---------------------------------------------------------------------
-- TEAMS / SELECCIONES
-- ---------------------------------------------------------------------
create table teams (
  id            uuid primary key default gen_random_uuid(),
  api_team_id   integer unique,         -- id en la API externa (API-Football)
  fifa_code     char(3),                -- 'ESP', 'ARG'...
  name          text not null,
  flag_url      text,
  group_id      smallint references groups(id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PLAYERS / JUGADORES (importables, escalable)
-- ---------------------------------------------------------------------
create table players (
  id             uuid primary key default gen_random_uuid(),
  api_player_id  integer unique,        -- id en la API externa
  team_id        uuid not null references teams(id) on delete cascade,
  full_name      text not null,
  position       text,                  -- GK / DF / MF / FW
  shirt_number   smallint,
  photo_url      text,
  status         player_status not null default 'called_up',
  created_at     timestamptz not null default now()
);
create index on players (team_id);

-- ---------------------------------------------------------------------
-- MATCHES / PARTIDOS (solo fase de grupos: 72 partidos en 2026)
-- ---------------------------------------------------------------------
create table matches (
  id            uuid primary key default gen_random_uuid(),
  api_fixture_id integer unique,
  group_id      smallint references groups(id),
  home_team_id  uuid not null references teams(id),
  away_team_id  uuid not null references teams(id),
  kickoff_at    timestamptz not null,
  stadium       text,
  status        match_status not null default 'scheduled',
  home_score    smallint,              -- null hasta que hay datos / null until data exists
  away_score    smallint,
  updated_at    timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index on matches (kickoff_at);
create index on matches (group_id);

-- Helper: ¿está bloqueado el partido? / is the match locked?
create or replace function match_is_locked(m matches)
returns boolean language sql stable as $$
  select m.kickoff_at <= now();
$$;

-- ---------------------------------------------------------------------
-- PREDICTIONS / PRONÓSTICOS DE PARTIDO (1 por usuario y partido)
-- ---------------------------------------------------------------------
create table predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  match_id    uuid not null references matches(id) on delete cascade,
  pred_home   smallint not null check (pred_home >= 0),
  pred_away   smallint not null check (pred_away >= 0),
  points      smallint not null default 0,   -- recalculado por el motor / recomputed by engine
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, match_id)
);
create index on predictions (match_id);

-- Trigger de bloqueo: no insertar/editar tras el saque inicial.
-- Lock trigger: no insert/update after kickoff.
create or replace function enforce_prediction_lock()
returns trigger language plpgsql as $$
declare ko timestamptz;
begin
  select kickoff_at into ko from matches where id = new.match_id;
  if ko <= now() then
    raise exception 'Partido bloqueado / Match is locked (kickoff passed)';
  end if;
  new.updated_at = now();
  return new;
end; $$;
create trigger trg_prediction_lock
  before insert or update on predictions
  for each row execute function enforce_prediction_lock();

-- ---------------------------------------------------------------------
-- GROUP_PREDICTIONS / PRONÓSTICO DE ORDEN DE GRUPO (1 por usuario y grupo)
-- ---------------------------------------------------------------------
create table group_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  group_id    smallint not null references groups(id),
  rank1_team_id uuid not null references teams(id),
  rank2_team_id uuid not null references teams(id),
  rank3_team_id uuid not null references teams(id),
  rank4_team_id uuid not null references teams(id),
  points      smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, group_id)
);

-- Bloqueo global por config (antes del inicio de la fase de grupos).
-- Global lock by config (before group stage start).
create or replace function enforce_group_pred_lock()
returns trigger language plpgsql as $$
declare starts timestamptz;
begin
  select group_stage_starts_at into starts from tournament_config where id = 1;
  if starts is not null and starts <= now() then
    raise exception 'Pronósticos de grupo bloqueados / Group predictions locked';
  end if;
  new.updated_at = now();
  return new;
end; $$;
create trigger trg_group_pred_lock
  before insert or update on group_predictions
  for each row execute function enforce_group_pred_lock();

-- ---------------------------------------------------------------------
-- SELECTED_SCORERS / GOLEADORES ELEGIDOS (exactamente 3 por usuario)
-- ---------------------------------------------------------------------
create table selected_scorers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  player_id  uuid not null references players(id),
  slot       smallint not null check (slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, slot),        -- 3 huecos / 3 slots
  unique (user_id, player_id)    -- sin repetir jugador / no duplicate player
);
create trigger trg_scorer_lock
  before insert or update on selected_scorers
  for each row execute function enforce_group_pred_lock(); -- mismo lock global

-- ---------------------------------------------------------------------
-- GOALS / GOLES (fuente de verdad para puntos de goleador)
-- Source of truth for scorer points. Una fila por gol marcado.
-- ---------------------------------------------------------------------
create table goals (
  id           uuid primary key default gen_random_uuid(),
  api_event_id text unique,            -- idempotencia: evita duplicar goles / idempotency
  match_id     uuid not null references matches(id) on delete cascade,
  player_id    uuid references players(id),
  team_id      uuid references teams(id),
  minute       smallint,
  is_own_goal  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on goals (player_id);
create index on goals (match_id);

-- ---------------------------------------------------------------------
-- STANDINGS / CLASIFICACIÓN REAL POR GRUPO (la calcula la API/sync)
-- ---------------------------------------------------------------------
create table standings (
  id         uuid primary key default gen_random_uuid(),
  group_id   smallint not null references groups(id),
  team_id    uuid not null references teams(id),
  played     smallint not null default 0,
  won        smallint not null default 0,
  drawn      smallint not null default 0,
  lost       smallint not null default 0,
  gf         smallint not null default 0,   -- goles a favor
  ga         smallint not null default 0,   -- goles en contra
  gd         smallint generated always as (gf - ga) stored,
  points     smallint not null default 0,
  rank       smallint,                       -- 1..4 dentro del grupo
  qualified  boolean not null default false, -- top 2 + 8 mejores terceros (R32)
  updated_at timestamptz not null default now(),
  unique (group_id, team_id)
);

-- ---------------------------------------------------------------------
-- LEADERBOARD / RANKING GENERAL (desglosado por origen de puntos)
-- ---------------------------------------------------------------------
create table leaderboard (
  user_id      uuid primary key references profiles(id) on delete cascade,
  total        integer not null default 0,
  pts_exact    integer not null default 0,   -- resultado exacto
  pts_winner   integer not null default 0,   -- ganador/empate
  pts_scorers  integer not null default 0,   -- goleadores
  pts_groups   integer not null default 0,   -- clasificación de grupos
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- API_SYNC_LOGS / REGISTRO DE SINCRONIZACIONES
-- ---------------------------------------------------------------------
create table api_sync_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,          -- 'api-football'
  endpoint    text not null,          -- '/fixtures?live=all'
  status      text not null,          -- 'ok' | 'error'
  rows_upserted integer,
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- =====================================================================
-- RLS (Row Level Security) — seguridad real, no solo cosmética
-- =====================================================================
alter table profiles          enable row level security;
alter table predictions       enable row level security;
alter table group_predictions enable row level security;
alter table selected_scorers  enable row level security;

-- Catálogos públicos de lectura (todos pueden leer)
-- Public read-only catalogs (everyone can read)
alter table groups   enable row level security;
alter table teams    enable row level security;
alter table players  enable row level security;
alter table matches  enable row level security;
alter table goals    enable row level security;
alter table standings enable row level security;
alter table leaderboard enable row level security;

create policy "read all groups"    on groups   for select using (true);
create policy "read all teams"     on teams    for select using (true);
create policy "read all players"   on players  for select using (true);
create policy "read all matches"   on matches  for select using (true);
create policy "read all goals"     on goals    for select using (true);
create policy "read all standings" on standings for select using (true);
create policy "read leaderboard"   on leaderboard for select using (true);

-- Perfil propio
create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile write"  on profiles for update using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

-- Pronósticos: cada uno gestiona los suyos; lectura abierta para el ranking público.
-- Predictions: each user manages their own; open read for the public ranking.
create policy "read all predictions"  on predictions for select using (true);
create policy "own predictions write" on predictions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read all group preds"  on group_predictions for select using (true);
create policy "own group preds write" on group_predictions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read all scorers"      on selected_scorers for select using (true);
create policy "own scorers write"     on selected_scorers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Las escrituras de catálogos/resultados van por service_role (sync + admin),
-- que evita RLS por diseño. Catalog/result writes go through service_role
-- (sync job + admin), which bypasses RLS by design.

-- =====================================================================
-- SEED MÍNIMO / MINIMAL SEED: los 12 grupos
-- =====================================================================
insert into groups (id, label, name) values
 (1,'A','Grupo A'),(2,'B','Grupo B'),(3,'C','Grupo C'),(4,'D','Grupo D'),
 (5,'E','Grupo E'),(6,'F','Grupo F'),(7,'G','Grupo G'),(8,'H','Grupo H'),
 (9,'I','Grupo I'),(10,'J','Grupo J'),(11,'K','Grupo K'),(12,'L','Grupo L');
