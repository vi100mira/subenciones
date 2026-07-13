alter table public.platform_ingestion_campaigns
  add column if not exists campaign_key text;

alter table public.platform_sources enable row level security;
alter table public.platform_ingestion_campaigns enable row level security;

create unique index if not exists platform_campaigns_key_idx
  on public.platform_ingestion_campaigns(campaign_key)
  where campaign_key is not null;
