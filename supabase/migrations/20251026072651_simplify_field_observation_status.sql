/*
  # Simplify Field Observation Status System

  1. Changes
    - Remove open_on_time and open_late statuses
    - Replace with single 'open' status
    - Keep closed_on_time and closed_late (calculated at closing approval)
    
  2. Migration Steps
    - Update all existing open_on_time and open_late records to 'open'
    - Update field_observation_history records
    
  3. Rationale
    - Status should be static, not recalculated dynamically
    - Open forms don't need time differentiation until closing
    - Closed forms get time status based on actual vs planned closing date
*/

-- Update field_observation_reports: convert open_on_time and open_late to 'open'
UPDATE field_observation_reports
SET status = 'open'
WHERE status IN ('open_on_time', 'open_late');

-- Update field_observation_history: convert open_on_time and open_late to 'open'
UPDATE field_observation_history
SET new_status = 'open'
WHERE new_status IN ('open_on_time', 'open_late');

UPDATE field_observation_history
SET old_status = 'open'
WHERE old_status IN ('open_on_time', 'open_late');
