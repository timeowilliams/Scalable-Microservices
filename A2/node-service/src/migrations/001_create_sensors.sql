-- Create sensors table
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('temperature', 'humidity', 'motion', 'pressure', 'light')),
    value NUMERIC NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_sensors_type ON sensors(type);

-- Create index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_sensors_timestamp ON sensors(timestamp);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
