create table if not exists users (
    id text primary key,
    name text null,
    email text unique not null,
    password_hash text not null,
    status text not null,
    locked_until timestamptz null,
    roles text[] not null,
    avatar text null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    deleted_at timestamptz null
);

create table if not exists sessions (
    id text primary key,
    user_id text not null references users(id),
    refresh_token_hash text unique not null,
    status text not null,
    created_at timestamptz not null,
    last_used_at timestamptz not null,
    expires_at timestamptz not null,
    revoked_at timestamptz null,
    revoked_by text null,
    ip text null,
    user_agent text null
);

create table if not exists login_attempts (
    id bigserial primary key,
    email text not null,
    ip text null,
    succeeded boolean not null,
    created_at timestamptz not null
);

create index if not exists idx_login_attempts_email_created_at
    on login_attempts (email, created_at);

create index if not exists idx_login_attempts_ip_created_at
    on login_attempts (ip, created_at);

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

create table if not exists invoices (
    id text primary key,
    provider_id text not null references providers(id),
    status text not null,
    header_source text not null,
    header_status text not null,
    numero_factura text null,
    fecha_operacion date null,
    fecha_vencimiento date null,
    base_imponible numeric null,
    iva numeric null,
    total numeric null,
    file_storage_key text null,
    file_filename text null,
    file_mime_type text null,
    file_size_bytes integer null,
    file_checksum text null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    deleted_at timestamptz null
);

create index if not exists idx_invoices_provider_id
    on invoices (provider_id);

create index if not exists idx_invoices_status
    on invoices (status);

create table if not exists invoice_movements (
    id text primary key,
    invoice_id text not null references invoices(id),
    concepto text not null,
    cantidad numeric not null,
    precio numeric not null,
    base_imponible numeric null,
    iva numeric null,
    total numeric not null,
    source text not null,
    status text not null
);

create index if not exists idx_invoice_movements_invoice_id
    on invoice_movements (invoice_id);
