const { publishEvent } = require('./rabbitmqClient');
const { COMMAND_EVENTS, createCommandEvent } = require('./eventSchema');

class CommandEventPublisher {
  async publishCommandIssued(commandData) {
    const event = createCommandEvent(COMMAND_EVENTS.ISSUED, commandData, 'node-command-service');
    return await publishEvent('command.events', 'command.issued', event);
  }

  async publishMissionStatusChanged(missionData) {
    const event = createCommandEvent(COMMAND_EVENTS.MISSION_STATUS_CHANGED, missionData, 'node-command-service');
    return await publishEvent('command.events', 'mission.status.changed', event);
  }

  async publishThreatLevelChanged(threatData) {
    const event = createCommandEvent(COMMAND_EVENTS.THREAT_LEVEL_CHANGED, threatData, 'node-command-service');
    return await publishEvent('command.events', 'threat.level.changed', event);
  }

  async publishAlertAcknowledged(alertData) {
    const event = createCommandEvent(COMMAND_EVENTS.ALERT_ACKNOWLEDGED, alertData, 'node-command-service');
    return await publishEvent('command.events', 'alert.acknowledged', event);
  }
}

module.exports = CommandEventPublisher;
