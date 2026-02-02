create table if not exists users (
    id text primary key,
    email text unique not null,
    password_hash text not null,
    status text not null,
    locked_until timestamptz null,
    roles text[] not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
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
