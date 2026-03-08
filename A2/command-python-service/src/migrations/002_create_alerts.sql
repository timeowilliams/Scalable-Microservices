-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(100) PRIMARY KEY,
    sensor_id VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on sensor_id
CREATE INDEX IF NOT EXISTS idx_alerts_sensor_id ON alerts(sensor_id);

-- Create index on acknowledged
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- Create index on severity
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
