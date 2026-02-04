create table if not exists providers (
    id text primary key,
    razon_social text not null,
    razon_social_normalized text not null,
    cif text null,
    direccion text null,
    poblacion text null,
    provincia text null,
    pais text null,
    status text not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    deleted_at timestamptz null
);

create unique index if not exists ux_providers_cif_active
    on providers (cif)
    where deleted_at is null and cif is not null;

create unique index if not exists ux_providers_razon_social_active
    on providers (razon_social_normalized)
    where deleted_at is null;
