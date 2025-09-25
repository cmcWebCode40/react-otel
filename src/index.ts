import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { MeterProvider, AggregationType } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { UserInteractionInstrumentation } from "@opentelemetry/instrumentation-user-interaction";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import * as opentelemetry from "@opentelemetry/api";
import * as apiLogs from "@opentelemetry/api-logs";
import { metrics, trace } from "@opentelemetry/api";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { OtelConfig } from "./types";

let meterProvider: MeterProvider | undefined;
let traceProvider: WebTracerProvider | undefined;
let loggerProvider: LoggerProvider | undefined;

export function initOtel(config: OtelConfig) {
  const {
    instrumentations,
    logs: {
      logExporterConfig,
      url: logUrl,
      batchLogProcessorConfig,
      loggerProviderConfig,
    },
    metrics: { url: metricUrl, metricExporterConfig, meterReaderConfig },
    traces: { url: traceUrl, traceExporterConfig, batchTraceProcessorConfig },
    resourcesAttributes: { name, version },
    headers = { "Content-Type": "application/json" },
  } = config;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: name,
    [ATTR_SERVICE_VERSION]: version,
  });

  const traceExporter = new OTLPTraceExporter({
    url: traceUrl,
    headers,
    ...traceExporterConfig,
  });

  traceProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 2000,
        exportTimeoutMillis: 30000,
        ...batchTraceProcessorConfig,
      }),
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
    ],
  });

  opentelemetry.trace.setGlobalTracerProvider(traceProvider);
  traceProvider.register({ contextManager: new ZoneContextManager() });

  const metricExporter = new OTLPMetricExporter({
    url: metricUrl,
    headers,
    ...metricExporterConfig,
  });

  const originalExport = metricExporter.export.bind(metricExporter);
  metricExporter.export = (metrics, resultCallback) => {
    return originalExport(metrics, (result) => {
      resultCallback(result);
    });
  };

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
    ...meterReaderConfig,
  });

  meterProvider = new MeterProvider({
    resource,
    readers: [metricReader],
    views: [
      {
        name: "app.button.clicks",
        instrumentName: "button_clicks_total",
      },
      {
        aggregation: {
          type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
          options: {
            boundaries: [0, 50, 100, 200, 500, 1000, 2000, 5000],
          },
        },
        instrumentName: "api_response_time",
      },
    ],
  });

  opentelemetry.metrics.setGlobalMeterProvider(meterProvider);

  const logExporter = new OTLPLogExporter({
    url: logUrl,
    headers,
    ...logExporterConfig,
  });

  loggerProvider = new LoggerProvider({
    resource,
    ...loggerProviderConfig,
    processors: [
      new BatchLogRecordProcessor(logExporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 2000,
        exportTimeoutMillis: 30000,
        ...batchLogProcessorConfig,
      }),
    ],
  });

  apiLogs.logs.setGlobalLoggerProvider(loggerProvider);

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/.*/],
        clearTimingResources: true,
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
      new UserInteractionInstrumentation({
        eventNames: [...(instrumentations?.eventNames || [])],
      }),
    ],
  });
}

export function getMeter(name: string, version?: string) {
  return metrics.getMeter(name, version);
}

export function getTracer(name: string, version?: string) {
  return trace.getTracer(name, version);
}

export function getLogger(name: string, version?: string) {
  return logs.getLogger(name, version);
}

export { SeverityNumber, traceProvider, meterProvider, loggerProvider };
