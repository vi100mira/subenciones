-- Una fuente de plataforma se identifica por tipo y URL. Conserva campañas al consolidar duplicados.

with ranked as (
  select
    id,
    first_value(id) over (partition by kind, url order by created_at, id) as keeper_id,
    row_number() over (partition by kind, url order by created_at, id) as position
  from public.platform_sources
  where url is not null
)
update public.platform_ingestion_campaigns as campaign
set platform_source_id = ranked.keeper_id
from ranked
where ranked.position > 1
  and campaign.platform_source_id = ranked.id;

with ranked as (
  select
    id,
    row_number() over (partition by kind, url order by created_at, id) as position
  from public.platform_sources
  where url is not null
)
delete from public.platform_sources as source
using ranked
where ranked.position > 1
  and source.id = ranked.id;

create unique index if not exists platform_sources_kind_url_idx
  on public.platform_sources(kind, url)
  where url is not null;
