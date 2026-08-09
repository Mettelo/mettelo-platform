-- Tighten RLS roles and avoid duplicate permissive policies.

DROP POLICY IF EXISTS "profiles readable by owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles insertable by owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles updatable by owner" ON public.profiles;
CREATE POLICY "profiles readable by owner" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "admins manage projects" ON public.projects;
DROP POLICY IF EXISTS "member projects readable" ON public.projects;
DROP POLICY IF EXISTS "public projects readable" ON public.projects;
CREATE POLICY "public projects readable anon" ON public.projects FOR SELECT TO anon USING (visibility='public' AND status = ANY (ARRAY['pilot','recruiting','active','review','completed']));
CREATE POLICY "projects readable authenticated" ON public.projects FOR SELECT TO authenticated USING ((visibility='public' AND status = ANY (ARRAY['pilot','recruiting','active','review','completed'])) OR visibility='members' OR public.is_admin());
CREATE POLICY "admins insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete projects" ON public.projects FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage project roles" ON public.project_roles;
DROP POLICY IF EXISTS "roles readable with project" ON public.project_roles;
CREATE POLICY "project roles readable anon" ON public.project_roles FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_roles.project_id AND p.visibility='public' AND p.status = ANY (ARRAY['pilot','recruiting','active','review','completed'])));
CREATE POLICY "project roles readable authenticated" ON public.project_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_roles.project_id AND ((p.visibility='public' AND p.status = ANY (ARRAY['pilot','recruiting','active','review','completed'])) OR p.visibility='members')) OR public.is_admin());
CREATE POLICY "admins insert project roles" ON public.project_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update project roles" ON public.project_roles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete project roles" ON public.project_roles FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage applications" ON public.project_applications;
DROP POLICY IF EXISTS "users create own applications" ON public.project_applications;
DROP POLICY IF EXISTS "users read own applications" ON public.project_applications;
DROP POLICY IF EXISTS "users withdraw own applications" ON public.project_applications;
CREATE POLICY "applications readable authenticated" ON public.project_applications FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "applications insertable authenticated" ON public.project_applications FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "applications updatable authenticated" ON public.project_applications FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin()) WITH CHECK ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "applications deletable by admin" ON public.project_applications FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage project memberships" ON public.project_members;
DROP POLICY IF EXISTS "members read own project memberships" ON public.project_members;
CREATE POLICY "project memberships readable authenticated" ON public.project_members FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "admins insert project memberships" ON public.project_members FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update project memberships" ON public.project_members FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete project memberships" ON public.project_members FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage contributions" ON public.contributions;
DROP POLICY IF EXISTS "public verified contributions readable" ON public.contributions;
DROP POLICY IF EXISTS "users create own contributions" ON public.contributions;
CREATE POLICY "verified contributions readable anon" ON public.contributions FOR SELECT TO anon USING (verification_status='verified' AND is_public);
CREATE POLICY "contributions readable authenticated" ON public.contributions FOR SELECT TO authenticated USING ((verification_status='verified' AND is_public) OR (select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "contributions insertable authenticated" ON public.contributions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "admins update contributions" ON public.contributions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete contributions" ON public.contributions FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "published opportunities readable" ON public.opportunities;
CREATE POLICY "public opportunities readable anon" ON public.opportunities FOR SELECT TO anon USING (status='published' AND access_level='public');
CREATE POLICY "opportunities readable authenticated" ON public.opportunities FOR SELECT TO authenticated USING ((status='published' AND access_level IN ('public','members')) OR public.is_admin());
CREATE POLICY "admins insert opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users manage own saved opportunities" ON public.saved_opportunities;
CREATE POLICY "users manage own saved opportunities" ON public.saved_opportunities FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins manage events" ON public.events;
DROP POLICY IF EXISTS "published events readable" ON public.events;
CREATE POLICY "public events readable anon" ON public.events FOR SELECT TO anon USING (status IN ('published','completed'));
CREATE POLICY "events readable authenticated" ON public.events FOR SELECT TO authenticated USING (status IN ('published','completed') OR public.is_admin());
CREATE POLICY "admins insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users manage own event registrations" ON public.event_registrations;
CREATE POLICY "event registrations readable authenticated" ON public.event_registrations FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "event registrations insertable authenticated" ON public.event_registrations FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "event registrations updatable authenticated" ON public.event_registrations FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin()) WITH CHECK ((select auth.uid()) = user_id OR public.is_admin());
CREATE POLICY "event registrations deletable authenticated" ON public.event_registrations FOR DELETE TO authenticated USING ((select auth.uid()) = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admins manage spotlights" ON public.spotlights;
DROP POLICY IF EXISTS "published spotlights readable" ON public.spotlights;
CREATE POLICY "published spotlights readable anon" ON public.spotlights FOR SELECT TO anon USING (status='published');
CREATE POLICY "spotlights readable authenticated" ON public.spotlights FOR SELECT TO authenticated USING (status='published' OR public.is_admin());
CREATE POLICY "admins insert spotlights" ON public.spotlights FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update spotlights" ON public.spotlights FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete spotlights" ON public.spotlights FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins manage organisations" ON public.organisations;
CREATE POLICY "admins manage organisations" ON public.organisations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins manage partnerships" ON public.partnerships;
CREATE POLICY "admins manage partnerships" ON public.partnerships FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
