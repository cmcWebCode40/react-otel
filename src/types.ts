import { EventName } from "@opentelemetry/instrumentation-user-interaction";
import { BufferConfig, LoggerProviderConfig } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReaderOptions } from "@opentelemetry/sdk-metrics";
import { BufferConfig as TraceBufferConfig } from "@opentelemetry/sdk-trace-web";

export interface OtelConfig {
  resourcesAttributes: {
    name: string;
    version: string;
  };
  instrumentations?: {
    eventNames?: EventName[];
  };
  headers?: Record<string, string>;
  traces: {
    url: string;
    traceExporterConfig?: any;
    batchTraceProcessorConfig?: TraceBufferConfig;
  };
  logs: {
    url: string;
    logExporterConfig?: any;
    loggerProviderConfig?: LoggerProviderConfig;
    batchLogProcessorConfig?: BufferConfig;
  };
  metrics: {
    url: string;
    metricExporterConfig?: any;
    meterReaderConfig?: PeriodicExportingMetricReaderOptions
  };
}