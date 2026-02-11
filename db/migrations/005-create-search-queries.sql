create table if not exists search_queries (
    query_id text primary key,
    user_id text not null,
    original_query text not null,
    normalized_query text not null,
    query_key text not null,
    answer text not null,
    references jsonb not null,
    created_at timestamptz not null
);

create unique index if not exists ux_search_queries_query_key
    on search_queries (query_key);
