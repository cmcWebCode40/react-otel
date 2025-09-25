"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerProvider = exports.meterProvider = exports.traceProvider = exports.SeverityNumber = void 0;
exports.initOtel = initOtel;
exports.getMeter = getMeter;
exports.getTracer = getTracer;
exports.getLogger = getLogger;
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const context_zone_1 = require("@opentelemetry/context-zone");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_document_load_1 = require("@opentelemetry/instrumentation-document-load");
const instrumentation_fetch_1 = require("@opentelemetry/instrumentation-fetch");
const instrumentation_xml_http_request_1 = require("@opentelemetry/instrumentation-xml-http-request");
const instrumentation_user_interaction_1 = require("@opentelemetry/instrumentation-user-interaction");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_metrics_2 = require("@opentelemetry/sdk-metrics");
const resources_1 = require("@opentelemetry/resources");
const opentelemetry = __importStar(require("@opentelemetry/api"));
const apiLogs = __importStar(require("@opentelemetry/api-logs"));
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
Object.defineProperty(exports, "SeverityNumber", { enumerable: true, get: function () { return api_logs_1.SeverityNumber; } });
let meterProvider;
let traceProvider;
let loggerProvider;
function initOtel(config) {
    const { instrumentations, logs: { logExporterConfig, url: logUrl, batchLogProcessorConfig, loggerProviderConfig, }, metrics: { url: metricUrl, metricExporterConfig, meterReaderConfig }, traces: { url: traceUrl, traceExporterConfig, batchTraceProcessorConfig }, resourcesAttributes: { name, version }, headers = { "Content-Type": "application/json" }, } = config;
    const resource = (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: name,
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: version,
    });
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter(Object.assign({ url: traceUrl, headers }, traceExporterConfig));
    exports.traceProvider = traceProvider = new sdk_trace_web_1.WebTracerProvider({
        resource,
        spanProcessors: [
            new sdk_trace_base_1.BatchSpanProcessor(traceExporter, Object.assign({ maxQueueSize: 100, maxExportBatchSize: 10, scheduledDelayMillis: 2000, exportTimeoutMillis: 30000 }, batchTraceProcessorConfig)),
            new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()),
        ],
    });
    opentelemetry.trace.setGlobalTracerProvider(traceProvider);
    traceProvider.register({ contextManager: new context_zone_1.ZoneContextManager() });
    const metricExporter = new exporter_metrics_otlp_http_1.OTLPMetricExporter(Object.assign({ url: metricUrl, headers }, metricExporterConfig));
    const originalExport = metricExporter.export.bind(metricExporter);
    metricExporter.export = (metrics, resultCallback) => {
        return originalExport(metrics, (result) => {
            resultCallback(result);
        });
    };
    const metricReader = new sdk_metrics_2.PeriodicExportingMetricReader(Object.assign({ exporter: metricExporter, exportIntervalMillis: 5000 }, meterReaderConfig));
    exports.meterProvider = meterProvider = new sdk_metrics_1.MeterProvider({
        resource,
        readers: [metricReader],
        views: [
            {
                name: "app.button.clicks",
                instrumentName: "button_clicks_total",
            },
            {
                aggregation: {
                    type: sdk_metrics_1.AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
                    options: {
                        boundaries: [0, 50, 100, 200, 500, 1000, 2000, 5000],
                    },
                },
                instrumentName: "api_response_time",
            },
        ],
    });
    opentelemetry.metrics.setGlobalMeterProvider(meterProvider);
    const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter(Object.assign({ url: logUrl, headers }, logExporterConfig));
    exports.loggerProvider = loggerProvider = new sdk_logs_1.LoggerProvider(Object.assign(Object.assign({ resource }, loggerProviderConfig), { processors: [
            new sdk_logs_1.BatchLogRecordProcessor(logExporter, Object.assign({ maxQueueSize: 100, maxExportBatchSize: 10, scheduledDelayMillis: 2000, exportTimeoutMillis: 30000 }, batchLogProcessorConfig)),
        ] }));
    apiLogs.logs.setGlobalLoggerProvider(loggerProvider);
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: [
            new instrumentation_document_load_1.DocumentLoadInstrumentation(),
            new instrumentation_fetch_1.FetchInstrumentation({
                propagateTraceHeaderCorsUrls: [/.*/],
                clearTimingResources: true,
            }),
            new instrumentation_xml_http_request_1.XMLHttpRequestInstrumentation({
                propagateTraceHeaderCorsUrls: [/.*/],
            }),
            new instrumentation_user_interaction_1.UserInteractionInstrumentation({
                eventNames: [...((instrumentations === null || instrumentations === void 0 ? void 0 : instrumentations.eventNames) || [])],
            }),
        ],
    });
}
function getMeter(name, version) {
    return api_1.metrics.getMeter(name, version);
}
function getTracer(name, version) {
    return api_1.trace.getTracer(name, version);
}
function getLogger(name, version) {
    return api_logs_1.logs.getLogger(name, version);
}
