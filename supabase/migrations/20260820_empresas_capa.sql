-- Perfil público da empresa: além do logótipo, uma imagem de capa larga.
alter table public.companies
  add column if not exists cover_url text;

comment on column public.companies.cover_url is
  'Imagem de capa do perfil público da empresa. Vive no cofre público, em empresas/<id>/.';
