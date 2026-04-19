-- Seed initial sensor data
INSERT INTO sensors (sensor_id, type, value, unit, timestamp) VALUES
    ('temp_living_room', 'temperature', 72.4, 'F', '2026-01-18T14:30:00Z'),
    ('humidity_basement', 'humidity', 45, '%', '2026-01-18T14:30:00Z'),
    ('motion_kitchen', 'motion', 0, 'boolean', '2026-01-18T14:30:00Z'),
    ('temp_bedroom', 'temperature', 68.2, 'F', '2026-01-18T14:30:00Z'),
    ('humidity_living_room', 'humidity', 42, '%', '2026-01-18T14:30:00Z')
ON CONFLICT (sensor_id) DO NOTHING;
