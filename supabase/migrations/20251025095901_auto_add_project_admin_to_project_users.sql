/*
  # Auto-add Project Admin to project_users

  ## Problem
  - Proje oluşturulduğunda admin project_users tablosuna eklenmiyor
  - Bu yüzden proje admin'i kendi projesine erişemiyor
  
  ## Çözüm
  - Proje oluşturulduğunda admin'i otomatik olarak project_users'a ekle
  - Trigger ile otomatik yönetim
  
  ## Güvenlik
  - Sadece INSERT sırasında çalışır
  - Admin otomatik olarak proje üyesi olur
*/

-- Create function to add project admin to project_users
CREATE OR REPLACE FUNCTION add_project_admin_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Add project admin to project_users if not already there
  INSERT INTO project_users (project_id, user_id, assigned_at)
  VALUES (NEW.id, NEW.admin_id, now())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_project_created_add_admin ON projects;

CREATE TRIGGER on_project_created_add_admin
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_admin_to_users();

-- Fix existing projects: Add admins to project_users if missing
INSERT INTO project_users (project_id, user_id, assigned_at)
SELECT 
  p.id,
  p.admin_id,
  now()
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_users pu
  WHERE pu.project_id = p.id
  AND pu.user_id = p.admin_id
)
ON CONFLICT DO NOTHING;