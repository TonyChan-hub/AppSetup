# @bear1210/zippy-probe-protocol

Shared JSON message contract for Zippy desktop and mobile probe SDKs.

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

Default probe WebSocket path: `ws://host:9876/probe`.
