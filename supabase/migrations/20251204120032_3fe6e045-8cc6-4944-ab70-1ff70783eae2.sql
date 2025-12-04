-- Create storage bucket for case images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to case images
CREATE POLICY "Public can view case images"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-images');

-- Allow service role to upload case images
CREATE POLICY "Service role can upload case images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'case-images');