/*
  # Saha Gözlem Raporu - Storage Bucket

  ## Değişiklikler
  
  ### Storage Bucket Oluşturma
  - `field-observation-photos` bucket'ı oluşturuldu
  - Public access etkinleştirildi (fotoğrafların görüntülenebilmesi için)
  - Maksimum dosya boyutu: 10MB
  - İzin verilen formatlar: jpg, jpeg, png
  
  ### Storage Politikaları
  - Authenticated kullanıcılar fotoğraf yükleyebilir
  - Herkes public fotoğrafları görüntüleyebilir
  - Sadece yükleyen kişi veya admin silebilir
*/

-- Create storage bucket for field observation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-observation-photos',
  'field-observation-photos',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload field observation photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'field-observation-photos'
);

-- Allow everyone to view photos (bucket is public)
CREATE POLICY "Anyone can view field observation photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'field-observation-photos');

-- Allow users to delete their own photos and admins to delete any
CREATE POLICY "Users can delete their own photos, admins can delete any"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'field-observation-photos' 
  AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
);

-- Allow users to update their own photos and admins to update any
CREATE POLICY "Users can update their own photos, admins can update any"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'field-observation-photos'
  AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
);