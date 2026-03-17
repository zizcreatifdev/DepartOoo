-- Migration 030 : politiques RLS pour owner sur departments
-- L'owner doit pouvoir lire et créer tous les départements

-- SELECT : owner voit tous les départements
DROP POLICY IF EXISTS "owner_select_all_departments" ON public.departments;
CREATE POLICY "owner_select_all_departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- INSERT : owner peut créer des départements
DROP POLICY IF EXISTS "owner_insert_departments" ON public.departments;
CREATE POLICY "owner_insert_departments"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- UPDATE : owner peut modifier tous les départements
DROP POLICY IF EXISTS "owner_update_departments" ON public.departments;
CREATE POLICY "owner_update_departments"
ON public.departments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- DELETE : owner peut supprimer des départements
DROP POLICY IF EXISTS "owner_delete_departments" ON public.departments;
CREATE POLICY "owner_delete_departments"
ON public.departments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);
