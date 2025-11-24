/*
  # NOI Oluşturma Yetkisi Ekleme

  ## Değişiklikler
  1. personnel tablosuna noi_create kolonu ekleme
  2. Mevcut noi_access=true olan kullanıcılar için noi_create=true yap
*/

-- 1. Kolonu ekle (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel' AND column_name = 'noi_create'
  ) THEN
    ALTER TABLE personnel
    ADD COLUMN noi_create boolean DEFAULT false;

    -- Index ekle
    CREATE INDEX idx_personnel_noi_create ON personnel(noi_create);

    -- Mevcut noi_access=true olan kullanıcılar için noi_create=true yap
    UPDATE personnel
    SET noi_create = true
    WHERE noi_access = true;
  END IF;
END $$;
