-- Add time_loss_minutes column to noi_requests table
ALTER TABLE noi_requests 
ADD COLUMN IF NOT EXISTS time_loss_minutes integer;

-- Add comment for documentation
COMMENT ON COLUMN noi_requests.time_loss_minutes IS 'Kayıp Zaman (Dk) - Optional field for lost time in minutes';

