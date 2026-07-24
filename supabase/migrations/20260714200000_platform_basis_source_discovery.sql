alter table public.platform_supplementary_basis_sources
  add column if not exists proposal_origin text not null default 'human'
    check (proposal_origin in ('human', 'official_link_discovery')),
  add column if not exists discovery_path jsonb not null default '[]'::jsonb,
  add column if not exists match_score smallint
    check (match_score is null or match_score between 0 and 100);

comment on column public.platform_supplementary_basis_sources.discovery_path is
  'Ordered public URLs followed to discover this candidate; never contains tenant data.';
