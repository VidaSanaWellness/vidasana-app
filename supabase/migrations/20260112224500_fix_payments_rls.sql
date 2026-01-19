-- Enable RLS on checking table
alter table public.payments enable row level security;

-- Policy to allow users to insert their *own* payments
create policy "Users can insert their own payments"
on public.payments
for insert
to authenticated
with check ( auth.uid() = "user" );

-- Policy to allow users to view their *own* payments
create policy "Users can view their own payments"
on public.payments
for select
to authenticated
using ( auth.uid() = "user" );
