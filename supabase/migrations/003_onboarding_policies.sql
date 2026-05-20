-- Phase 3: allow authenticated users to create schools during onboarding.
-- The existing schools table has RLS enabled but only a SELECT policy.
-- Without an INSERT policy the client receives a 403 when submitting the form.
-- This is still a permissive policy (any signed-in user) — strict ownership
-- enforcement comes in Phase 4.

drop policy if exists "authenticated users can insert schools" on public.schools;
create policy "authenticated users can insert schools"
  on public.schools for insert
  with check (auth.uid() is not null);

-- Safety net: allow users to insert their own profile row in the rare case
-- where the sign-up trigger did not fire (e.g. third-party OAuth edge cases).
drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
