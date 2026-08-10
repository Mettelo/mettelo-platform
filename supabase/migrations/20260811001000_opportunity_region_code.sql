alter table public.opportunities add column if not exists region_code text;
create index if not exists idx_opportunities_region_status on public.opportunities(region_code,status);

update public.opportunities
set region_code = case
  when country_code='GB' then 'UK'
  when country_code in ('DE','FR','NL','ES','IT','IE','BE','AT','PT','PL','CZ','DK','SE','FI','NO','RO','HU','GR','SK','SI','HR','BG','EE','LV','LT','LU','CY','MT') then 'EUROPE'
  when country_code='NG' then 'AFRICA'
  when country_code='IN' then 'ASIA'
  when country_code in ('US','CA') then 'NORTH_AMERICA'
  when country_code='AU' then 'OCEANIA'
  when country_code='GLOBAL' then 'GLOBAL'
  else region_code
end
where region_code is null;