# react-otel

Flexible OpenTelemetry integration for React web applications.

---

## Installation

```bash
npm install react-otel
```

---

## SDK Initialization

**You should initialize OpenTelemetry in your app's entry point (`App.tsx`):**

```typescript
// App.tsx
import React, { useEffect } from "react";
import { initOtel } from "react-otel";

initOtel({
  resourcesAttributes: {
    name: "my-react-app",
    version: "1.0.0",
  },
  traces: {
    url: "http://localhost:4318/v1/traces",
  },
  metrics: {
    url: "http://localhost:4318/v1/metrics",
  },
  logs: {
    url: "http://localhost:4318/v1/logs",
  },
});

function App() {
  return (
    <div>
      <h1>My React App</h1>
      {/* Your app content */}
    </div>
  );
}

export default App;
```

**Note:**

- Only call `initOtel` **once**, early (ideally in your root component or just before render).
- This sets up providers for traces, metrics, and logs, and registers instrumentations.

---

## Usage: Meter, Tracer, Logger

You can access the telemetry primitives anywhere in your app:

```typescript
// telemetry.ts
import { getMeter, getTracer, getLogger } from "react-otel";

export const meter = getMeter("my-react-app", "1.0.0");
export const tracer = getTracer("my-react-app", "1.0.0");
export const logger = getLogger("my-react-app", "1.0.0");
```

---

## Example Component: Action Button with OTEL Tracking

Here’s a small React component that tracks **metrics, traces, and logs** on button click, with custom tags:

```typescript
import React from "react";
import { meter, tracer, logger } from "./telemetry"; // import from the above setup

const actionCounter = meter.createCounter("user_action_clicks_total", {
  description: "Total user action button clicks",
});
const responseTimeHistogram = meter.createHistogram(
  "user_action_response_time",
  {
    description: "Response time for user actions in ms",
  }
);

function ActionButton() {
  const handleClick = async () => {
    // Start a trace span
    const span = tracer.startSpan("user-action", {
      attributes: {
        "user.id": "user-123",
        "action.type": "purchase",
        "ui.button": "action-btn",
      },
    });

    // Add a metric count (with custom tags)
    actionCounter.add(1, {
      "action.type": "purchase",
      environment: "test",
    });

    // Simulate some work and record response time
    const start = performance.now();
    await new Promise((res) => setTimeout(res, Math.random() * 250 + 50));
    const duration = performance.now() - start;
    responseTimeHistogram.record(duration, {
      "action.type": "purchase",
      status: "success",
    });

    // Emit a log record (with custom attributes)
    logger.emit({
      severityText: "INFO",
      body: "User performed purchase action",
      attributes: {
        "user.id": "user-123",
        "action.type": "purchase",
        "ui.button": "action-btn",
        responseTimeMs: Math.round(duration),
      },
    });

    span.end();
    // Optional: show feedback to user
    alert(`Action tracked! Response time: ${Math.round(duration)}ms`);
  };

  return <button onClick={handleClick}>Perform Purchase Action</button>;
}

export default ActionButton;
```

**What this does:**

- **Trace**: Starts and ends a span with custom tags for the action.
- **Metrics**: Increments a counter and records a histogram for response time, with useful tags.
- **Logs**: Emits a log entry with detailed metadata.

Add `<ActionButton />` anywhere in your app to test end-to-end OTEL telemetry!

---

## Config Options

| Option                | Description                | Example Value                           |
| --------------------- | -------------------------- | --------------------------------------- |
| `resourcesAttributes` | Service name/version       | `{ name: "my-app", version: "1.0.0" }`  |
| `traces.url`          | Trace collector endpoint   | `"http://localhost:4318/v1/traces"`     |
| `metrics.url`         | Metrics collector endpoint | `"http://localhost:4318/v1/metrics"`    |
| `logs.url`            | Logs collector endpoint    | `"http://localhost:4318/v1/logs"`       |
| `headers`             | HTTP headers for exporters | `{ "Content-Type": "application/json"}` |

---

## Advanced Usage (for Beta Testing)

You can pass extra config for batch processors, exporters, and override instrumentations via `initOtel` options:

```typescript
initOtel({
  resourcesAttributes: { name: "advanced-app", version: "1.0.0" },
  traces: {
    url: "http://localhost:4318/v1/traces",
    batchTraceProcessorConfig: { maxQueueSize: 200 },
  },
  metrics: {
    url: "http://localhost:4318/v1/metrics",
    meterReaderConfig: { exportIntervalMillis: 10000 },
  },
  logs: {
    url: "http://localhost:4318/v1/logs",
    batchLogProcessorConfig: { scheduledDelayMillis: 1000 },
  },
  instrumentations: { eventNames: ["click", "submit"] },
});
```

##  License

MIT

---

## Feedback & Contributions
