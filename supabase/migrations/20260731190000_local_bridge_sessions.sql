-- Permisos efímeros para un puente local por tenant y carpeta autorizada.
create table if not exists public.local_bridge_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  source_connection_id uuid not null references public.source_connections(id) on delete cascade,
  issued_to uuid not null,
  token_hash text not null unique,
  capability text not null default 'read_inventory'
    check (capability in ('read_inventory', 'write_delivery')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists local_bridge_sessions_scope_idx
  on public.local_bridge_sessions(tenant_id, source_connection_id, status, expires_at desc);

alter table public.local_bridge_sessions enable row level security;
-- No se añaden políticas de cliente: el token solo se resuelve en Functions.
