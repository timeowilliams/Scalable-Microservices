-- Create tactical_dashboards table
CREATE TABLE IF NOT EXISTS tactical_dashboards (
    dashboard_id VARCHAR(100) PRIMARY KEY,
    mission_id VARCHAR(100),
    sensor_summary JSONB NOT NULL,
    threat_level VARCHAR(20) NOT NULL CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on mission_id
CREATE INDEX IF NOT EXISTS idx_dashboards_mission_id ON tactical_dashboards(mission_id);

-- Create index on threat_level
CREATE INDEX IF NOT EXISTS idx_dashboards_threat_level ON tactical_dashboards(threat_level);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON tactical_dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
