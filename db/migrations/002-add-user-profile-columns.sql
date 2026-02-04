alter table users
    add column if not exists name text;

alter table users
    add column if not exists avatar text;

alter table users
    add column if not exists deleted_at timestamptz;
