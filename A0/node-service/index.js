const express = require("express");
const app = express();

const sensors = [
  {
    sensor_id: "temp_living_room",
    type: "temperature",
    value: 72.4,
    unit: "F",
    timestamp: "2026-01-18T14:30:00Z"
  },
  {
    sensor_id: "humidity_basement",
    type: "humidity",
    value: 45,
    unit: "%",
    timestamp: "2026-01-18T14:30:00Z"
  },
  {
    sensor_id: "motion_kitchen",
    type: "motion",
    value: 0,
    unit: "boolean",
    timestamp: "2026-01-18T14:30:00Z"
  },
  {
    sensor_id: "temp_bedroom",
    type: "temperature",
    value: 68.2,
    unit: "F",
    timestamp: "2026-01-18T14:30:00Z"
  },
  {
    sensor_id: "humidity_living_room",
    type: "humidity",
    value: 42,
    unit: "%",
    timestamp: "2026-01-18T14:30:00Z"
  }
];

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "node" });
});

app.get("/sensors", (req, res) => {
  res.json(sensors);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Node service running on port ${PORT}`);
});
