# Base de dados TEskBuy

Projecto Supabase: `TEskBuy-Group-Ltd` (`ipmzxiqmzcjvyxxyoisf`), região eu-central-1.

O esquema está aplicado e versionado em `migrations/`, por ordem.

| Migração | O que faz |
|---|---|
| `01_extensions_enums_helpers` | Extensões, tipos enumerados e funções auxiliares |
| `02_profiles_addresses_catalog` | Perfis, moradas, categorias, marcas, produtos, imagens e movimentos de stock |
| `03_cart_favorites_orders` | Carrinho, favoritos, cupões, encomendas, avaliações, newsletter e definições |
| `04_business_functions` | `place_order`, `adjust_stock`, `update_order_status`, contador de visitas |
| `05_row_level_security` | `is_admin`/`is_staff` e políticas de RLS em todas as tabelas |
| `06_api_wrappers` | Wrappers com verificação de papel dentro da base de dados |
| `07_seed_settings_categories_brands` | Definições da loja, 6 categorias, 10 marcas, 2 cupões |
| `08_seed_products` | 22 produtos e o respectivo stock inicial |
| `09_grant_role_helpers_for_rls` | `EXECUTE` em `is_admin`/`is_staff` para `anon` e `authenticated` |

## Porque é que a 09 é necessária

As políticas de RLS correm com os privilégios de quem faz a consulta, não com os do
dono das funções. Como as políticas chamam `is_staff()` e `is_admin()`, os papéis
`anon` e `authenticated` precisam de `EXECUTE` nessas duas funções. Sem isso, qualquer
leitura — até a lista de produtos — falha com *permission denied for function is_staff*.

## Aplicar noutro projecto

```bash
supabase link --project-ref SEU_REF
supabase db push
```

## Criar o primeiro administrador

Registe-se pelo site e depois, no SQL Editor do Supabase:

```sql
update public.profiles set role = 'admin' where email = 'o-seu@email.com';
```

O gatilho `guard_profile_role` impede que alguém se promova pela API — esta primeira
promoção tem mesmo de ser feita aqui.

## Segurança

A autorização vive nas políticas de RLS. A API chama o Supabase com o token de sessão
de quem faz o pedido, por isso as mesmas regras aplicam-se venha o acesso da API ou
directamente do browser. A `service_role` não é necessária para operar a loja.

O linter do Supabase assinala seis funções `SECURITY DEFINER` invocáveis — é
intencional: `place_order`, `change_order_status`, `admin_adjust_stock`,
`admin_register_payment` verificam o papel lá dentro, e `increment_product_views` só
incrementa um contador. As funções internas `adjust_stock` e `update_order_status` têm
o `EXECUTE` revogado.
