const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

let sdk;
let initialized = false;

function initTracing(config) {
  if (initialized) {
    return;
  }

  const exporterOptions = {};
  if (config.getOtelEndpoint()) {
    exporterOptions.url = config.getOtelEndpoint();
  }

  sdk = new NodeSDK({
    serviceName: config.getOtelServiceName(),
    traceExporter: new OTLPTraceExporter(exporterOptions),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  initialized = true;
}

function shutdownTracing() {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}

module.exports = {
  initTracing,
  shutdownTracing,
};
