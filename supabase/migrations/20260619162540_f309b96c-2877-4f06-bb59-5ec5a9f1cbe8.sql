create policy "Team members can view their owner's profile"
  on public.profiles for select
  using (
    auth.uid() in (
      select id from public.profiles
      where team_owner_id = profiles.id
    )
  );