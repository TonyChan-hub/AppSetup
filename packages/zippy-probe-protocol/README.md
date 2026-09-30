# @bear1210/zippy-probe-protocol

Shared JSON message contract for Zippy desktop and mobile probe SDKs (`@bear1210/zippy-rn`, `zippy_flutter`, desktop `@bear1210/zippy`).

## Usage

```js
import {
  DEFAULT_PROBE_PORT,
  Method,
  EventType,
  createRequest,
  createResponse,
  createEvent,
} from '@bear1210/zippy-probe-protocol';
```

Default probe WebSocket path: `ws://host:9876/probe`. Consumers: [zippy_rn](../zippy_rn) · [zippy_flutter](../zippy_flutter) · [Zippy docs](../../docs/guide/zippy.md).
