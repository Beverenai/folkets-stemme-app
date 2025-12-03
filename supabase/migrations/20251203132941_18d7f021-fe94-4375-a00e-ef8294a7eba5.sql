-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stortinget_saker table for caching cases from Stortinget API
CREATE TABLE public.stortinget_saker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stortinget_id TEXT NOT NULL UNIQUE,
  tittel TEXT NOT NULL,
  kort_tittel TEXT,
  beskrivelse TEXT,
  tema TEXT,
  status TEXT NOT NULL DEFAULT 'pågående',
  dokumentgruppe TEXT,
  behandlet_sesjon TEXT,
  sist_oppdatert_fra_stortinget TIMESTAMP WITH TIME ZONE,
  stortinget_votering_for INTEGER DEFAULT 0,
  stortinget_votering_mot INTEGER DEFAULT 0,
  stortinget_votering_avholdende INTEGER DEFAULT 0,
  stortinget_vedtak TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folke_stemmer table for user votes
CREATE TABLE public.folke_stemmer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sak_id UUID NOT NULL REFERENCES public.stortinget_saker(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stemme TEXT NOT NULL CHECK (stemme IN ('for', 'mot', 'avholdende')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sak_id, user_id)
);

-- Create parti_voteringer table for party voting results
CREATE TABLE public.parti_voteringer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sak_id UUID NOT NULL REFERENCES public.stortinget_saker(id) ON DELETE CASCADE,
  parti_navn TEXT NOT NULL,
  parti_forkortelse TEXT NOT NULL,
  stemmer_for INTEGER NOT NULL DEFAULT 0,
  stemmer_mot INTEGER NOT NULL DEFAULT 0,
  stemmer_avholdende INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sak_id, parti_forkortelse)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stortinget_saker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folke_stemmer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parti_voteringer ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stortinget saker policies (public read, only system can write)
CREATE POLICY "Anyone can view saker" ON public.stortinget_saker FOR SELECT USING (true);

-- Folke stemmer policies
CREATE POLICY "Users can view all votes" ON public.folke_stemmer FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their vote" ON public.folke_stemmer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vote" ON public.folke_stemmer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vote" ON public.folke_stemmer FOR DELETE USING (auth.uid() = user_id);

-- Parti voteringer policies (public read)
CREATE POLICY "Anyone can view parti voteringer" ON public.parti_voteringer FOR SELECT USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stortinget_saker_updated_at BEFORE UPDATE ON public.stortinget_saker FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();