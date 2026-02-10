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
