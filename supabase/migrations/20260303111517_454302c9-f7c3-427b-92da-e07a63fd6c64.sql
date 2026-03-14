
-- Enum for academic levels
CREATE TYPE public.academic_level AS ENUM ('L1', 'L2', 'L3', 'M1', 'M2');

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('owner', 'chef', 'assistant', 'enseignant');

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  university TEXT NOT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Department filieres
CREATE TABLE public.department_filieres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Department levels
CREATE TABLE public.department_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level public.academic_level NOT NULL,
  UNIQUE(department_id, level)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read/update their own, owners can read all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles: users can read own role, owners can manage all
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'owner') OR auth.uid() = user_id);

CREATE POLICY "Owners can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));

-- Departments: members can view their department, chefs can update
CREATE POLICY "Members can view department" ON public.departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = departments.id
    ) OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Chef can insert department" ON public.departments
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Chef can update department" ON public.departments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = departments.id
    ) AND public.has_role(auth.uid(), 'chef')
  );

-- Department filieres: same access as departments
CREATE POLICY "Members can view filieres" ON public.department_filieres
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_filieres.department_id
    ) OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Chef can manage filieres" ON public.department_filieres
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_filieres.department_id
    ) AND public.has_role(auth.uid(), 'chef')
  );

CREATE POLICY "Chef can delete filieres" ON public.department_filieres
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_filieres.department_id
    ) AND public.has_role(auth.uid(), 'chef')
  );

-- Department levels: same access as departments
CREATE POLICY "Members can view levels" ON public.department_levels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_levels.department_id
    ) OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Chef can manage levels" ON public.department_levels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_levels.department_id
    ) AND public.has_role(auth.uid(), 'chef')
  );

CREATE POLICY "Chef can delete levels" ON public.department_levels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.department_id = department_levels.department_id
    ) AND public.has_role(auth.uid(), 'chef')
  );
