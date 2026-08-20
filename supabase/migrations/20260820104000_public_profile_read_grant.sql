-- Public profile reads are intentionally filtered by the existing profiles RLS policy.
-- Grant only the columns consumed by public People / Spotlight projections; do not
-- expose private profile fields to the anonymous role.
grant select (
  id,
  full_name,
  headline,
  bio,
  location,
  professional_area,
  primary_goal,
  linkedin_url,
  github_url,
  skills,
  avatar_url,
  profile_readiness,
  is_public,
  updated_at
) on table public.profiles to anon;
