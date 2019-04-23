const eventCategories = {
  Task: 'other',
  Program: 'other',
  Animation: 'rendering',
  EventDispatch: 'scripting',
  RequestMainThreadFrame: 'rendering',
  BeginFrame: 'rendering',
  BeginMainThreadFrame: 'rendering',
  DrawFrame: 'rendering',
  HitTest: 'rendering',
  ScheduleStyleRecalculation: 'rendering',
  RecalculateStyles: 'rendering',
  UpdateLayoutTree: 'rendering',
  InvalidateLayout: 'rendering',
  Layout: 'rendering',
  PaintSetup: 'painting',
  PaintImage: 'painting',
  UpdateLayer: 'painting',
  UpdateLayerTree: 'rendering',
  Paint: 'painting',
  RasterTask: 'painting',
  ScrollLayer: 'rendering',
  CompositeLayers: 'painting',
  ParseHTML: 'loading',
  ParseAuthorStyleSheet: 'loading',
  TimerInstall: 'scripting',
  TimerRemove: 'scripting',
  TimerFire: 'scripting',
  XHRReadyStateChange: 'scripting',
  XHRLoad: 'scripting',
  CompileScript: 'scripting',
  EvaluateScript: 'scripting',
  CompileModule: 'scripting',
  EvaluateModule: 'scripting',
  ParseScriptOnBackground: 'scripting',
  WasmStreamFromResponseCallback: 'scripting',
  WasmCompiledModule: 'scripting',
  WasmCachedModule: 'scripting',
  WasmModuleCacheHit: 'scripting',
  WasmModuleCacheInvalid: 'scripting',
  FrameStartedLoading: 'loading',
  MarkLoad: 'scripting',
  MarkDOMContent: 'scripting',
  MarkFirstPaint: 'painting',
  MarkFCP: 'rendering',
  MarkFMP: 'rendering',
  TimeStamp: 'scripting',
  ConsoleTime: 'scripting',
  UserTiming: 'scripting',
  ResourceSendRequest: 'loading',
  ResourceReceiveResponse: 'loading',
  ResourceFinish: 'loading',
  ResourceReceivedData: 'loading',
  RunMicrotasks: 'scripting',
  FunctionCall: 'scripting',
  GCEvent: 'scripting',
  MajorGC: 'scripting',
  MinorGC: 'scripting',
  JSFrame: 'scripting',
  RequestAnimationFrame: 'scripting',
  CancelAnimationFrame: 'scripting',
  FireAnimationFrame: 'scripting',
  RequestIdleCallback: 'scripting',
  CancelIdleCallback: 'scripting',
  FireIdleCallback: 'scripting',
  WebSocketCreate: 'scripting',
  WebSocketSendHandshakeRequest: 'scripting',
  WebSocketReceiveHandshakeResponse: 'scripting',
  WebSocketDestroy: 'scripting',
  EmbedderCallback: 'scripting',
  DecodeImage: 'painting',
  ResizeImage: 'painting',
  GPUTask: 'gpu',
  LatencyInfo: 'scripting',
  GCCollectGarbage: 'scripting',
  CryptoDoEncrypt: 'scripting',
  CryptoDoEncryptReply: 'scripting',
  CryptoDoDecrypt: 'scripting',
  CryptoDoDecryptReply: 'scripting',
  CryptoDoDigest: 'scripting',
  CryptoDoDigestReply: 'scripting',
  CryptoDoSign: 'scripting',
  CryptoDoSignReply: 'scripting',
  CryptoDoVerify: 'scripting',
  CryptoDoVerifyReply: 'scripting',
  AsyncTask: 'async',
};

function round(num, decimals = 3) {
  const pow = Math.pow(10, decimals);
  return Math.round(num * pow) / pow;
}

function isIgnored(event) {
  const isInvalid = () => !event.name;
  const isTopLevel = () => (event.cat || '').includes('toplevel');
  const isIgnoredType = () => [
    'Decode LazyPixelRef',
    'PaintImage',
    'UpdateLayer',
    'ImageDecodeTask',
    'LatencyInfo.Flow',
    'PlatformResourceSendRequest',
    'CommitLoad',
  ].includes(event.name);

  return isInvalid() || isTopLevel() || isIgnoredType();
}

function isChildEvent(previous, current) {
  if (!previous) {
    return false;
  }
  return current.ts < previous.ts + previous.dur;
}

function findParentEvents(eventStack, event) {
  const parentStack = [];
  for (const previousEvent of eventStack) {
    if (isChildEvent(previousEvent, event)) {
      parentStack.push(previousEvent);
    } else {
      break;
    }
  }
  return parentStack;
}

function roundAndFilter(timePerType) {
  const entries = Object.entries(timePerType);

  return entries.reduce((result, [type, time]) => {
    const rounded = round(time / 1e3, 3);
    if (rounded > 0) {
      result[type] = rounded;
    }
    return result;
  }, {});
}

const keyFromEvent = event => eventCategories[event.name];

function processEvents(events) {
  const eventBuffer = [];
  const result = [];

  events.forEach((event) => {
    if (isIgnored(event)) return;
    if (event.pid !== 57347) return;
    switch (event.ph) {
      case 'B':
        eventBuffer.push(event);
        break;
      case 'E':
        event = processEndEvent(event);
      // eslint-disable-next-line no-fallthrough
      case 'X': {
        event.dur = event.dur || 0;
        result.push(event);
        break;
      }
      default: break;
    }
  });

  return result.sort((a, b) => a.ts - b.ts);

  function processEndEvent(endEvent) {
    const beginEvent = eventBuffer.pop();
    let dur = endEvent.ts - beginEvent.ts;

    if (dur < 0) { dur = 0; }

    console.log('B-E dur', dur, beginEvent.ts);

    return {
      ...beginEvent,
      ...endEvent,
      ph: 'X',
      dur,
      ts: beginEvent.ts,
    };
  }
}

module.exports = function summarize(trace) {
  const json = JSON.parse(trace);
  const events = processEvents(json.traceEvents || json);

  let eventStack = [];
  const summary = events.reduce((result, event) => {
    result[keyFromEvent(event)] = (result[keyFromEvent(event)] || 0) + event.dur;

    eventStack = findParentEvents(eventStack, event);

    const previousEvent = eventStack.pop();
    if (isChildEvent(previousEvent, event)) {
      eventStack.push(previousEvent);
      result[keyFromEvent(previousEvent)] -= event.dur;
    }
    eventStack.push(event);

    return result;
  }, {});

  summary.duration = events[events.length - 1].ts - events[0].ts;// + events[events.length - 1].dur;

  return roundAndFilter(summary);
};
