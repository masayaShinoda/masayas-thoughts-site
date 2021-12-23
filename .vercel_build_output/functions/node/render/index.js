var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key2 of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key2) && key2 !== "default")
        __defProp(target, key2, { get: () => module2[key2], enumerable: !(desc = __getOwnPropDesc(module2, key2)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* toIterator(parts, clone2 = true) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else if (ArrayBuffer.isView(part)) {
      if (clone2) {
        let position = part.byteOffset;
        const end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0;
      while (position !== part.size) {
        const chunk = part.slice(position, Math.min(part.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    length += isBlob(value) ? value.size : Buffer.byteLength(String(value));
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = import_stream.default.Readable.from(body.stream());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error2 = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error2);
        throw error2;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    const error_ = error2 instanceof FetchBaseError ? error2 : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index, array) => {
    if (index % 2 === 0) {
      result.push(array.slice(index, index + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error2) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error2.message}`, "system", error2));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error2) => {
      response.body.destroy(error2);
    });
    if (process.version < "v14") {
      request_.on("socket", (s2) => {
        let endedWithEventsCount;
        s2.prependListener("end", () => {
          endedWithEventsCount = s2._eventsCount;
        });
        s2.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s2._eventsCount && !hadError) {
            const error2 = new Error("Premature close");
            error2.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error2);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              headers.set("Location", locationURL);
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
        raw.once("data", (chunk) => {
          body = (chunk[0] & 15) === 8 ? (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), reject) : (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), reject);
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error2 = new Error("Premature close");
        error2.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error2);
      }
    };
    socket.prependListener("close", onSocketClose);
    request.on("abort", () => {
      socket.removeListener("close", onSocketClose);
    });
    socket.on("data", (buf) => {
      properLastChunkReceived = Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    });
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, commonjsGlobal, src, dataUriToBuffer$1, ponyfill_es2018, POOL_SIZE$1, POOL_SIZE, _Blob, Blob2, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ponyfill_es2018 = { exports: {} };
    (function(module2, exports) {
      (function(global2, factory) {
        factory(exports);
      })(commonjsGlobal, function(exports2) {
        const SymbolPolyfill = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol : (description) => `Symbol(${description})`;
        function noop2() {
          return void 0;
        }
        function getGlobals() {
          if (typeof self !== "undefined") {
            return self;
          } else if (typeof window !== "undefined") {
            return window;
          } else if (typeof commonjsGlobal !== "undefined") {
            return commonjsGlobal;
          }
          return void 0;
        }
        const globals = getGlobals();
        function typeIsObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        const rethrowAssertionErrorRejection = noop2;
        const originalPromise = Promise;
        const originalPromiseThen = Promise.prototype.then;
        const originalPromiseResolve = Promise.resolve.bind(originalPromise);
        const originalPromiseReject = Promise.reject.bind(originalPromise);
        function newPromise(executor) {
          return new originalPromise(executor);
        }
        function promiseResolvedWith(value) {
          return originalPromiseResolve(value);
        }
        function promiseRejectedWith(reason) {
          return originalPromiseReject(reason);
        }
        function PerformPromiseThen(promise, onFulfilled, onRejected) {
          return originalPromiseThen.call(promise, onFulfilled, onRejected);
        }
        function uponPromise(promise, onFulfilled, onRejected) {
          PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
        }
        function uponFulfillment(promise, onFulfilled) {
          uponPromise(promise, onFulfilled);
        }
        function uponRejection(promise, onRejected) {
          uponPromise(promise, void 0, onRejected);
        }
        function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
          return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
        }
        function setPromiseIsHandledToTrue(promise) {
          PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
        }
        const queueMicrotask = (() => {
          const globalQueueMicrotask = globals && globals.queueMicrotask;
          if (typeof globalQueueMicrotask === "function") {
            return globalQueueMicrotask;
          }
          const resolvedPromise = promiseResolvedWith(void 0);
          return (fn) => PerformPromiseThen(resolvedPromise, fn);
        })();
        function reflectCall(F, V, args) {
          if (typeof F !== "function") {
            throw new TypeError("Argument is not a function");
          }
          return Function.prototype.apply.call(F, V, args);
        }
        function promiseCall(F, V, args) {
          try {
            return promiseResolvedWith(reflectCall(F, V, args));
          } catch (value) {
            return promiseRejectedWith(value);
          }
        }
        const QUEUE_MAX_ARRAY_SIZE = 16384;
        class SimpleQueue {
          constructor() {
            this._cursor = 0;
            this._size = 0;
            this._front = {
              _elements: [],
              _next: void 0
            };
            this._back = this._front;
            this._cursor = 0;
            this._size = 0;
          }
          get length() {
            return this._size;
          }
          push(element) {
            const oldBack = this._back;
            let newBack = oldBack;
            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
              newBack = {
                _elements: [],
                _next: void 0
              };
            }
            oldBack._elements.push(element);
            if (newBack !== oldBack) {
              this._back = newBack;
              oldBack._next = newBack;
            }
            ++this._size;
          }
          shift() {
            const oldFront = this._front;
            let newFront = oldFront;
            const oldCursor = this._cursor;
            let newCursor = oldCursor + 1;
            const elements = oldFront._elements;
            const element = elements[oldCursor];
            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
              newFront = oldFront._next;
              newCursor = 0;
            }
            --this._size;
            this._cursor = newCursor;
            if (oldFront !== newFront) {
              this._front = newFront;
            }
            elements[oldCursor] = void 0;
            return element;
          }
          forEach(callback) {
            let i = this._cursor;
            let node = this._front;
            let elements = node._elements;
            while (i !== elements.length || node._next !== void 0) {
              if (i === elements.length) {
                node = node._next;
                elements = node._elements;
                i = 0;
                if (elements.length === 0) {
                  break;
                }
              }
              callback(elements[i]);
              ++i;
            }
          }
          peek() {
            const front = this._front;
            const cursor = this._cursor;
            return front._elements[cursor];
          }
        }
        function ReadableStreamReaderGenericInitialize(reader, stream) {
          reader._ownerReadableStream = stream;
          stream._reader = reader;
          if (stream._state === "readable") {
            defaultReaderClosedPromiseInitialize(reader);
          } else if (stream._state === "closed") {
            defaultReaderClosedPromiseInitializeAsResolved(reader);
          } else {
            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
          }
        }
        function ReadableStreamReaderGenericCancel(reader, reason) {
          const stream = reader._ownerReadableStream;
          return ReadableStreamCancel(stream, reason);
        }
        function ReadableStreamReaderGenericRelease(reader) {
          if (reader._ownerReadableStream._state === "readable") {
            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          } else {
            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          }
          reader._ownerReadableStream._reader = void 0;
          reader._ownerReadableStream = void 0;
        }
        function readerLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released reader");
        }
        function defaultReaderClosedPromiseInitialize(reader) {
          reader._closedPromise = newPromise((resolve2, reject) => {
            reader._closedPromise_resolve = resolve2;
            reader._closedPromise_reject = reject;
          });
        }
        function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseReject(reader, reason);
        }
        function defaultReaderClosedPromiseInitializeAsResolved(reader) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseResolve(reader);
        }
        function defaultReaderClosedPromiseReject(reader, reason) {
          if (reader._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(reader._closedPromise);
          reader._closedPromise_reject(reason);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        function defaultReaderClosedPromiseResetToRejected(reader, reason) {
          defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
        }
        function defaultReaderClosedPromiseResolve(reader) {
          if (reader._closedPromise_resolve === void 0) {
            return;
          }
          reader._closedPromise_resolve(void 0);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        const AbortSteps = SymbolPolyfill("[[AbortSteps]]");
        const ErrorSteps = SymbolPolyfill("[[ErrorSteps]]");
        const CancelSteps = SymbolPolyfill("[[CancelSteps]]");
        const PullSteps = SymbolPolyfill("[[PullSteps]]");
        const NumberIsFinite = Number.isFinite || function(x) {
          return typeof x === "number" && isFinite(x);
        };
        const MathTrunc = Math.trunc || function(v) {
          return v < 0 ? Math.ceil(v) : Math.floor(v);
        };
        function isDictionary(x) {
          return typeof x === "object" || typeof x === "function";
        }
        function assertDictionary(obj, context) {
          if (obj !== void 0 && !isDictionary(obj)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertFunction(x, context) {
          if (typeof x !== "function") {
            throw new TypeError(`${context} is not a function.`);
          }
        }
        function isObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        function assertObject(x, context) {
          if (!isObject(x)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertRequiredArgument(x, position, context) {
          if (x === void 0) {
            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
          }
        }
        function assertRequiredField(x, field, context) {
          if (x === void 0) {
            throw new TypeError(`${field} is required in '${context}'.`);
          }
        }
        function convertUnrestrictedDouble(value) {
          return Number(value);
        }
        function censorNegativeZero(x) {
          return x === 0 ? 0 : x;
        }
        function integerPart(x) {
          return censorNegativeZero(MathTrunc(x));
        }
        function convertUnsignedLongLongWithEnforceRange(value, context) {
          const lowerBound = 0;
          const upperBound = Number.MAX_SAFE_INTEGER;
          let x = Number(value);
          x = censorNegativeZero(x);
          if (!NumberIsFinite(x)) {
            throw new TypeError(`${context} is not a finite number`);
          }
          x = integerPart(x);
          if (x < lowerBound || x > upperBound) {
            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
          }
          if (!NumberIsFinite(x) || x === 0) {
            return 0;
          }
          return x;
        }
        function assertReadableStream(x, context) {
          if (!IsReadableStream(x)) {
            throw new TypeError(`${context} is not a ReadableStream.`);
          }
        }
        function AcquireReadableStreamDefaultReader(stream) {
          return new ReadableStreamDefaultReader(stream);
        }
        function ReadableStreamAddReadRequest(stream, readRequest) {
          stream._reader._readRequests.push(readRequest);
        }
        function ReadableStreamFulfillReadRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readRequest = reader._readRequests.shift();
          if (done) {
            readRequest._closeSteps();
          } else {
            readRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadRequests(stream) {
          return stream._reader._readRequests.length;
        }
        function ReadableStreamHasDefaultReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamDefaultReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamDefaultReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("read"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: () => resolvePromise({ value: void 0, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamDefaultReaderRead(this, readRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamDefaultReader(this)) {
              throw defaultReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamDefaultReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultReader",
            configurable: true
          });
        }
        function IsReadableStreamDefaultReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readRequests")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultReader;
        }
        function ReadableStreamDefaultReaderRead(reader, readRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "closed") {
            readRequest._closeSteps();
          } else if (stream._state === "errored") {
            readRequest._errorSteps(stream._storedError);
          } else {
            stream._readableStreamController[PullSteps](readRequest);
          }
        }
        function defaultReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
        }
        const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
        }).prototype);
        class ReadableStreamAsyncIteratorImpl {
          constructor(reader, preventCancel) {
            this._ongoingPromise = void 0;
            this._isFinished = false;
            this._reader = reader;
            this._preventCancel = preventCancel;
          }
          next() {
            const nextSteps = () => this._nextSteps();
            this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
            return this._ongoingPromise;
          }
          return(value) {
            const returnSteps = () => this._returnSteps(value);
            return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
          }
          _nextSteps() {
            if (this._isFinished) {
              return Promise.resolve({ value: void 0, done: true });
            }
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("iterate"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => {
                this._ongoingPromise = void 0;
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
              },
              _closeSteps: () => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: void 0, done: true });
              },
              _errorSteps: (reason) => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promise;
          }
          _returnSteps(value) {
            if (this._isFinished) {
              return Promise.resolve({ value, done: true });
            }
            this._isFinished = true;
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("finish iterating"));
            }
            if (!this._preventCancel) {
              const result = ReadableStreamReaderGenericCancel(reader, value);
              ReadableStreamReaderGenericRelease(reader);
              return transformPromiseWith(result, () => ({ value, done: true }));
            }
            ReadableStreamReaderGenericRelease(reader);
            return promiseResolvedWith({ value, done: true });
          }
        }
        const ReadableStreamAsyncIteratorPrototype = {
          next() {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
            }
            return this._asyncIteratorImpl.next();
          },
          return(value) {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
            }
            return this._asyncIteratorImpl.return(value);
          }
        };
        if (AsyncIteratorPrototype !== void 0) {
          Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
        }
        function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
          const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
          iterator._asyncIteratorImpl = impl;
          return iterator;
        }
        function IsReadableStreamAsyncIterator(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_asyncIteratorImpl")) {
            return false;
          }
          try {
            return x._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
          } catch (_a) {
            return false;
          }
        }
        function streamAsyncIteratorBrandCheckException(name) {
          return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
        }
        const NumberIsNaN = Number.isNaN || function(x) {
          return x !== x;
        };
        function CreateArrayFromList(elements) {
          return elements.slice();
        }
        function CopyDataBlockBytes(dest, destOffset, src2, srcOffset, n) {
          new Uint8Array(dest).set(new Uint8Array(src2, srcOffset, n), destOffset);
        }
        function TransferArrayBuffer(O) {
          return O;
        }
        function IsDetachedBuffer(O) {
          return false;
        }
        function ArrayBufferSlice(buffer, begin, end) {
          if (buffer.slice) {
            return buffer.slice(begin, end);
          }
          const length = end - begin;
          const slice = new ArrayBuffer(length);
          CopyDataBlockBytes(slice, 0, buffer, begin, length);
          return slice;
        }
        function IsNonNegativeNumber(v) {
          if (typeof v !== "number") {
            return false;
          }
          if (NumberIsNaN(v)) {
            return false;
          }
          if (v < 0) {
            return false;
          }
          return true;
        }
        function CloneAsUint8Array(O) {
          const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
          return new Uint8Array(buffer);
        }
        function DequeueValue(container) {
          const pair = container._queue.shift();
          container._queueTotalSize -= pair.size;
          if (container._queueTotalSize < 0) {
            container._queueTotalSize = 0;
          }
          return pair.value;
        }
        function EnqueueValueWithSize(container, value, size) {
          if (!IsNonNegativeNumber(size) || size === Infinity) {
            throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
          }
          container._queue.push({ value, size });
          container._queueTotalSize += size;
        }
        function PeekQueueValue(container) {
          const pair = container._queue.peek();
          return pair.value;
        }
        function ResetQueue(container) {
          container._queue = new SimpleQueue();
          container._queueTotalSize = 0;
        }
        class ReadableStreamBYOBRequest {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get view() {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("view");
            }
            return this._view;
          }
          respond(bytesWritten) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respond");
            }
            assertRequiredArgument(bytesWritten, 1, "respond");
            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(this._view.buffer))
              ;
            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
          }
          respondWithNewView(view) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respondWithNewView");
            }
            assertRequiredArgument(view, 1, "respondWithNewView");
            if (!ArrayBuffer.isView(view)) {
              throw new TypeError("You can only respond with array buffer views");
            }
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
          }
        }
        Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
          respond: { enumerable: true },
          respondWithNewView: { enumerable: true },
          view: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBRequest",
            configurable: true
          });
        }
        class ReadableByteStreamController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get byobRequest() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("byobRequest");
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
          }
          get desiredSize() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("desiredSize");
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("close");
            }
            if (this._closeRequested) {
              throw new TypeError("The stream has already been closed; do not close it again!");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
            }
            ReadableByteStreamControllerClose(this);
          }
          enqueue(chunk) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("enqueue");
            }
            assertRequiredArgument(chunk, 1, "enqueue");
            if (!ArrayBuffer.isView(chunk)) {
              throw new TypeError("chunk must be an array buffer view");
            }
            if (chunk.byteLength === 0) {
              throw new TypeError("chunk must have non-zero byteLength");
            }
            if (chunk.buffer.byteLength === 0) {
              throw new TypeError(`chunk's buffer must have non-zero byteLength`);
            }
            if (this._closeRequested) {
              throw new TypeError("stream is closed or draining");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
            }
            ReadableByteStreamControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("error");
            }
            ReadableByteStreamControllerError(this, e);
          }
          [CancelSteps](reason) {
            ReadableByteStreamControllerClearPendingPullIntos(this);
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableByteStreamControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableByteStream;
            if (this._queueTotalSize > 0) {
              const entry = this._queue.shift();
              this._queueTotalSize -= entry.byteLength;
              ReadableByteStreamControllerHandleQueueDrain(this);
              const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
              readRequest._chunkSteps(view);
              return;
            }
            const autoAllocateChunkSize = this._autoAllocateChunkSize;
            if (autoAllocateChunkSize !== void 0) {
              let buffer;
              try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
              } catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
              }
              const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: "default"
              };
              this._pendingPullIntos.push(pullIntoDescriptor);
            }
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableByteStreamControllerCallPullIfNeeded(this);
          }
        }
        Object.defineProperties(ReadableByteStreamController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          byobRequest: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableByteStreamController",
            configurable: true
          });
        }
        function IsReadableByteStreamController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableByteStream")) {
            return false;
          }
          return x instanceof ReadableByteStreamController;
        }
        function IsReadableStreamBYOBRequest(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_associatedReadableByteStreamController")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBRequest;
        }
        function ReadableByteStreamControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableByteStreamControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableByteStreamControllerError(controller, e);
          });
        }
        function ReadableByteStreamControllerClearPendingPullIntos(controller) {
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          controller._pendingPullIntos = new SimpleQueue();
        }
        function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
          let done = false;
          if (stream._state === "closed") {
            done = true;
          }
          const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
          if (pullIntoDescriptor.readerType === "default") {
            ReadableStreamFulfillReadRequest(stream, filledView, done);
          } else {
            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
          }
        }
        function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
          const bytesFilled = pullIntoDescriptor.bytesFilled;
          const elementSize = pullIntoDescriptor.elementSize;
          return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
        }
        function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
          controller._queue.push({ buffer, byteOffset, byteLength });
          controller._queueTotalSize += byteLength;
        }
        function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
          const elementSize = pullIntoDescriptor.elementSize;
          const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
          const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
          const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
          const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
          let totalBytesToCopyRemaining = maxBytesToCopy;
          let ready = false;
          if (maxAlignedBytes > currentAlignedBytes) {
            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
            ready = true;
          }
          const queue = controller._queue;
          while (totalBytesToCopyRemaining > 0) {
            const headOfQueue = queue.peek();
            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
            if (headOfQueue.byteLength === bytesToCopy) {
              queue.shift();
            } else {
              headOfQueue.byteOffset += bytesToCopy;
              headOfQueue.byteLength -= bytesToCopy;
            }
            controller._queueTotalSize -= bytesToCopy;
            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
            totalBytesToCopyRemaining -= bytesToCopy;
          }
          return ready;
        }
        function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
          pullIntoDescriptor.bytesFilled += size;
        }
        function ReadableByteStreamControllerHandleQueueDrain(controller) {
          if (controller._queueTotalSize === 0 && controller._closeRequested) {
            ReadableByteStreamControllerClearAlgorithms(controller);
            ReadableStreamClose(controller._controlledReadableByteStream);
          } else {
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
        }
        function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
          if (controller._byobRequest === null) {
            return;
          }
          controller._byobRequest._associatedReadableByteStreamController = void 0;
          controller._byobRequest._view = null;
          controller._byobRequest = null;
        }
        function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
          while (controller._pendingPullIntos.length > 0) {
            if (controller._queueTotalSize === 0) {
              return;
            }
            const pullIntoDescriptor = controller._pendingPullIntos.peek();
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
          const stream = controller._controlledReadableByteStream;
          let elementSize = 1;
          if (view.constructor !== DataView) {
            elementSize = view.constructor.BYTES_PER_ELEMENT;
          }
          const ctor = view.constructor;
          const buffer = TransferArrayBuffer(view.buffer);
          const pullIntoDescriptor = {
            buffer,
            bufferByteLength: buffer.byteLength,
            byteOffset: view.byteOffset,
            byteLength: view.byteLength,
            bytesFilled: 0,
            elementSize,
            viewConstructor: ctor,
            readerType: "byob"
          };
          if (controller._pendingPullIntos.length > 0) {
            controller._pendingPullIntos.push(pullIntoDescriptor);
            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
            return;
          }
          if (stream._state === "closed") {
            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
            readIntoRequest._closeSteps(emptyView);
            return;
          }
          if (controller._queueTotalSize > 0) {
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
              ReadableByteStreamControllerHandleQueueDrain(controller);
              readIntoRequest._chunkSteps(filledView);
              return;
            }
            if (controller._closeRequested) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              readIntoRequest._errorSteps(e);
              return;
            }
          }
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
          const stream = controller._controlledReadableByteStream;
          if (ReadableStreamHasBYOBReader(stream)) {
            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
              const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
          if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
            return;
          }
          ReadableByteStreamControllerShiftPendingPullInto(controller);
          const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
          if (remainderSize > 0) {
            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
          }
          pullIntoDescriptor.bytesFilled -= remainderSize;
          ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        }
        function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            ReadableByteStreamControllerRespondInClosedState(controller);
          } else {
            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerShiftPendingPullInto(controller) {
          const descriptor = controller._pendingPullIntos.shift();
          return descriptor;
        }
        function ReadableByteStreamControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return false;
          }
          if (controller._closeRequested) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableByteStreamControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
        }
        function ReadableByteStreamControllerClose(controller) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          if (controller._queueTotalSize > 0) {
            controller._closeRequested = true;
            return;
          }
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (firstPendingPullInto.bytesFilled > 0) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              throw e;
            }
          }
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
        function ReadableByteStreamControllerEnqueue(controller, chunk) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          const buffer = chunk.buffer;
          const byteOffset = chunk.byteOffset;
          const byteLength = chunk.byteLength;
          const transferredBuffer = TransferArrayBuffer(buffer);
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (IsDetachedBuffer(firstPendingPullInto.buffer))
              ;
            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          if (ReadableStreamHasDefaultReader(stream)) {
            if (ReadableStreamGetNumReadRequests(stream) === 0) {
              ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            } else {
              const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
              ReadableStreamFulfillReadRequest(stream, transferredView, false);
            }
          } else if (ReadableStreamHasBYOBReader(stream)) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          } else {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerError(controller, e) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return;
          }
          ReadableByteStreamControllerClearPendingPullIntos(controller);
          ResetQueue(controller);
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableByteStreamControllerGetBYOBRequest(controller) {
          if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
            const firstDescriptor = controller._pendingPullIntos.peek();
            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
            controller._byobRequest = byobRequest;
          }
          return controller._byobRequest;
        }
        function ReadableByteStreamControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableByteStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableByteStreamControllerRespond(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (bytesWritten !== 0) {
              throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
            }
          } else {
            if (bytesWritten === 0) {
              throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
            }
            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
              throw new RangeError("bytesWritten out of range");
            }
          }
          firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
          ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
        }
        function ReadableByteStreamControllerRespondWithNewView(controller, view) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (view.byteLength !== 0) {
              throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
            }
          } else {
            if (view.byteLength === 0) {
              throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
            }
          }
          if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
            throw new RangeError("The region specified by view does not match byobRequest");
          }
          if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
            throw new RangeError("The buffer of view has different capacity than byobRequest");
          }
          if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
            throw new RangeError("The region specified by view is larger than byobRequest");
          }
          firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
          ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
        }
        function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
          controller._controlledReadableByteStream = stream;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._byobRequest = null;
          controller._queue = controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._closeRequested = false;
          controller._started = false;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          controller._autoAllocateChunkSize = autoAllocateChunkSize;
          controller._pendingPullIntos = new SimpleQueue();
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableByteStreamControllerError(controller, r);
          });
        }
        function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
          const controller = Object.create(ReadableByteStreamController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingByteSource.start !== void 0) {
            startAlgorithm = () => underlyingByteSource.start(controller);
          }
          if (underlyingByteSource.pull !== void 0) {
            pullAlgorithm = () => underlyingByteSource.pull(controller);
          }
          if (underlyingByteSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
          }
          const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
          if (autoAllocateChunkSize === 0) {
            throw new TypeError("autoAllocateChunkSize must be greater than 0");
          }
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
        }
        function SetUpReadableStreamBYOBRequest(request, controller, view) {
          request._associatedReadableByteStreamController = controller;
          request._view = view;
        }
        function byobRequestBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
        }
        function byteStreamControllerBrandCheckException(name) {
          return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
        }
        function AcquireReadableStreamBYOBReader(stream) {
          return new ReadableStreamBYOBReader(stream);
        }
        function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
          stream._reader._readIntoRequests.push(readIntoRequest);
        }
        function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readIntoRequest = reader._readIntoRequests.shift();
          if (done) {
            readIntoRequest._closeSteps(chunk);
          } else {
            readIntoRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadIntoRequests(stream) {
          return stream._reader._readIntoRequests.length;
        }
        function ReadableStreamHasBYOBReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamBYOBReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamBYOBReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            if (!IsReadableByteStreamController(stream._readableStreamController)) {
              throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readIntoRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read(view) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("read"));
            }
            if (!ArrayBuffer.isView(view)) {
              return promiseRejectedWith(new TypeError("view must be an array buffer view"));
            }
            if (view.byteLength === 0) {
              return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
            }
            if (view.buffer.byteLength === 0) {
              return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readIntoRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamBYOBReader(this)) {
              throw byobReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readIntoRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamBYOBReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBReader",
            configurable: true
          });
        }
        function IsReadableStreamBYOBReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readIntoRequests")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBReader;
        }
        function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "errored") {
            readIntoRequest._errorSteps(stream._storedError);
          } else {
            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
          }
        }
        function byobReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
        }
        function ExtractHighWaterMark(strategy, defaultHWM) {
          const { highWaterMark } = strategy;
          if (highWaterMark === void 0) {
            return defaultHWM;
          }
          if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
            throw new RangeError("Invalid highWaterMark");
          }
          return highWaterMark;
        }
        function ExtractSizeAlgorithm(strategy) {
          const { size } = strategy;
          if (!size) {
            return () => 1;
          }
          return size;
        }
        function convertQueuingStrategy(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          const size = init2 === null || init2 === void 0 ? void 0 : init2.size;
          return {
            highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
            size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
          };
        }
        function convertQueuingStrategySize(fn, context) {
          assertFunction(fn, context);
          return (chunk) => convertUnrestrictedDouble(fn(chunk));
        }
        function convertUnderlyingSink(original, context) {
          assertDictionary(original, context);
          const abort = original === null || original === void 0 ? void 0 : original.abort;
          const close = original === null || original === void 0 ? void 0 : original.close;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          const write = original === null || original === void 0 ? void 0 : original.write;
          return {
            abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
            close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
            write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
            type
          };
        }
        function convertUnderlyingSinkAbortCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSinkCloseCallback(fn, original, context) {
          assertFunction(fn, context);
          return () => promiseCall(fn, original, []);
        }
        function convertUnderlyingSinkStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertUnderlyingSinkWriteCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        function assertWritableStream(x, context) {
          if (!IsWritableStream(x)) {
            throw new TypeError(`${context} is not a WritableStream.`);
          }
        }
        function isAbortSignal2(value) {
          if (typeof value !== "object" || value === null) {
            return false;
          }
          try {
            return typeof value.aborted === "boolean";
          } catch (_a) {
            return false;
          }
        }
        const supportsAbortController = typeof AbortController === "function";
        function createAbortController() {
          if (supportsAbortController) {
            return new AbortController();
          }
          return void 0;
        }
        class WritableStream {
          constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
            if (rawUnderlyingSink === void 0) {
              rawUnderlyingSink = null;
            } else {
              assertObject(rawUnderlyingSink, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
            InitializeWritableStream(this);
            const type = underlyingSink.type;
            if (type !== void 0) {
              throw new RangeError("Invalid type is specified");
            }
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
          }
          get locked() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("locked");
            }
            return IsWritableStreamLocked(this);
          }
          abort(reason = void 0) {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("abort"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
            }
            return WritableStreamAbort(this, reason);
          }
          close() {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("close"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
            }
            if (WritableStreamCloseQueuedOrInFlight(this)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamClose(this);
          }
          getWriter() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("getWriter");
            }
            return AcquireWritableStreamDefaultWriter(this);
          }
        }
        Object.defineProperties(WritableStream.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          getWriter: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStream",
            configurable: true
          });
        }
        function AcquireWritableStreamDefaultWriter(stream) {
          return new WritableStreamDefaultWriter(stream);
        }
        function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(WritableStream.prototype);
          InitializeWritableStream(stream);
          const controller = Object.create(WritableStreamDefaultController.prototype);
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function InitializeWritableStream(stream) {
          stream._state = "writable";
          stream._storedError = void 0;
          stream._writer = void 0;
          stream._writableStreamController = void 0;
          stream._writeRequests = new SimpleQueue();
          stream._inFlightWriteRequest = void 0;
          stream._closeRequest = void 0;
          stream._inFlightCloseRequest = void 0;
          stream._pendingAbortRequest = void 0;
          stream._backpressure = false;
        }
        function IsWritableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_writableStreamController")) {
            return false;
          }
          return x instanceof WritableStream;
        }
        function IsWritableStreamLocked(stream) {
          if (stream._writer === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamAbort(stream, reason) {
          var _a;
          if (stream._state === "closed" || stream._state === "errored") {
            return promiseResolvedWith(void 0);
          }
          stream._writableStreamController._abortReason = reason;
          (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseResolvedWith(void 0);
          }
          if (stream._pendingAbortRequest !== void 0) {
            return stream._pendingAbortRequest._promise;
          }
          let wasAlreadyErroring = false;
          if (state === "erroring") {
            wasAlreadyErroring = true;
            reason = void 0;
          }
          const promise = newPromise((resolve2, reject) => {
            stream._pendingAbortRequest = {
              _promise: void 0,
              _resolve: resolve2,
              _reject: reject,
              _reason: reason,
              _wasAlreadyErroring: wasAlreadyErroring
            };
          });
          stream._pendingAbortRequest._promise = promise;
          if (!wasAlreadyErroring) {
            WritableStreamStartErroring(stream, reason);
          }
          return promise;
        }
        function WritableStreamClose(stream) {
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
          }
          const promise = newPromise((resolve2, reject) => {
            const closeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._closeRequest = closeRequest;
          });
          const writer = stream._writer;
          if (writer !== void 0 && stream._backpressure && state === "writable") {
            defaultWriterReadyPromiseResolve(writer);
          }
          WritableStreamDefaultControllerClose(stream._writableStreamController);
          return promise;
        }
        function WritableStreamAddWriteRequest(stream) {
          const promise = newPromise((resolve2, reject) => {
            const writeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._writeRequests.push(writeRequest);
          });
          return promise;
        }
        function WritableStreamDealWithRejection(stream, error2) {
          const state = stream._state;
          if (state === "writable") {
            WritableStreamStartErroring(stream, error2);
            return;
          }
          WritableStreamFinishErroring(stream);
        }
        function WritableStreamStartErroring(stream, reason) {
          const controller = stream._writableStreamController;
          stream._state = "erroring";
          stream._storedError = reason;
          const writer = stream._writer;
          if (writer !== void 0) {
            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
          }
          if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
            WritableStreamFinishErroring(stream);
          }
        }
        function WritableStreamFinishErroring(stream) {
          stream._state = "errored";
          stream._writableStreamController[ErrorSteps]();
          const storedError = stream._storedError;
          stream._writeRequests.forEach((writeRequest) => {
            writeRequest._reject(storedError);
          });
          stream._writeRequests = new SimpleQueue();
          if (stream._pendingAbortRequest === void 0) {
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const abortRequest = stream._pendingAbortRequest;
          stream._pendingAbortRequest = void 0;
          if (abortRequest._wasAlreadyErroring) {
            abortRequest._reject(storedError);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
          uponPromise(promise, () => {
            abortRequest._resolve();
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          }, (reason) => {
            abortRequest._reject(reason);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          });
        }
        function WritableStreamFinishInFlightWrite(stream) {
          stream._inFlightWriteRequest._resolve(void 0);
          stream._inFlightWriteRequest = void 0;
        }
        function WritableStreamFinishInFlightWriteWithError(stream, error2) {
          stream._inFlightWriteRequest._reject(error2);
          stream._inFlightWriteRequest = void 0;
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamFinishInFlightClose(stream) {
          stream._inFlightCloseRequest._resolve(void 0);
          stream._inFlightCloseRequest = void 0;
          const state = stream._state;
          if (state === "erroring") {
            stream._storedError = void 0;
            if (stream._pendingAbortRequest !== void 0) {
              stream._pendingAbortRequest._resolve();
              stream._pendingAbortRequest = void 0;
            }
          }
          stream._state = "closed";
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseResolve(writer);
          }
        }
        function WritableStreamFinishInFlightCloseWithError(stream, error2) {
          stream._inFlightCloseRequest._reject(error2);
          stream._inFlightCloseRequest = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._reject(error2);
            stream._pendingAbortRequest = void 0;
          }
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamCloseQueuedOrInFlight(stream) {
          if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamHasOperationMarkedInFlight(stream) {
          if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamMarkCloseRequestInFlight(stream) {
          stream._inFlightCloseRequest = stream._closeRequest;
          stream._closeRequest = void 0;
        }
        function WritableStreamMarkFirstWriteRequestInFlight(stream) {
          stream._inFlightWriteRequest = stream._writeRequests.shift();
        }
        function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
          if (stream._closeRequest !== void 0) {
            stream._closeRequest._reject(stream._storedError);
            stream._closeRequest = void 0;
          }
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseReject(writer, stream._storedError);
          }
        }
        function WritableStreamUpdateBackpressure(stream, backpressure) {
          const writer = stream._writer;
          if (writer !== void 0 && backpressure !== stream._backpressure) {
            if (backpressure) {
              defaultWriterReadyPromiseReset(writer);
            } else {
              defaultWriterReadyPromiseResolve(writer);
            }
          }
          stream._backpressure = backpressure;
        }
        class WritableStreamDefaultWriter {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
            assertWritableStream(stream, "First parameter");
            if (IsWritableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive writing by another writer");
            }
            this._ownerWritableStream = stream;
            stream._writer = this;
            const state = stream._state;
            if (state === "writable") {
              if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
              } else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
              }
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "erroring") {
              defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "closed") {
              defaultWriterReadyPromiseInitializeAsResolved(this);
              defaultWriterClosedPromiseInitializeAsResolved(this);
            } else {
              const storedError = stream._storedError;
              defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
              defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
            }
          }
          get closed() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          get desiredSize() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("desiredSize");
            }
            if (this._ownerWritableStream === void 0) {
              throw defaultWriterLockException("desiredSize");
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
          }
          get ready() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
            }
            return this._readyPromise;
          }
          abort(reason = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("abort"));
            }
            return WritableStreamDefaultWriterAbort(this, reason);
          }
          close() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("close"));
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("close"));
            }
            if (WritableStreamCloseQueuedOrInFlight(stream)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamDefaultWriterClose(this);
          }
          releaseLock() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("releaseLock");
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return;
            }
            WritableStreamDefaultWriterRelease(this);
          }
          write(chunk = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("write"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("write to"));
            }
            return WritableStreamDefaultWriterWrite(this, chunk);
          }
        }
        Object.defineProperties(WritableStreamDefaultWriter.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          releaseLock: { enumerable: true },
          write: { enumerable: true },
          closed: { enumerable: true },
          desiredSize: { enumerable: true },
          ready: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultWriter",
            configurable: true
          });
        }
        function IsWritableStreamDefaultWriter(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_ownerWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultWriter;
        }
        function WritableStreamDefaultWriterAbort(writer, reason) {
          const stream = writer._ownerWritableStream;
          return WritableStreamAbort(stream, reason);
        }
        function WritableStreamDefaultWriterClose(writer) {
          const stream = writer._ownerWritableStream;
          return WritableStreamClose(stream);
        }
        function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          return WritableStreamDefaultWriterClose(writer);
        }
        function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error2) {
          if (writer._closedPromiseState === "pending") {
            defaultWriterClosedPromiseReject(writer, error2);
          } else {
            defaultWriterClosedPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error2) {
          if (writer._readyPromiseState === "pending") {
            defaultWriterReadyPromiseReject(writer, error2);
          } else {
            defaultWriterReadyPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterGetDesiredSize(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (state === "errored" || state === "erroring") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
        }
        function WritableStreamDefaultWriterRelease(writer) {
          const stream = writer._ownerWritableStream;
          const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
          WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
          stream._writer = void 0;
          writer._ownerWritableStream = void 0;
        }
        function WritableStreamDefaultWriterWrite(writer, chunk) {
          const stream = writer._ownerWritableStream;
          const controller = stream._writableStreamController;
          const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
          if (stream !== writer._ownerWritableStream) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          const state = stream._state;
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
          }
          if (state === "erroring") {
            return promiseRejectedWith(stream._storedError);
          }
          const promise = WritableStreamAddWriteRequest(stream);
          WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
          return promise;
        }
        const closeSentinel = {};
        class WritableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get abortReason() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("abortReason");
            }
            return this._abortReason;
          }
          get signal() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("signal");
            }
            if (this._abortController === void 0) {
              throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
            }
            return this._abortController.signal;
          }
          error(e = void 0) {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("error");
            }
            const state = this._controlledWritableStream._state;
            if (state !== "writable") {
              return;
            }
            WritableStreamDefaultControllerError(this, e);
          }
          [AbortSteps](reason) {
            const result = this._abortAlgorithm(reason);
            WritableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [ErrorSteps]() {
            ResetQueue(this);
          }
        }
        Object.defineProperties(WritableStreamDefaultController.prototype, {
          error: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultController",
            configurable: true
          });
        }
        function IsWritableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultController;
        }
        function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledWritableStream = stream;
          stream._writableStreamController = controller;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._abortReason = void 0;
          controller._abortController = createAbortController();
          controller._started = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._writeAlgorithm = writeAlgorithm;
          controller._closeAlgorithm = closeAlgorithm;
          controller._abortAlgorithm = abortAlgorithm;
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
          const startResult = startAlgorithm();
          const startPromise = promiseResolvedWith(startResult);
          uponPromise(startPromise, () => {
            controller._started = true;
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (r) => {
            controller._started = true;
            WritableStreamDealWithRejection(stream, r);
          });
        }
        function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(WritableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let writeAlgorithm = () => promiseResolvedWith(void 0);
          let closeAlgorithm = () => promiseResolvedWith(void 0);
          let abortAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSink.start !== void 0) {
            startAlgorithm = () => underlyingSink.start(controller);
          }
          if (underlyingSink.write !== void 0) {
            writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
          }
          if (underlyingSink.close !== void 0) {
            closeAlgorithm = () => underlyingSink.close();
          }
          if (underlyingSink.abort !== void 0) {
            abortAlgorithm = (reason) => underlyingSink.abort(reason);
          }
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function WritableStreamDefaultControllerClearAlgorithms(controller) {
          controller._writeAlgorithm = void 0;
          controller._closeAlgorithm = void 0;
          controller._abortAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function WritableStreamDefaultControllerClose(controller) {
          EnqueueValueWithSize(controller, closeSentinel, 0);
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
          try {
            return controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
            return 1;
          }
        }
        function WritableStreamDefaultControllerGetDesiredSize(controller) {
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
            return;
          }
          const stream = controller._controlledWritableStream;
          if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
          const stream = controller._controlledWritableStream;
          if (!controller._started) {
            return;
          }
          if (stream._inFlightWriteRequest !== void 0) {
            return;
          }
          const state = stream._state;
          if (state === "erroring") {
            WritableStreamFinishErroring(stream);
            return;
          }
          if (controller._queue.length === 0) {
            return;
          }
          const value = PeekQueueValue(controller);
          if (value === closeSentinel) {
            WritableStreamDefaultControllerProcessClose(controller);
          } else {
            WritableStreamDefaultControllerProcessWrite(controller, value);
          }
        }
        function WritableStreamDefaultControllerErrorIfNeeded(controller, error2) {
          if (controller._controlledWritableStream._state === "writable") {
            WritableStreamDefaultControllerError(controller, error2);
          }
        }
        function WritableStreamDefaultControllerProcessClose(controller) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkCloseRequestInFlight(stream);
          DequeueValue(controller);
          const sinkClosePromise = controller._closeAlgorithm();
          WritableStreamDefaultControllerClearAlgorithms(controller);
          uponPromise(sinkClosePromise, () => {
            WritableStreamFinishInFlightClose(stream);
          }, (reason) => {
            WritableStreamFinishInFlightCloseWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkFirstWriteRequestInFlight(stream);
          const sinkWritePromise = controller._writeAlgorithm(chunk);
          uponPromise(sinkWritePromise, () => {
            WritableStreamFinishInFlightWrite(stream);
            const state = stream._state;
            DequeueValue(controller);
            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
              const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
              WritableStreamUpdateBackpressure(stream, backpressure);
            }
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (reason) => {
            if (stream._state === "writable") {
              WritableStreamDefaultControllerClearAlgorithms(controller);
            }
            WritableStreamFinishInFlightWriteWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerGetBackpressure(controller) {
          const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
          return desiredSize <= 0;
        }
        function WritableStreamDefaultControllerError(controller, error2) {
          const stream = controller._controlledWritableStream;
          WritableStreamDefaultControllerClearAlgorithms(controller);
          WritableStreamStartErroring(stream, error2);
        }
        function streamBrandCheckException$2(name) {
          return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
        }
        function defaultControllerBrandCheckException$2(name) {
          return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
        }
        function defaultWriterBrandCheckException(name) {
          return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
        }
        function defaultWriterLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released writer");
        }
        function defaultWriterClosedPromiseInitialize(writer) {
          writer._closedPromise = newPromise((resolve2, reject) => {
            writer._closedPromise_resolve = resolve2;
            writer._closedPromise_reject = reject;
            writer._closedPromiseState = "pending";
          });
        }
        function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseReject(writer, reason);
        }
        function defaultWriterClosedPromiseInitializeAsResolved(writer) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseResolve(writer);
        }
        function defaultWriterClosedPromiseReject(writer, reason) {
          if (writer._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._closedPromise);
          writer._closedPromise_reject(reason);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "rejected";
        }
        function defaultWriterClosedPromiseResetToRejected(writer, reason) {
          defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterClosedPromiseResolve(writer) {
          if (writer._closedPromise_resolve === void 0) {
            return;
          }
          writer._closedPromise_resolve(void 0);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "resolved";
        }
        function defaultWriterReadyPromiseInitialize(writer) {
          writer._readyPromise = newPromise((resolve2, reject) => {
            writer._readyPromise_resolve = resolve2;
            writer._readyPromise_reject = reject;
          });
          writer._readyPromiseState = "pending";
        }
        function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseReject(writer, reason);
        }
        function defaultWriterReadyPromiseInitializeAsResolved(writer) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseResolve(writer);
        }
        function defaultWriterReadyPromiseReject(writer, reason) {
          if (writer._readyPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._readyPromise);
          writer._readyPromise_reject(reason);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "rejected";
        }
        function defaultWriterReadyPromiseReset(writer) {
          defaultWriterReadyPromiseInitialize(writer);
        }
        function defaultWriterReadyPromiseResetToRejected(writer, reason) {
          defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterReadyPromiseResolve(writer) {
          if (writer._readyPromise_resolve === void 0) {
            return;
          }
          writer._readyPromise_resolve(void 0);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "fulfilled";
        }
        const NativeDOMException = typeof DOMException !== "undefined" ? DOMException : void 0;
        function isDOMExceptionConstructor(ctor) {
          if (!(typeof ctor === "function" || typeof ctor === "object")) {
            return false;
          }
          try {
            new ctor();
            return true;
          } catch (_a) {
            return false;
          }
        }
        function createDOMExceptionPolyfill() {
          const ctor = function DOMException2(message, name) {
            this.message = message || "";
            this.name = name || "Error";
            if (Error.captureStackTrace) {
              Error.captureStackTrace(this, this.constructor);
            }
          };
          ctor.prototype = Object.create(Error.prototype);
          Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
          return ctor;
        }
        const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();
        function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
          const reader = AcquireReadableStreamDefaultReader(source);
          const writer = AcquireWritableStreamDefaultWriter(dest);
          source._disturbed = true;
          let shuttingDown = false;
          let currentWrite = promiseResolvedWith(void 0);
          return newPromise((resolve2, reject) => {
            let abortAlgorithm;
            if (signal !== void 0) {
              abortAlgorithm = () => {
                const error2 = new DOMException$1("Aborted", "AbortError");
                const actions = [];
                if (!preventAbort) {
                  actions.push(() => {
                    if (dest._state === "writable") {
                      return WritableStreamAbort(dest, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                if (!preventCancel) {
                  actions.push(() => {
                    if (source._state === "readable") {
                      return ReadableStreamCancel(source, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error2);
              };
              if (signal.aborted) {
                abortAlgorithm();
                return;
              }
              signal.addEventListener("abort", abortAlgorithm);
            }
            function pipeLoop() {
              return newPromise((resolveLoop, rejectLoop) => {
                function next(done) {
                  if (done) {
                    resolveLoop();
                  } else {
                    PerformPromiseThen(pipeStep(), next, rejectLoop);
                  }
                }
                next(false);
              });
            }
            function pipeStep() {
              if (shuttingDown) {
                return promiseResolvedWith(true);
              }
              return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                  ReadableStreamDefaultReaderRead(reader, {
                    _chunkSteps: (chunk) => {
                      currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop2);
                      resolveRead(false);
                    },
                    _closeSteps: () => resolveRead(true),
                    _errorSteps: rejectRead
                  });
                });
              });
            }
            isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
              if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesClosed(source, reader._closedPromise, () => {
              if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
              } else {
                shutdown();
              }
            });
            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
              const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
              } else {
                shutdown(true, destClosed);
              }
            }
            setPromiseIsHandledToTrue(pipeLoop());
            function waitForWritesToFinish() {
              const oldCurrentWrite = currentWrite;
              return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
            }
            function isOrBecomesErrored(stream, promise, action) {
              if (stream._state === "errored") {
                action(stream._storedError);
              } else {
                uponRejection(promise, action);
              }
            }
            function isOrBecomesClosed(stream, promise, action) {
              if (stream._state === "closed") {
                action();
              } else {
                uponFulfillment(promise, action);
              }
            }
            function shutdownWithAction(action, originalIsError, originalError) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
              } else {
                doTheRest();
              }
              function doTheRest() {
                uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              }
            }
            function shutdown(isError, error2) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error2));
              } else {
                finalize(isError, error2);
              }
            }
            function finalize(isError, error2) {
              WritableStreamDefaultWriterRelease(writer);
              ReadableStreamReaderGenericRelease(reader);
              if (signal !== void 0) {
                signal.removeEventListener("abort", abortAlgorithm);
              }
              if (isError) {
                reject(error2);
              } else {
                resolve2(void 0);
              }
            }
          });
        }
        class ReadableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("desiredSize");
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("close");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits close");
            }
            ReadableStreamDefaultControllerClose(this);
          }
          enqueue(chunk = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("enqueue");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits enqueue");
            }
            return ReadableStreamDefaultControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("error");
            }
            ReadableStreamDefaultControllerError(this, e);
          }
          [CancelSteps](reason) {
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableStream;
            if (this._queue.length > 0) {
              const chunk = DequeueValue(this);
              if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
              } else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
              }
              readRequest._chunkSteps(chunk);
            } else {
              ReadableStreamAddReadRequest(stream, readRequest);
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
          }
        }
        Object.defineProperties(ReadableStreamDefaultController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultController",
            configurable: true
          });
        }
        function IsReadableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableStream")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultController;
        }
        function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableStreamDefaultControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableStreamDefaultControllerError(controller, e);
          });
        }
        function ReadableStreamDefaultControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableStream;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableStreamDefaultControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function ReadableStreamDefaultControllerClose(controller) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          controller._closeRequested = true;
          if (controller._queue.length === 0) {
            ReadableStreamDefaultControllerClearAlgorithms(controller);
            ReadableStreamClose(stream);
          }
        }
        function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            ReadableStreamFulfillReadRequest(stream, chunk, false);
          } else {
            let chunkSize;
            try {
              chunkSize = controller._strategySizeAlgorithm(chunk);
            } catch (chunkSizeE) {
              ReadableStreamDefaultControllerError(controller, chunkSizeE);
              throw chunkSizeE;
            }
            try {
              EnqueueValueWithSize(controller, chunk, chunkSize);
            } catch (enqueueE) {
              ReadableStreamDefaultControllerError(controller, enqueueE);
              throw enqueueE;
            }
          }
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        function ReadableStreamDefaultControllerError(controller, e) {
          const stream = controller._controlledReadableStream;
          if (stream._state !== "readable") {
            return;
          }
          ResetQueue(controller);
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableStreamDefaultControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableStreamDefaultControllerHasBackpressure(controller) {
          if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
            return false;
          }
          return true;
        }
        function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
          const state = controller._controlledReadableStream._state;
          if (!controller._closeRequested && state === "readable") {
            return true;
          }
          return false;
        }
        function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledReadableStream = stream;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._started = false;
          controller._closeRequested = false;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableStreamDefaultControllerError(controller, r);
          });
        }
        function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSource.start !== void 0) {
            startAlgorithm = () => underlyingSource.start(controller);
          }
          if (underlyingSource.pull !== void 0) {
            pullAlgorithm = () => underlyingSource.pull(controller);
          }
          if (underlyingSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
          }
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function defaultControllerBrandCheckException$1(name) {
          return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
        }
        function ReadableStreamTee(stream, cloneForBranch2) {
          if (IsReadableByteStreamController(stream._readableStreamController)) {
            return ReadableByteStreamTee(stream);
          }
          return ReadableStreamDefaultTee(stream);
        }
        function ReadableStreamDefaultTee(stream, cloneForBranch2) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function pullAlgorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  const chunk2 = chunk;
                  if (!canceled1) {
                    ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
          }
          branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
          branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
          uponRejection(reader._closedPromise, (r) => {
            ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
            ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
          });
          return [branch1, branch2];
        }
        function ReadableByteStreamTee(stream) {
          let reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function forwardReaderError(thisReader) {
            uponRejection(thisReader._closedPromise, (r) => {
              if (thisReader !== reader) {
                return;
              }
              ReadableByteStreamControllerError(branch1._readableStreamController, r);
              ReadableByteStreamControllerError(branch2._readableStreamController, r);
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            });
          }
          function pullWithDefaultReader() {
            if (IsReadableStreamBYOBReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamDefaultReader(stream);
              forwardReaderError(reader);
            }
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  let chunk2 = chunk;
                  if (!canceled1 && !canceled2) {
                    try {
                      chunk2 = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                  }
                  if (!canceled1) {
                    ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
          }
          function pullWithBYOBReader(view, forBranch2) {
            if (IsReadableStreamDefaultReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamBYOBReader(stream);
              forwardReaderError(reader);
            }
            const byobBranch = forBranch2 ? branch2 : branch1;
            const otherBranch = forBranch2 ? branch1 : branch2;
            const readIntoRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const byobCanceled = forBranch2 ? canceled2 : canceled1;
                  const otherCanceled = forBranch2 ? canceled1 : canceled2;
                  if (!otherCanceled) {
                    let clonedChunk;
                    try {
                      clonedChunk = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                    if (!byobCanceled) {
                      ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                  } else if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                });
              },
              _closeSteps: (chunk) => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                  ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                  ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== void 0) {
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                  }
                }
                if (!byobCanceled || !otherCanceled) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
          }
          function pull1Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, false);
            }
            return promiseResolvedWith(void 0);
          }
          function pull2Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, true);
            }
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
            return;
          }
          branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
          branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
          forwardReaderError(reader);
          return [branch1, branch2];
        }
        function convertUnderlyingDefaultOrByteSource(source, context) {
          assertDictionary(source, context);
          const original = source;
          const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
          const cancel = original === null || original === void 0 ? void 0 : original.cancel;
          const pull = original === null || original === void 0 ? void 0 : original.pull;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          return {
            autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
            cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
            pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
            type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
          };
        }
        function convertUnderlyingSourceCancelCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSourcePullCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertUnderlyingSourceStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertReadableStreamType(type, context) {
          type = `${type}`;
          if (type !== "bytes") {
            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
          }
          return type;
        }
        function convertReaderOptions(options2, context) {
          assertDictionary(options2, context);
          const mode = options2 === null || options2 === void 0 ? void 0 : options2.mode;
          return {
            mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
          };
        }
        function convertReadableStreamReaderMode(mode, context) {
          mode = `${mode}`;
          if (mode !== "byob") {
            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
          }
          return mode;
        }
        function convertIteratorOptions(options2, context) {
          assertDictionary(options2, context);
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          return { preventCancel: Boolean(preventCancel) };
        }
        function convertPipeOptions(options2, context) {
          assertDictionary(options2, context);
          const preventAbort = options2 === null || options2 === void 0 ? void 0 : options2.preventAbort;
          const preventCancel = options2 === null || options2 === void 0 ? void 0 : options2.preventCancel;
          const preventClose = options2 === null || options2 === void 0 ? void 0 : options2.preventClose;
          const signal = options2 === null || options2 === void 0 ? void 0 : options2.signal;
          if (signal !== void 0) {
            assertAbortSignal(signal, `${context} has member 'signal' that`);
          }
          return {
            preventAbort: Boolean(preventAbort),
            preventCancel: Boolean(preventCancel),
            preventClose: Boolean(preventClose),
            signal
          };
        }
        function assertAbortSignal(signal, context) {
          if (!isAbortSignal2(signal)) {
            throw new TypeError(`${context} is not an AbortSignal.`);
          }
        }
        function convertReadableWritablePair(pair, context) {
          assertDictionary(pair, context);
          const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
          assertRequiredField(readable, "readable", "ReadableWritablePair");
          assertReadableStream(readable, `${context} has member 'readable' that`);
          const writable2 = pair === null || pair === void 0 ? void 0 : pair.writable;
          assertRequiredField(writable2, "writable", "ReadableWritablePair");
          assertWritableStream(writable2, `${context} has member 'writable' that`);
          return { readable, writable: writable2 };
        }
        class ReadableStream2 {
          constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
            if (rawUnderlyingSource === void 0) {
              rawUnderlyingSource = null;
            } else {
              assertObject(rawUnderlyingSource, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
            InitializeReadableStream(this);
            if (underlyingSource.type === "bytes") {
              if (strategy.size !== void 0) {
                throw new RangeError("The strategy for a byte stream cannot have a size function");
              }
              const highWaterMark = ExtractHighWaterMark(strategy, 0);
              SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
            } else {
              const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
              const highWaterMark = ExtractHighWaterMark(strategy, 1);
              SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
            }
          }
          get locked() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("locked");
            }
            return IsReadableStreamLocked(this);
          }
          cancel(reason = void 0) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("cancel"));
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
            }
            return ReadableStreamCancel(this, reason);
          }
          getReader(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("getReader");
            }
            const options2 = convertReaderOptions(rawOptions, "First parameter");
            if (options2.mode === void 0) {
              return AcquireReadableStreamDefaultReader(this);
            }
            return AcquireReadableStreamBYOBReader(this);
          }
          pipeThrough(rawTransform, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("pipeThrough");
            }
            assertRequiredArgument(rawTransform, 1, "pipeThrough");
            const transform = convertReadableWritablePair(rawTransform, "First parameter");
            const options2 = convertPipeOptions(rawOptions, "Second parameter");
            if (IsReadableStreamLocked(this)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
            }
            if (IsWritableStreamLocked(transform.writable)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
            }
            const promise = ReadableStreamPipeTo(this, transform.writable, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
            setPromiseIsHandledToTrue(promise);
            return transform.readable;
          }
          pipeTo(destination, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
            }
            if (destination === void 0) {
              return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
            }
            if (!IsWritableStream(destination)) {
              return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
            }
            let options2;
            try {
              options2 = convertPipeOptions(rawOptions, "Second parameter");
            } catch (e) {
              return promiseRejectedWith(e);
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
            }
            if (IsWritableStreamLocked(destination)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
            }
            return ReadableStreamPipeTo(this, destination, options2.preventClose, options2.preventAbort, options2.preventCancel, options2.signal);
          }
          tee() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("tee");
            }
            const branches = ReadableStreamTee(this);
            return CreateArrayFromList(branches);
          }
          values(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("values");
            }
            const options2 = convertIteratorOptions(rawOptions, "First parameter");
            return AcquireReadableStreamAsyncIterator(this, options2.preventCancel);
          }
        }
        Object.defineProperties(ReadableStream2.prototype, {
          cancel: { enumerable: true },
          getReader: { enumerable: true },
          pipeThrough: { enumerable: true },
          pipeTo: { enumerable: true },
          tee: { enumerable: true },
          values: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStream",
            configurable: true
          });
        }
        if (typeof SymbolPolyfill.asyncIterator === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.asyncIterator, {
            value: ReadableStream2.prototype.values,
            writable: true,
            configurable: true
          });
        }
        function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableByteStreamController.prototype);
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
          return stream;
        }
        function InitializeReadableStream(stream) {
          stream._state = "readable";
          stream._reader = void 0;
          stream._storedError = void 0;
          stream._disturbed = false;
        }
        function IsReadableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readableStreamController")) {
            return false;
          }
          return x instanceof ReadableStream2;
        }
        function IsReadableStreamLocked(stream) {
          if (stream._reader === void 0) {
            return false;
          }
          return true;
        }
        function ReadableStreamCancel(stream, reason) {
          stream._disturbed = true;
          if (stream._state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (stream._state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          ReadableStreamClose(stream);
          const reader = stream._reader;
          if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._closeSteps(void 0);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
          const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
          return transformPromiseWith(sourceCancelPromise, noop2);
        }
        function ReadableStreamClose(stream) {
          stream._state = "closed";
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseResolve(reader);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._closeSteps();
            });
            reader._readRequests = new SimpleQueue();
          }
        }
        function ReadableStreamError(stream, e) {
          stream._state = "errored";
          stream._storedError = e;
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseReject(reader, e);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._errorSteps(e);
            });
            reader._readRequests = new SimpleQueue();
          } else {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._errorSteps(e);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
        }
        function streamBrandCheckException$1(name) {
          return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
        }
        function convertQueuingStrategyInit(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
          return {
            highWaterMark: convertUnrestrictedDouble(highWaterMark)
          };
        }
        const byteLengthSizeFunction = (chunk) => {
          return chunk.byteLength;
        };
        Object.defineProperty(byteLengthSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class ByteLengthQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "ByteLengthQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._byteLengthQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("highWaterMark");
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("size");
            }
            return byteLengthSizeFunction;
          }
        }
        Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "ByteLengthQueuingStrategy",
            configurable: true
          });
        }
        function byteLengthBrandCheckException(name) {
          return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
        }
        function IsByteLengthQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_byteLengthQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof ByteLengthQueuingStrategy;
        }
        const countSizeFunction = () => {
          return 1;
        };
        Object.defineProperty(countSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class CountQueuingStrategy {
          constructor(options2) {
            assertRequiredArgument(options2, 1, "CountQueuingStrategy");
            options2 = convertQueuingStrategyInit(options2, "First parameter");
            this._countQueuingStrategyHighWaterMark = options2.highWaterMark;
          }
          get highWaterMark() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("highWaterMark");
            }
            return this._countQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("size");
            }
            return countSizeFunction;
          }
        }
        Object.defineProperties(CountQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "CountQueuingStrategy",
            configurable: true
          });
        }
        function countBrandCheckException(name) {
          return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
        }
        function IsCountQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_countQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof CountQueuingStrategy;
        }
        function convertTransformer(original, context) {
          assertDictionary(original, context);
          const flush = original === null || original === void 0 ? void 0 : original.flush;
          const readableType = original === null || original === void 0 ? void 0 : original.readableType;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const transform = original === null || original === void 0 ? void 0 : original.transform;
          const writableType = original === null || original === void 0 ? void 0 : original.writableType;
          return {
            flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
            readableType,
            start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
            transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
            writableType
          };
        }
        function convertTransformerFlushCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertTransformerStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertTransformerTransformCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        class TransformStream {
          constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
            if (rawTransformer === void 0) {
              rawTransformer = null;
            }
            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
            const transformer = convertTransformer(rawTransformer, "First parameter");
            if (transformer.readableType !== void 0) {
              throw new RangeError("Invalid readableType specified");
            }
            if (transformer.writableType !== void 0) {
              throw new RangeError("Invalid writableType specified");
            }
            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
            let startPromise_resolve;
            const startPromise = newPromise((resolve2) => {
              startPromise_resolve = resolve2;
            });
            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
            if (transformer.start !== void 0) {
              startPromise_resolve(transformer.start(this._transformStreamController));
            } else {
              startPromise_resolve(void 0);
            }
          }
          get readable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("readable");
            }
            return this._readable;
          }
          get writable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("writable");
            }
            return this._writable;
          }
        }
        Object.defineProperties(TransformStream.prototype, {
          readable: { enumerable: true },
          writable: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStream",
            configurable: true
          });
        }
        function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
          function startAlgorithm() {
            return startPromise;
          }
          function writeAlgorithm(chunk) {
            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
          }
          function abortAlgorithm(reason) {
            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
          }
          function closeAlgorithm() {
            return TransformStreamDefaultSinkCloseAlgorithm(stream);
          }
          stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
          function pullAlgorithm() {
            return TransformStreamDefaultSourcePullAlgorithm(stream);
          }
          function cancelAlgorithm(reason) {
            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
            return promiseResolvedWith(void 0);
          }
          stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          stream._backpressure = void 0;
          stream._backpressureChangePromise = void 0;
          stream._backpressureChangePromise_resolve = void 0;
          TransformStreamSetBackpressure(stream, true);
          stream._transformStreamController = void 0;
        }
        function IsTransformStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_transformStreamController")) {
            return false;
          }
          return x instanceof TransformStream;
        }
        function TransformStreamError(stream, e) {
          ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
          TransformStreamErrorWritableAndUnblockWrite(stream, e);
        }
        function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
          TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
          WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
          if (stream._backpressure) {
            TransformStreamSetBackpressure(stream, false);
          }
        }
        function TransformStreamSetBackpressure(stream, backpressure) {
          if (stream._backpressureChangePromise !== void 0) {
            stream._backpressureChangePromise_resolve();
          }
          stream._backpressureChangePromise = newPromise((resolve2) => {
            stream._backpressureChangePromise_resolve = resolve2;
          });
          stream._backpressure = backpressure;
        }
        class TransformStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("desiredSize");
            }
            const readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
          }
          enqueue(chunk = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("enqueue");
            }
            TransformStreamDefaultControllerEnqueue(this, chunk);
          }
          error(reason = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("error");
            }
            TransformStreamDefaultControllerError(this, reason);
          }
          terminate() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("terminate");
            }
            TransformStreamDefaultControllerTerminate(this);
          }
        }
        Object.defineProperties(TransformStreamDefaultController.prototype, {
          enqueue: { enumerable: true },
          error: { enumerable: true },
          terminate: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStreamDefaultController",
            configurable: true
          });
        }
        function IsTransformStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledTransformStream")) {
            return false;
          }
          return x instanceof TransformStreamDefaultController;
        }
        function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
          controller._controlledTransformStream = stream;
          stream._transformStreamController = controller;
          controller._transformAlgorithm = transformAlgorithm;
          controller._flushAlgorithm = flushAlgorithm;
        }
        function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
          const controller = Object.create(TransformStreamDefaultController.prototype);
          let transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
          let flushAlgorithm = () => promiseResolvedWith(void 0);
          if (transformer.transform !== void 0) {
            transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
          }
          if (transformer.flush !== void 0) {
            flushAlgorithm = () => transformer.flush(controller);
          }
          SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
        }
        function TransformStreamDefaultControllerClearAlgorithms(controller) {
          controller._transformAlgorithm = void 0;
          controller._flushAlgorithm = void 0;
        }
        function TransformStreamDefaultControllerEnqueue(controller, chunk) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
            throw new TypeError("Readable side is not in a state that permits enqueue");
          }
          try {
            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
          } catch (e) {
            TransformStreamErrorWritableAndUnblockWrite(stream, e);
            throw stream._readable._storedError;
          }
          const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
          if (backpressure !== stream._backpressure) {
            TransformStreamSetBackpressure(stream, true);
          }
        }
        function TransformStreamDefaultControllerError(controller, e) {
          TransformStreamError(controller._controlledTransformStream, e);
        }
        function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
          const transformPromise = controller._transformAlgorithm(chunk);
          return transformPromiseWith(transformPromise, void 0, (r) => {
            TransformStreamError(controller._controlledTransformStream, r);
            throw r;
          });
        }
        function TransformStreamDefaultControllerTerminate(controller) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          ReadableStreamDefaultControllerClose(readableController);
          const error2 = new TypeError("TransformStream terminated");
          TransformStreamErrorWritableAndUnblockWrite(stream, error2);
        }
        function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
          const controller = stream._transformStreamController;
          if (stream._backpressure) {
            const backpressureChangePromise = stream._backpressureChangePromise;
            return transformPromiseWith(backpressureChangePromise, () => {
              const writable2 = stream._writable;
              const state = writable2._state;
              if (state === "erroring") {
                throw writable2._storedError;
              }
              return TransformStreamDefaultControllerPerformTransform(controller, chunk);
            });
          }
          return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        }
        function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
          TransformStreamError(stream, reason);
          return promiseResolvedWith(void 0);
        }
        function TransformStreamDefaultSinkCloseAlgorithm(stream) {
          const readable = stream._readable;
          const controller = stream._transformStreamController;
          const flushPromise = controller._flushAlgorithm();
          TransformStreamDefaultControllerClearAlgorithms(controller);
          return transformPromiseWith(flushPromise, () => {
            if (readable._state === "errored") {
              throw readable._storedError;
            }
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
          }, (r) => {
            TransformStreamError(stream, r);
            throw readable._storedError;
          });
        }
        function TransformStreamDefaultSourcePullAlgorithm(stream) {
          TransformStreamSetBackpressure(stream, false);
          return stream._backpressureChangePromise;
        }
        function defaultControllerBrandCheckException(name) {
          return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
        }
        function streamBrandCheckException(name) {
          return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
        }
        exports2.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
        exports2.CountQueuingStrategy = CountQueuingStrategy;
        exports2.ReadableByteStreamController = ReadableByteStreamController;
        exports2.ReadableStream = ReadableStream2;
        exports2.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
        exports2.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
        exports2.ReadableStreamDefaultController = ReadableStreamDefaultController;
        exports2.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
        exports2.TransformStream = TransformStream;
        exports2.TransformStreamDefaultController = TransformStreamDefaultController;
        exports2.WritableStream = WritableStream;
        exports2.WritableStreamDefaultController = WritableStreamDefaultController;
        exports2.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
        Object.defineProperty(exports2, "__esModule", { value: true });
      });
    })(ponyfill_es2018, ponyfill_es2018.exports);
    POOL_SIZE$1 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        const process2 = require("node:process");
        const { emitWarning } = process2;
        try {
          process2.emitWarning = () => {
          };
          Object.assign(globalThis, require("node:stream/web"));
          process2.emitWarning = emitWarning;
        } catch (error2) {
          process2.emitWarning = emitWarning;
          throw error2;
        }
      } catch (error2) {
        Object.assign(globalThis, ponyfill_es2018.exports);
      }
    }
    try {
      const { Blob: Blob3 } = require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error2) {
    }
    POOL_SIZE = 65536;
    _Blob = class Blob {
      #parts = [];
      #type = "";
      #size = 0;
      constructor(blobParts = [], options2 = {}) {
        if (typeof blobParts !== "object" || blobParts === null) {
          throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
        }
        if (typeof blobParts[Symbol.iterator] !== "function") {
          throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
        }
        if (typeof options2 !== "object" && typeof options2 !== "function") {
          throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
        }
        if (options2 === null)
          options2 = {};
        const encoder = new TextEncoder();
        for (const element of blobParts) {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof Blob) {
            part = element;
          } else {
            part = encoder.encode(element);
          }
          this.#size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
          this.#parts.push(part);
        }
        const type = options2.type === void 0 ? "" : String(options2.type);
        this.#type = /^[\x20-\x7E]*$/.test(type) ? type : "";
      }
      get size() {
        return this.#size;
      }
      get type() {
        return this.#type;
      }
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (const part of toIterator(this.#parts, false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(this.#parts, false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(this.#parts, true);
        return new globalThis.ReadableStream({
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          },
          async cancel() {
            await it.return();
          }
        });
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = this.#parts;
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            relativeEnd -= size2;
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        blob.#size = span;
        blob.#parts = blobParts;
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    Blob$1 = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (error_) => {
            const error2 = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        import_stream.default.Readable.from(body.stream()).pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const error2 = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw error2;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const error2 = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_CHAR" });
        throw error2;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback, thisArg = void 0) {
        for (const name of this.keys()) {
          Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key2) => {
          result[key2] = this.getAll(key2);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key2) => {
          const values = this.getAll(key2);
          if (key2 === "host") {
            result[key2] = values[0];
          } else {
            result[key2] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status != null ? options2.status : 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          type: "default",
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get type() {
        return this[INTERNALS$1].type;
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          type: this.type,
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      static error() {
        const response = new Response(null, { status: 0, statusText: "" });
        response[INTERNALS$1].type = "error";
        return response;
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      type: { enumerable: true },
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal != null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-vercel/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-vercel/files/shims.js"() {
    init_install_fetch();
  }
});

// .svelte-kit/output/server/chunks/stores-6c7c4832.js
var getStores, page;
var init_stores_6c7c4832 = __esm({
  ".svelte-kit/output/server/chunks/stores-6c7c4832.js"() {
    init_shims();
    init_app_c78b47b4();
    getStores = () => {
      const stores = getContext("__svelte__");
      return {
        page: {
          subscribe: stores.page.subscribe
        },
        navigating: {
          subscribe: stores.navigating.subscribe
        },
        get preloading() {
          console.error("stores.preloading is deprecated; use stores.navigating instead");
          return {
            subscribe: stores.navigating.subscribe
          };
        },
        session: stores.session
      };
    };
    page = {
      subscribe(fn) {
        const store = getStores().page;
        return store.subscribe(fn);
      }
    };
  }
});

// .svelte-kit/output/server/chunks/__layout-3614214b.js
var layout_3614214b_exports = {};
__export(layout_3614214b_exports, {
  default: () => _layout
});
var css$1, Nav, css, _layout;
var init_layout_3614214b = __esm({
  ".svelte-kit/output/server/chunks/__layout-3614214b.js"() {
    init_shims();
    init_app_c78b47b4();
    init_stores_6c7c4832();
    css$1 = {
      code: "@import '/static/styles/_variables.css';.nav_container.svelte-86y89o.svelte-86y89o{display:flex;justify-content:center;margin:0 auto;width:100%;padding:5% 10% 0 10%;max-width:1280px}.nav_content.svelte-86y89o.svelte-86y89o{display:flex;justify-content:space-between;align-items:flex-end;margin:0 auto;width:100%;border-bottom:2px solid var(--azure_blue)}a.svelte-86y89o.svelte-86y89o{line-height:1;margin:0}a.svelte-86y89o.svelte-86y89o{font-family:var(--head);text-decoration:none;color:var(--prussian_blue);font-size:125%;font-weight:600;transition:color .2s ease-in-out}a.svelte-86y89o.svelte-86y89o:hover,a.active.svelte-86y89o.svelte-86y89o{color:var(--azure_blue)}nav.svelte-86y89o a.svelte-86y89o:nth-of-type(even){margin:0 1.8rem}@media(max-width: 767px){.nav_container.svelte-86y89o.svelte-86y89o{padding:7.5%}.nav_content.svelte-86y89o.svelte-86y89o{flex-direction:column;justify-content:flex-start;padding-top:5vmax;align-items:center}nav.svelte-86y89o.svelte-86y89o{display:flex;justify-content:center;width:100%;margin-top:2.5rem}nav.svelte-86y89o a.svelte-86y89o{font-size:135%;flex-grow:1;text-align:center;padding:1rem 0 .25rem 0}nav.svelte-86y89o a.svelte-86y89o:nth-of-type(even){margin:0}nav.svelte-86y89o a.svelte-86y89o:hover,a.active.svelte-86y89o.svelte-86y89o{background:var(--prussian_blue);color:var(--ivory)}}",
      map: null
    };
    Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $page, $$unsubscribe_page;
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      $$result.css.add(css$1);
      $$unsubscribe_page();
      return `<div class="${"nav_container svelte-86y89o"}"><div class="${"nav_content svelte-86y89o"}"><a href="${"/"}" style="${"font-size: 2.8rem"}" class="${"svelte-86y89o"}">Masaya&#39;s Thoughts
        </a>
        <nav class="${"svelte-86y89o"}"><a href="${"/"}" class="${escape(null_to_empty($page.path === "/" ? "active" : "")) + " svelte-86y89o"}">Home</a>
            <a href="${"/blog"}" class="${escape(null_to_empty($page.path === "/blog" ? "active" : "")) + " svelte-86y89o"}">Blog</a>
            <a href="${"/about"}" class="${escape(null_to_empty($page.path === "/about" ? "active" : "")) + " svelte-86y89o"}">About</a></nav></div>
</div>`;
    });
    css = {
      code: "@import '/static/styles/reset.css';@import '/static/styles/globals.css';main.svelte-nht2x4{padding:0 10%;margin:5% auto;max-width:1280px}@media(max-width: 1023px){main.svelte-nht2x4{padding:10% 10%}}@media(max-width: 767px){main.svelte-nht2x4{padding:7.5% 7.5%}}",
      map: null
    };
    _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css);
      return `${validate_component(Nav, "Nav").$$render($$result, {}, {}, {})}
<main class="${"svelte-nht2x4"}">${slots.default ? slots.default({}) : ``}
</main>`;
    });
  }
});

// .svelte-kit/output/server/chunks/error-9f1fe22b.js
var error_9f1fe22b_exports = {};
__export(error_9f1fe22b_exports, {
  default: () => Error2,
  load: () => load
});
function load({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var Error2;
var init_error_9f1fe22b = __esm({
  ".svelte-kit/output/server/chunks/error-9f1fe22b.js"() {
    init_shims();
    init_app_c78b47b4();
    Error2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { status } = $$props;
      let { error: error2 } = $$props;
      if ($$props.status === void 0 && $$bindings.status && status !== void 0)
        $$bindings.status(status);
      if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
        $$bindings.error(error2);
      return `<h1>${escape(status)}</h1>

<pre>${escape(error2.message)}</pre>



${error2.frame ? `<pre>${escape(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
    });
  }
});

// .svelte-kit/output/server/chunks/index-68306403.js
var index_68306403_exports = {};
__export(index_68306403_exports, {
  default: () => Routes
});
var css2, Hero, Routes;
var init_index_68306403 = __esm({
  ".svelte-kit/output/server/chunks/index-68306403.js"() {
    init_shims();
    init_app_c78b47b4();
    css2 = {
      code: ".hero.svelte-1i5vqa8 h1.svelte-1i5vqa8{font-size:4.5rem}@media(max-width: 767px){.hero.svelte-1i5vqa8 h1.svelte-1i5vqa8{font-size:3.6rem}}a.svelte-1i5vqa8.svelte-1i5vqa8{font-size:135%;flex-grow:1;text-align:center;padding:0.8rem 2.1rem;text-decoration:none;transition:background .2s ease-in-out}a.svelte-1i5vqa8.svelte-1i5vqa8{background:var(--prussian_blue);color:var(--ivory)}a.svelte-1i5vqa8.svelte-1i5vqa8:hover{background:var(--azure_blue)}.secondary_link.svelte-1i5vqa8.svelte-1i5vqa8,.secondary_link.svelte-1i5vqa8.svelte-1i5vqa8:hover{background:none;color:var(--prussian_blue)}",
      map: null
    };
    Hero = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css2);
      return `<div class="${"hero svelte-1i5vqa8"}"><span><h1 class="${"svelte-1i5vqa8"}">How I see the world.</h1>
        <p>This is a place for a ${escape(new Date().getFullYear() - 2002)} year old from Cambodia to share his thoughts and worldview. I write about my take on current events, history, mental health, and sharing about my personal experiences in life.
        </p></span>
    <br>
    <span><a href="${"/blog"}" class="${"svelte-1i5vqa8"}">Read</a>
        <a href="${"/about"}" class="${"secondary_link svelte-1i5vqa8"}">About me</a></span>
</div>`;
    });
    Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `${$$result.head += `${$$result.title = `<title>Masaya&#39;s Thoughts</title>`, ""}<link rel="${"stylesheet"}" href="${"/styles/reset.css"}" data-svelte="svelte-1qere6o"><link rel="${"stylesheet"}" href="${"/styles/globals.css"}" data-svelte="svelte-1qere6o"><meta property="${"og:type"}" content="${"website"}" data-svelte="svelte-1qere6o"><meta property="${"og:title"}" content="${"Masaya's Thoughts"}" data-svelte="svelte-1qere6o"><meta property="${"og:description"}" content="${"Expressing my thoughts and worldview as a Khmer-Japanese through writing."}" data-svelte="svelte-1qere6o"><meta property="${"og:image"}" content="${"/images/masaya-celestial.jpg"}" data-svelte="svelte-1qere6o"><meta property="${"twitter:card"}" content="${"summary_large_image"}" data-svelte="svelte-1qere6o"><meta property="${"twitter:title"}" content="${"Masaya's Thoughts"}" data-svelte="svelte-1qere6o"><meta property="${"twitter:description"}" content="${"Expressing my thoughts and worldview as a Khmer-Japanese through writing."}" data-svelte="svelte-1qere6o"><meta property="${"twitter:image"}" content="${"/images/masaya-celestial.jpg"}" data-svelte="svelte-1qere6o">`, ""}
${validate_component(Hero, "Hero").$$render($$result, {}, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/SvelteMarkdown-fe0485ec.js
function getDefaults$1() {
  return {
    baseUrl: null,
    breaks: false,
    extensions: null,
    gfm: true,
    headerIds: true,
    headerPrefix: "",
    highlight: null,
    langPrefix: "language-",
    mangle: true,
    pedantic: false,
    renderer: null,
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartLists: false,
    smartypants: false,
    tokenizer: null,
    walkTokens: null,
    xhtml: false
  };
}
function changeDefaults$1(newDefaults) {
  defaults$5.exports.defaults = newDefaults;
}
function escape$3(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html;
}
function unescape$1(html) {
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === "colon")
      return ":";
    if (n.charAt(0) === "#") {
      return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
    }
    return "";
  });
}
function edit$1(regex, opt) {
  regex = regex.source || regex;
  opt = opt || "";
  const obj = {
    replace: (name, val) => {
      val = val.source || val;
      val = val.replace(caret, "$1");
      regex = regex.replace(name, val);
      return obj;
    },
    getRegex: () => {
      return new RegExp(regex, opt);
    }
  };
  return obj;
}
function cleanUrl$1(sanitize, base2, href) {
  if (sanitize) {
    let prot;
    try {
      prot = decodeURIComponent(unescape$1(href)).replace(nonWordAndColonTest, "").toLowerCase();
    } catch (e) {
      return null;
    }
    if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
      return null;
    }
  }
  if (base2 && !originIndependentUrl.test(href)) {
    href = resolveUrl(base2, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch (e) {
    return null;
  }
  return href;
}
function resolveUrl(base2, href) {
  if (!baseUrls[" " + base2]) {
    if (justDomain.test(base2)) {
      baseUrls[" " + base2] = base2 + "/";
    } else {
      baseUrls[" " + base2] = rtrim$1(base2, "/", true);
    }
  }
  base2 = baseUrls[" " + base2];
  const relativeBase = base2.indexOf(":") === -1;
  if (href.substring(0, 2) === "//") {
    if (relativeBase) {
      return href;
    }
    return base2.replace(protocol, "$1") + href;
  } else if (href.charAt(0) === "/") {
    if (relativeBase) {
      return href;
    }
    return base2.replace(domain, "$1") + href;
  } else {
    return base2 + href;
  }
}
function merge$2(obj) {
  let i = 1, target, key2;
  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key2 in target) {
      if (Object.prototype.hasOwnProperty.call(target, key2)) {
        obj[key2] = target[key2];
      }
    }
  }
  return obj;
}
function splitCells$1(tableRow, count) {
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
    let escaped2 = false, curr = offset;
    while (--curr >= 0 && str[curr] === "\\")
      escaped2 = !escaped2;
    if (escaped2) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(/ \|/);
  let i = 0;
  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count)
      cells.push("");
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}
function rtrim$1(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.substr(0, l - suffLen);
}
function findClosingBracket$1(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  const l = str.length;
  let level = 0, i = 0;
  for (; i < l; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}
function checkSanitizeDeprecation$1(opt) {
  if (opt && opt.sanitize && !opt.silent) {
    console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options");
  }
}
function repeatString$1(pattern, count) {
  if (count < 1) {
    return "";
  }
  let result = "";
  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }
    count >>= 1;
    pattern += pattern;
  }
  return result + pattern;
}
function outputLink(cap, link, raw) {
  const href = link.href;
  const title = link.title ? escape$2(link.title) : null;
  const text = cap[1].replace(/\\([\[\]])/g, "$1");
  if (cap[0].charAt(0) !== "!") {
    return {
      type: "link",
      raw,
      href,
      title,
      text
    };
  } else {
    return {
      type: "image",
      raw,
      href,
      title,
      text: escape$2(text)
    };
  }
}
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(/^\s+/);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
function smartypants(text) {
  return text.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/\.{3}/g, "\u2026");
}
function mangle(text) {
  let out = "", i, ch;
  const l = text.length;
  for (i = 0; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = "x" + ch.toString(16);
    }
    out += "&#" + ch + ";";
  }
  return out;
}
function marked(src2, opt, callback) {
  if (typeof src2 === "undefined" || src2 === null) {
    throw new Error("marked(): input parameter is undefined or null");
  }
  if (typeof src2 !== "string") {
    throw new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src2) + ", string expected");
  }
  if (typeof opt === "function") {
    callback = opt;
    opt = null;
  }
  opt = merge({}, marked.defaults, opt || {});
  checkSanitizeDeprecation(opt);
  if (callback) {
    const highlight = opt.highlight;
    let tokens;
    try {
      tokens = Lexer$1.lex(src2, opt);
    } catch (e) {
      return callback(e);
    }
    const done = function(err) {
      let out;
      if (!err) {
        try {
          if (opt.walkTokens) {
            marked.walkTokens(tokens, opt.walkTokens);
          }
          out = Parser2.parse(tokens, opt);
        } catch (e) {
          err = e;
        }
      }
      opt.highlight = highlight;
      return err ? callback(err) : callback(null, out);
    };
    if (!highlight || highlight.length < 3) {
      return done();
    }
    delete opt.highlight;
    if (!tokens.length)
      return done();
    let pending = 0;
    marked.walkTokens(tokens, function(token3) {
      if (token3.type === "code") {
        pending++;
        setTimeout(() => {
          highlight(token3.text, token3.lang, function(err, code) {
            if (err) {
              return done(err);
            }
            if (code != null && code !== token3.text) {
              token3.text = code;
              token3.escaped = true;
            }
            pending--;
            if (pending === 0) {
              done();
            }
          });
        }, 0);
      }
    });
    if (pending === 0) {
      done();
    }
    return;
  }
  try {
    const tokens = Lexer$1.lex(src2, opt);
    if (opt.walkTokens) {
      marked.walkTokens(tokens, opt.walkTokens);
    }
    return Parser2.parse(tokens, opt);
  } catch (e) {
    e.message += "\nPlease report this to https://github.com/markedjs/marked.";
    if (opt.silent) {
      return "<p>An error occurred:</p><pre>" + escape2(e.message + "", true) + "</pre>";
    }
    throw e;
  }
}
var Parser$1, defaults$5, escapeTest, escapeReplace, escapeTestNoEncode, escapeReplaceNoEncode, escapeReplacements, getEscapeReplacement, unescapeTest, caret, nonWordAndColonTest, originIndependentUrl, baseUrls, justDomain, protocol, domain, noopTest$1, helpers, defaults$4, rtrim, splitCells, escape$2, findClosingBracket, Tokenizer_1, noopTest2, edit, merge$1, block$1, inline$1, rules, Tokenizer$1, defaults$3, block, inline, repeatString, Lexer_1, defaults$2, cleanUrl, escape$1, Renderer_1, TextRenderer_1, Slugger_1, Renderer$1, TextRenderer$1, Slugger$1, defaults$1, unescape2, Parser_1, Lexer$1, Parser2, Tokenizer2, Renderer2, TextRenderer2, Slugger$2, merge, checkSanitizeDeprecation, escape2, getDefaults, changeDefaults, defaults, marked_1, key, Heading, Paragraph, Text, Image, Link, Em, Del, Codespan, Strong, Table, TableHead, TableBody, TableRow, TableCell, List, ListItem, Hr, Html, Blockquote, Code, Br, defaultRenderers, defaultOptions, Lexer2, Slugger2, SvelteMarkdown;
var init_SvelteMarkdown_fe0485ec = __esm({
  ".svelte-kit/output/server/chunks/SvelteMarkdown-fe0485ec.js"() {
    init_shims();
    init_app_c78b47b4();
    Parser$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $$restProps = compute_rest_props($$props, ["type", "tokens", "ordered", "renderers"]);
      let { type = void 0 } = $$props;
      let { tokens = void 0 } = $$props;
      let { ordered = false } = $$props;
      let { renderers } = $$props;
      if ($$props.type === void 0 && $$bindings.type && type !== void 0)
        $$bindings.type(type);
      if ($$props.tokens === void 0 && $$bindings.tokens && tokens !== void 0)
        $$bindings.tokens(tokens);
      if ($$props.ordered === void 0 && $$bindings.ordered && ordered !== void 0)
        $$bindings.ordered(ordered);
      if ($$props.renderers === void 0 && $$bindings.renderers && renderers !== void 0)
        $$bindings.renderers(renderers);
      return `${!type ? `${each(tokens, (token3) => `${validate_component(Parser$1, "svelte:self").$$render($$result, Object.assign(token3, { renderers }), {}, {})}`)}` : `${renderers[type] ? `${type === "table" ? `${validate_component(renderers.table || missing_component, "svelte:component").$$render($$result, {}, {}, {
        default: () => `${validate_component(renderers.tablehead || missing_component, "svelte:component").$$render($$result, {}, {}, {
          default: () => `${validate_component(renderers.tablerow || missing_component, "svelte:component").$$render($$result, {}, {}, {
            default: () => `${each(tokens.header, (cells, i) => `${validate_component(renderers.tablecell || missing_component, "svelte:component").$$render($$result, {
              header: true,
              align: $$restProps.align[i] || "center"
            }, {}, {
              default: () => `${validate_component(Parser$1, "svelte:self").$$render($$result, { tokens: cells, renderers }, {}, {})}
              `
            })}`)}`
          })}`
        })}
        ${validate_component(renderers.tablebody || missing_component, "svelte:component").$$render($$result, {}, {}, {
          default: () => `${each(tokens.cells, (row) => `${validate_component(renderers.tablerow || missing_component, "svelte:component").$$render($$result, {}, {}, {
            default: () => `${each(row, (cells, i) => `${validate_component(renderers.tablecell || missing_component, "svelte:component").$$render($$result, {
              header: false,
              align: $$restProps.align[i] || "center"
            }, {}, {
              default: () => `${validate_component(Parser$1, "svelte:self").$$render($$result, { tokens: cells, renderers }, {}, {})}
                `
            })}`)}
            `
          })}`)}`
        })}`
      })}` : `${type === "list" ? `${ordered ? `${validate_component(renderers.list || missing_component, "svelte:component").$$render($$result, Object.assign({ ordered }, $$restProps), {}, {
        default: () => `${each($$restProps.items, (item) => `${validate_component(renderers.orderedlistitem || renderers.listitem || missing_component, "svelte:component").$$render($$result, Object.assign(item), {}, {
          default: () => `${validate_component(Parser$1, "svelte:self").$$render($$result, { tokens: item.tokens, renderers }, {}, {})}
            `
        })}`)}`
      })}` : `${validate_component(renderers.list || missing_component, "svelte:component").$$render($$result, Object.assign({ ordered }, $$restProps), {}, {
        default: () => `${each($$restProps.items, (item) => `${validate_component(renderers.unorderedlistitem || renderers.listitem || missing_component, "svelte:component").$$render($$result, Object.assign(item), {}, {
          default: () => `${validate_component(Parser$1, "svelte:self").$$render($$result, { tokens: item.tokens, renderers }, {}, {})}
            `
        })}`)}`
      })}`}` : `${validate_component(renderers[type] || missing_component, "svelte:component").$$render($$result, Object.assign($$restProps), {}, {
        default: () => `${tokens ? `${validate_component(Parser$1, "svelte:self").$$render($$result, { tokens, renderers }, {}, {})}` : `${escape($$restProps.raw)}`}`
      })}`}`}` : ``}`}`;
    });
    defaults$5 = { exports: {} };
    defaults$5.exports = {
      defaults: getDefaults$1(),
      getDefaults: getDefaults$1,
      changeDefaults: changeDefaults$1
    };
    escapeTest = /[&<>"']/;
    escapeReplace = /[&<>"']/g;
    escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
    escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
    escapeReplacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    getEscapeReplacement = (ch) => escapeReplacements[ch];
    unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
    caret = /(^|[^\[])\^/g;
    nonWordAndColonTest = /[^\w:]/g;
    originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
    baseUrls = {};
    justDomain = /^[^:]+:\/*[^/]*$/;
    protocol = /^([^:]+:)[\s\S]*$/;
    domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;
    noopTest$1 = { exec: function noopTest() {
    } };
    helpers = {
      escape: escape$3,
      unescape: unescape$1,
      edit: edit$1,
      cleanUrl: cleanUrl$1,
      resolveUrl,
      noopTest: noopTest$1,
      merge: merge$2,
      splitCells: splitCells$1,
      rtrim: rtrim$1,
      findClosingBracket: findClosingBracket$1,
      checkSanitizeDeprecation: checkSanitizeDeprecation$1,
      repeatString: repeatString$1
    };
    ({ defaults: defaults$4 } = defaults$5.exports);
    ({
      rtrim,
      splitCells,
      escape: escape$2,
      findClosingBracket
    } = helpers);
    Tokenizer_1 = class Tokenizer {
      constructor(options2) {
        this.options = options2 || defaults$4;
      }
      space(src2) {
        const cap = this.rules.block.newline.exec(src2);
        if (cap) {
          if (cap[0].length > 1) {
            return {
              type: "space",
              raw: cap[0]
            };
          }
          return { raw: "\n" };
        }
      }
      code(src2) {
        const cap = this.rules.block.code.exec(src2);
        if (cap) {
          const text = cap[0].replace(/^ {1,4}/gm, "");
          return {
            type: "code",
            raw: cap[0],
            codeBlockStyle: "indented",
            text: !this.options.pedantic ? rtrim(text, "\n") : text
          };
        }
      }
      fences(src2) {
        const cap = this.rules.block.fences.exec(src2);
        if (cap) {
          const raw = cap[0];
          const text = indentCodeCompensation(raw, cap[3] || "");
          return {
            type: "code",
            raw,
            lang: cap[2] ? cap[2].trim() : cap[2],
            text
          };
        }
      }
      heading(src2) {
        const cap = this.rules.block.heading.exec(src2);
        if (cap) {
          let text = cap[2].trim();
          if (/#$/.test(text)) {
            const trimmed = rtrim(text, "#");
            if (this.options.pedantic) {
              text = trimmed.trim();
            } else if (!trimmed || / $/.test(trimmed)) {
              text = trimmed.trim();
            }
          }
          return {
            type: "heading",
            raw: cap[0],
            depth: cap[1].length,
            text
          };
        }
      }
      nptable(src2) {
        const cap = this.rules.block.nptable.exec(src2);
        if (cap) {
          const item = {
            type: "table",
            header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
            align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
            cells: cap[3] ? cap[3].replace(/\n$/, "").split("\n") : [],
            raw: cap[0]
          };
          if (item.header.length === item.align.length) {
            let l = item.align.length;
            let i;
            for (i = 0; i < l; i++) {
              if (/^ *-+: *$/.test(item.align[i])) {
                item.align[i] = "right";
              } else if (/^ *:-+: *$/.test(item.align[i])) {
                item.align[i] = "center";
              } else if (/^ *:-+ *$/.test(item.align[i])) {
                item.align[i] = "left";
              } else {
                item.align[i] = null;
              }
            }
            l = item.cells.length;
            for (i = 0; i < l; i++) {
              item.cells[i] = splitCells(item.cells[i], item.header.length);
            }
            return item;
          }
        }
      }
      hr(src2) {
        const cap = this.rules.block.hr.exec(src2);
        if (cap) {
          return {
            type: "hr",
            raw: cap[0]
          };
        }
      }
      blockquote(src2) {
        const cap = this.rules.block.blockquote.exec(src2);
        if (cap) {
          const text = cap[0].replace(/^ *> ?/gm, "");
          return {
            type: "blockquote",
            raw: cap[0],
            text
          };
        }
      }
      list(src2) {
        const cap = this.rules.block.list.exec(src2);
        if (cap) {
          let raw = cap[0];
          const bull = cap[2];
          const isordered = bull.length > 1;
          const list = {
            type: "list",
            raw,
            ordered: isordered,
            start: isordered ? +bull.slice(0, -1) : "",
            loose: false,
            items: []
          };
          const itemMatch = cap[0].match(this.rules.block.item);
          let next = false, item, space, bcurr, bnext, addBack, loose, istask, ischecked, endMatch;
          let l = itemMatch.length;
          bcurr = this.rules.block.listItemStart.exec(itemMatch[0]);
          for (let i = 0; i < l; i++) {
            item = itemMatch[i];
            raw = item;
            if (!this.options.pedantic) {
              endMatch = item.match(new RegExp("\\n\\s*\\n {0," + (bcurr[0].length - 1) + "}\\S"));
              if (endMatch) {
                addBack = item.length - endMatch.index + itemMatch.slice(i + 1).join("\n").length;
                list.raw = list.raw.substring(0, list.raw.length - addBack);
                item = item.substring(0, endMatch.index);
                raw = item;
                l = i + 1;
              }
            }
            if (i !== l - 1) {
              bnext = this.rules.block.listItemStart.exec(itemMatch[i + 1]);
              if (!this.options.pedantic ? bnext[1].length >= bcurr[0].length || bnext[1].length > 3 : bnext[1].length > bcurr[1].length) {
                itemMatch.splice(i, 2, itemMatch[i] + (!this.options.pedantic && bnext[1].length < bcurr[0].length && !itemMatch[i].match(/\n$/) ? "" : "\n") + itemMatch[i + 1]);
                i--;
                l--;
                continue;
              } else if (!this.options.pedantic || this.options.smartLists ? bnext[2][bnext[2].length - 1] !== bull[bull.length - 1] : isordered === (bnext[2].length === 1)) {
                addBack = itemMatch.slice(i + 1).join("\n").length;
                list.raw = list.raw.substring(0, list.raw.length - addBack);
                i = l - 1;
              }
              bcurr = bnext;
            }
            space = item.length;
            item = item.replace(/^ *([*+-]|\d+[.)]) ?/, "");
            if (~item.indexOf("\n ")) {
              space -= item.length;
              item = !this.options.pedantic ? item.replace(new RegExp("^ {1," + space + "}", "gm"), "") : item.replace(/^ {1,4}/gm, "");
            }
            item = rtrim(item, "\n");
            if (i !== l - 1) {
              raw = raw + "\n";
            }
            loose = next || /\n\n(?!\s*$)/.test(raw);
            if (i !== l - 1) {
              next = raw.slice(-2) === "\n\n";
              if (!loose)
                loose = next;
            }
            if (loose) {
              list.loose = true;
            }
            if (this.options.gfm) {
              istask = /^\[[ xX]\] /.test(item);
              ischecked = void 0;
              if (istask) {
                ischecked = item[1] !== " ";
                item = item.replace(/^\[[ xX]\] +/, "");
              }
            }
            list.items.push({
              type: "list_item",
              raw,
              task: istask,
              checked: ischecked,
              loose,
              text: item
            });
          }
          return list;
        }
      }
      html(src2) {
        const cap = this.rules.block.html.exec(src2);
        if (cap) {
          return {
            type: this.options.sanitize ? "paragraph" : "html",
            raw: cap[0],
            pre: !this.options.sanitizer && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
            text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$2(cap[0]) : cap[0]
          };
        }
      }
      def(src2) {
        const cap = this.rules.block.def.exec(src2);
        if (cap) {
          if (cap[3])
            cap[3] = cap[3].substring(1, cap[3].length - 1);
          const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
          return {
            type: "def",
            tag,
            raw: cap[0],
            href: cap[2],
            title: cap[3]
          };
        }
      }
      table(src2) {
        const cap = this.rules.block.table.exec(src2);
        if (cap) {
          const item = {
            type: "table",
            header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
            align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
            cells: cap[3] ? cap[3].replace(/\n$/, "").split("\n") : []
          };
          if (item.header.length === item.align.length) {
            item.raw = cap[0];
            let l = item.align.length;
            let i;
            for (i = 0; i < l; i++) {
              if (/^ *-+: *$/.test(item.align[i])) {
                item.align[i] = "right";
              } else if (/^ *:-+: *$/.test(item.align[i])) {
                item.align[i] = "center";
              } else if (/^ *:-+ *$/.test(item.align[i])) {
                item.align[i] = "left";
              } else {
                item.align[i] = null;
              }
            }
            l = item.cells.length;
            for (i = 0; i < l; i++) {
              item.cells[i] = splitCells(item.cells[i].replace(/^ *\| *| *\| *$/g, ""), item.header.length);
            }
            return item;
          }
        }
      }
      lheading(src2) {
        const cap = this.rules.block.lheading.exec(src2);
        if (cap) {
          return {
            type: "heading",
            raw: cap[0],
            depth: cap[2].charAt(0) === "=" ? 1 : 2,
            text: cap[1]
          };
        }
      }
      paragraph(src2) {
        const cap = this.rules.block.paragraph.exec(src2);
        if (cap) {
          return {
            type: "paragraph",
            raw: cap[0],
            text: cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1]
          };
        }
      }
      text(src2) {
        const cap = this.rules.block.text.exec(src2);
        if (cap) {
          return {
            type: "text",
            raw: cap[0],
            text: cap[0]
          };
        }
      }
      escape(src2) {
        const cap = this.rules.inline.escape.exec(src2);
        if (cap) {
          return {
            type: "escape",
            raw: cap[0],
            text: escape$2(cap[1])
          };
        }
      }
      tag(src2, inLink, inRawBlock) {
        const cap = this.rules.inline.tag.exec(src2);
        if (cap) {
          if (!inLink && /^<a /i.test(cap[0])) {
            inLink = true;
          } else if (inLink && /^<\/a>/i.test(cap[0])) {
            inLink = false;
          }
          if (!inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            inRawBlock = true;
          } else if (inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            inRawBlock = false;
          }
          return {
            type: this.options.sanitize ? "text" : "html",
            raw: cap[0],
            inLink,
            inRawBlock,
            text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$2(cap[0]) : cap[0]
          };
        }
      }
      link(src2) {
        const cap = this.rules.inline.link.exec(src2);
        if (cap) {
          const trimmedUrl = cap[2].trim();
          if (!this.options.pedantic && /^</.test(trimmedUrl)) {
            if (!/>$/.test(trimmedUrl)) {
              return;
            }
            const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
            if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
              return;
            }
          } else {
            const lastParenIndex = findClosingBracket(cap[2], "()");
            if (lastParenIndex > -1) {
              const start = cap[0].indexOf("!") === 0 ? 5 : 4;
              const linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = "";
            }
          }
          let href = cap[2];
          let title = "";
          if (this.options.pedantic) {
            const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
            if (link) {
              href = link[1];
              title = link[3];
            }
          } else {
            title = cap[3] ? cap[3].slice(1, -1) : "";
          }
          href = href.trim();
          if (/^</.test(href)) {
            if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
              href = href.slice(1);
            } else {
              href = href.slice(1, -1);
            }
          }
          return outputLink(cap, {
            href: href ? href.replace(this.rules.inline._escapes, "$1") : href,
            title: title ? title.replace(this.rules.inline._escapes, "$1") : title
          }, cap[0]);
        }
      }
      reflink(src2, links) {
        let cap;
        if ((cap = this.rules.inline.reflink.exec(src2)) || (cap = this.rules.inline.nolink.exec(src2))) {
          let link = (cap[2] || cap[1]).replace(/\s+/g, " ");
          link = links[link.toLowerCase()];
          if (!link || !link.href) {
            const text = cap[0].charAt(0);
            return {
              type: "text",
              raw: text,
              text
            };
          }
          return outputLink(cap, link, cap[0]);
        }
      }
      emStrong(src2, maskedSrc, prevChar = "") {
        let match = this.rules.inline.emStrong.lDelim.exec(src2);
        if (!match)
          return;
        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
          return;
        const nextChar = match[1] || match[2] || "";
        if (!nextChar || nextChar && (prevChar === "" || this.rules.inline.punctuation.exec(prevChar))) {
          const lLength = match[0].length - 1;
          let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
          const endReg = match[0][0] === "*" ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
          endReg.lastIndex = 0;
          maskedSrc = maskedSrc.slice(-1 * src2.length + lLength);
          while ((match = endReg.exec(maskedSrc)) != null) {
            rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
            if (!rDelim)
              continue;
            rLength = rDelim.length;
            if (match[3] || match[4]) {
              delimTotal += rLength;
              continue;
            } else if (match[5] || match[6]) {
              if (lLength % 3 && !((lLength + rLength) % 3)) {
                midDelimTotal += rLength;
                continue;
              }
            }
            delimTotal -= rLength;
            if (delimTotal > 0)
              continue;
            rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
            if (Math.min(lLength, rLength) % 2) {
              return {
                type: "em",
                raw: src2.slice(0, lLength + match.index + rLength + 1),
                text: src2.slice(1, lLength + match.index + rLength)
              };
            }
            return {
              type: "strong",
              raw: src2.slice(0, lLength + match.index + rLength + 1),
              text: src2.slice(2, lLength + match.index + rLength - 1)
            };
          }
        }
      }
      codespan(src2) {
        const cap = this.rules.inline.code.exec(src2);
        if (cap) {
          let text = cap[2].replace(/\n/g, " ");
          const hasNonSpaceChars = /[^ ]/.test(text);
          const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
          if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
            text = text.substring(1, text.length - 1);
          }
          text = escape$2(text, true);
          return {
            type: "codespan",
            raw: cap[0],
            text
          };
        }
      }
      br(src2) {
        const cap = this.rules.inline.br.exec(src2);
        if (cap) {
          return {
            type: "br",
            raw: cap[0]
          };
        }
      }
      del(src2) {
        const cap = this.rules.inline.del.exec(src2);
        if (cap) {
          return {
            type: "del",
            raw: cap[0],
            text: cap[2]
          };
        }
      }
      autolink(src2, mangle2) {
        const cap = this.rules.inline.autolink.exec(src2);
        if (cap) {
          let text, href;
          if (cap[2] === "@") {
            text = escape$2(this.options.mangle ? mangle2(cap[1]) : cap[1]);
            href = "mailto:" + text;
          } else {
            text = escape$2(cap[1]);
            href = text;
          }
          return {
            type: "link",
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: "text",
                raw: text,
                text
              }
            ]
          };
        }
      }
      url(src2, mangle2) {
        let cap;
        if (cap = this.rules.inline.url.exec(src2)) {
          let text, href;
          if (cap[2] === "@") {
            text = escape$2(this.options.mangle ? mangle2(cap[0]) : cap[0]);
            href = "mailto:" + text;
          } else {
            let prevCapZero;
            do {
              prevCapZero = cap[0];
              cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
            } while (prevCapZero !== cap[0]);
            text = escape$2(cap[0]);
            if (cap[1] === "www.") {
              href = "http://" + text;
            } else {
              href = text;
            }
          }
          return {
            type: "link",
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: "text",
                raw: text,
                text
              }
            ]
          };
        }
      }
      inlineText(src2, inRawBlock, smartypants2) {
        const cap = this.rules.inline.text.exec(src2);
        if (cap) {
          let text;
          if (inRawBlock) {
            text = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$2(cap[0]) : cap[0];
          } else {
            text = escape$2(this.options.smartypants ? smartypants2(cap[0]) : cap[0]);
          }
          return {
            type: "text",
            raw: cap[0],
            text
          };
        }
      }
    };
    ({
      noopTest: noopTest2,
      edit,
      merge: merge$1
    } = helpers);
    block$1 = {
      newline: /^(?: *(?:\n|$))+/,
      code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
      hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?! {0,3}bull )\n*|\s*$)/,
      html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
      def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
      nptable: noopTest2,
      table: noopTest2,
      lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html| +\n)[^\n]+)*)/,
      text: /^[^\n]+/
    };
    block$1._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
    block$1._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block$1.def = edit(block$1.def).replace("label", block$1._label).replace("title", block$1._title).getRegex();
    block$1.bullet = /(?:[*+-]|\d{1,9}[.)])/;
    block$1.item = /^( *)(bull) ?[^\n]*(?:\n(?! *bull ?)[^\n]*)*/;
    block$1.item = edit(block$1.item, "gm").replace(/bull/g, block$1.bullet).getRegex();
    block$1.listItemStart = edit(/^( *)(bull) */).replace("bull", block$1.bullet).getRegex();
    block$1.list = edit(block$1.list).replace(/bull/g, block$1.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + block$1.def.source + ")").getRegex();
    block$1._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
    block$1._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
    block$1.html = edit(block$1.html, "i").replace("comment", block$1._comment).replace("tag", block$1._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
    block$1.paragraph = edit(block$1._paragraph).replace("hr", block$1.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block$1._tag).getRegex();
    block$1.blockquote = edit(block$1.blockquote).replace("paragraph", block$1.paragraph).getRegex();
    block$1.normal = merge$1({}, block$1);
    block$1.gfm = merge$1({}, block$1.normal, {
      nptable: "^ *([^|\\n ].*\\|.*)\\n {0,3}([-:]+ *\\|[-| :]*)(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",
      table: "^ *\\|(.+)\\n {0,3}\\|?( *[-:]+[-| :]*)(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
    });
    block$1.gfm.nptable = edit(block$1.gfm.nptable).replace("hr", block$1.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block$1._tag).getRegex();
    block$1.gfm.table = edit(block$1.gfm.table).replace("hr", block$1.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block$1._tag).getRegex();
    block$1.pedantic = merge$1({}, block$1.normal, {
      html: edit(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", block$1._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^(#{1,6})(.*)(?:\n+|$)/,
      fences: noopTest2,
      paragraph: edit(block$1.normal._paragraph).replace("hr", block$1.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", block$1.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex()
    });
    inline$1 = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest2,
      tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
      nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
      reflinkSearch: "reflink|nolink(?!\\()",
      emStrong: {
        lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
        rDelimAst: /\_\_[^_*]*?\*[^_*]*?\_\_|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
        rDelimUnd: /\*\*[^_*]*?\_[^_*]*?\*\*|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
      },
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest2,
      text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
      punctuation: /^([\spunctuation])/
    };
    inline$1._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~";
    inline$1.punctuation = edit(inline$1.punctuation).replace(/punctuation/g, inline$1._punctuation).getRegex();
    inline$1.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
    inline$1.escapedEmSt = /\\\*|\\_/g;
    inline$1._comment = edit(block$1._comment).replace("(?:-->|$)", "-->").getRegex();
    inline$1.emStrong.lDelim = edit(inline$1.emStrong.lDelim).replace(/punct/g, inline$1._punctuation).getRegex();
    inline$1.emStrong.rDelimAst = edit(inline$1.emStrong.rDelimAst, "g").replace(/punct/g, inline$1._punctuation).getRegex();
    inline$1.emStrong.rDelimUnd = edit(inline$1.emStrong.rDelimUnd, "g").replace(/punct/g, inline$1._punctuation).getRegex();
    inline$1._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
    inline$1._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline$1._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline$1.autolink = edit(inline$1.autolink).replace("scheme", inline$1._scheme).replace("email", inline$1._email).getRegex();
    inline$1._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
    inline$1.tag = edit(inline$1.tag).replace("comment", inline$1._comment).replace("attribute", inline$1._attribute).getRegex();
    inline$1._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline$1._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
    inline$1._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
    inline$1.link = edit(inline$1.link).replace("label", inline$1._label).replace("href", inline$1._href).replace("title", inline$1._title).getRegex();
    inline$1.reflink = edit(inline$1.reflink).replace("label", inline$1._label).getRegex();
    inline$1.reflinkSearch = edit(inline$1.reflinkSearch, "g").replace("reflink", inline$1.reflink).replace("nolink", inline$1.nolink).getRegex();
    inline$1.normal = merge$1({}, inline$1);
    inline$1.pedantic = merge$1({}, inline$1.normal, {
      strong: {
        start: /^__|\*\*/,
        middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        endAst: /\*\*(?!\*)/g,
        endUnd: /__(?!_)/g
      },
      em: {
        start: /^_|\*/,
        middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
        endAst: /\*(?!\*)/g,
        endUnd: /_(?!_)/g
      },
      link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", inline$1._label).getRegex(),
      reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", inline$1._label).getRegex()
    });
    inline$1.gfm = merge$1({}, inline$1.normal, {
      escape: edit(inline$1.escape).replace("])", "~|])").getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
      del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
      text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
    });
    inline$1.gfm.url = edit(inline$1.gfm.url, "i").replace("email", inline$1.gfm._extended_email).getRegex();
    inline$1.breaks = merge$1({}, inline$1.gfm, {
      br: edit(inline$1.br).replace("{2,}", "*").getRegex(),
      text: edit(inline$1.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
    });
    rules = {
      block: block$1,
      inline: inline$1
    };
    Tokenizer$1 = Tokenizer_1;
    ({ defaults: defaults$3 } = defaults$5.exports);
    ({ block, inline } = rules);
    ({ repeatString } = helpers);
    Lexer_1 = class Lexer {
      constructor(options2) {
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options2 || defaults$3;
        this.options.tokenizer = this.options.tokenizer || new Tokenizer$1();
        this.tokenizer = this.options.tokenizer;
        this.tokenizer.options = this.options;
        const rules2 = {
          block: block.normal,
          inline: inline.normal
        };
        if (this.options.pedantic) {
          rules2.block = block.pedantic;
          rules2.inline = inline.pedantic;
        } else if (this.options.gfm) {
          rules2.block = block.gfm;
          if (this.options.breaks) {
            rules2.inline = inline.breaks;
          } else {
            rules2.inline = inline.gfm;
          }
        }
        this.tokenizer.rules = rules2;
      }
      static get rules() {
        return {
          block,
          inline
        };
      }
      static lex(src2, options2) {
        const lexer = new Lexer(options2);
        return lexer.lex(src2);
      }
      static lexInline(src2, options2) {
        const lexer = new Lexer(options2);
        return lexer.inlineTokens(src2);
      }
      lex(src2) {
        src2 = src2.replace(/\r\n|\r/g, "\n").replace(/\t/g, "    ");
        this.blockTokens(src2, this.tokens, true);
        this.inline(this.tokens);
        return this.tokens;
      }
      blockTokens(src2, tokens = [], top = true) {
        if (this.options.pedantic) {
          src2 = src2.replace(/^ +$/gm, "");
        }
        let token3, i, l, lastToken, cutSrc, lastParagraphClipped;
        while (src2) {
          if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
            if (token3 = extTokenizer.call(this, src2, tokens)) {
              src2 = src2.substring(token3.raw.length);
              tokens.push(token3);
              return true;
            }
            return false;
          })) {
            continue;
          }
          if (token3 = this.tokenizer.space(src2)) {
            src2 = src2.substring(token3.raw.length);
            if (token3.type) {
              tokens.push(token3);
            }
            continue;
          }
          if (token3 = this.tokenizer.code(src2)) {
            src2 = src2.substring(token3.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === "paragraph") {
              lastToken.raw += "\n" + token3.raw;
              lastToken.text += "\n" + token3.text;
            } else {
              tokens.push(token3);
            }
            continue;
          }
          if (token3 = this.tokenizer.fences(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.heading(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.nptable(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.hr(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.blockquote(src2)) {
            src2 = src2.substring(token3.raw.length);
            token3.tokens = this.blockTokens(token3.text, [], top);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.list(src2)) {
            src2 = src2.substring(token3.raw.length);
            l = token3.items.length;
            for (i = 0; i < l; i++) {
              token3.items[i].tokens = this.blockTokens(token3.items[i].text, [], false);
            }
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.html(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (top && (token3 = this.tokenizer.def(src2))) {
            src2 = src2.substring(token3.raw.length);
            if (!this.tokens.links[token3.tag]) {
              this.tokens.links[token3.tag] = {
                href: token3.href,
                title: token3.title
              };
            }
            continue;
          }
          if (token3 = this.tokenizer.table(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.lheading(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          cutSrc = src2;
          if (this.options.extensions && this.options.extensions.startBlock) {
            let startIndex = Infinity;
            const tempSrc = src2.slice(1);
            let tempStart;
            this.options.extensions.startBlock.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call(this, tempSrc);
              if (typeof tempStart === "number" && tempStart >= 0) {
                startIndex = Math.min(startIndex, tempStart);
              }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src2.substring(0, startIndex + 1);
            }
          }
          if (top && (token3 = this.tokenizer.paragraph(cutSrc))) {
            lastToken = tokens[tokens.length - 1];
            if (lastParagraphClipped && lastToken.type === "paragraph") {
              lastToken.raw += "\n" + token3.raw;
              lastToken.text += "\n" + token3.text;
            } else {
              tokens.push(token3);
            }
            lastParagraphClipped = cutSrc.length !== src2.length;
            src2 = src2.substring(token3.raw.length);
            continue;
          }
          if (token3 = this.tokenizer.text(src2)) {
            src2 = src2.substring(token3.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === "text") {
              lastToken.raw += "\n" + token3.raw;
              lastToken.text += "\n" + token3.text;
            } else {
              tokens.push(token3);
            }
            continue;
          }
          if (src2) {
            const errMsg = "Infinite loop on byte: " + src2.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }
        return tokens;
      }
      inline(tokens) {
        let i, j, k, l2, row, token3;
        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token3 = tokens[i];
          switch (token3.type) {
            case "paragraph":
            case "text":
            case "heading": {
              token3.tokens = [];
              this.inlineTokens(token3.text, token3.tokens);
              break;
            }
            case "table": {
              token3.tokens = {
                header: [],
                cells: []
              };
              l2 = token3.header.length;
              for (j = 0; j < l2; j++) {
                token3.tokens.header[j] = [];
                this.inlineTokens(token3.header[j], token3.tokens.header[j]);
              }
              l2 = token3.cells.length;
              for (j = 0; j < l2; j++) {
                row = token3.cells[j];
                token3.tokens.cells[j] = [];
                for (k = 0; k < row.length; k++) {
                  token3.tokens.cells[j][k] = [];
                  this.inlineTokens(row[k], token3.tokens.cells[j][k]);
                }
              }
              break;
            }
            case "blockquote": {
              this.inline(token3.tokens);
              break;
            }
            case "list": {
              l2 = token3.items.length;
              for (j = 0; j < l2; j++) {
                this.inline(token3.items[j].tokens);
              }
              break;
            }
          }
        }
        return tokens;
      }
      inlineTokens(src2, tokens = [], inLink = false, inRawBlock = false) {
        let token3, lastToken, cutSrc;
        let maskedSrc = src2;
        let match;
        let keepPrevChar, prevChar;
        if (this.tokens.links) {
          const links = Object.keys(this.tokens.links);
          if (links.length > 0) {
            while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
              if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
                maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
              }
            }
          }
        }
        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        }
        while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
        }
        while (src2) {
          if (!keepPrevChar) {
            prevChar = "";
          }
          keepPrevChar = false;
          if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
            if (token3 = extTokenizer.call(this, src2, tokens)) {
              src2 = src2.substring(token3.raw.length);
              tokens.push(token3);
              return true;
            }
            return false;
          })) {
            continue;
          }
          if (token3 = this.tokenizer.escape(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.tag(src2, inLink, inRawBlock)) {
            src2 = src2.substring(token3.raw.length);
            inLink = token3.inLink;
            inRawBlock = token3.inRawBlock;
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token3.type === "text" && lastToken.type === "text") {
              lastToken.raw += token3.raw;
              lastToken.text += token3.text;
            } else {
              tokens.push(token3);
            }
            continue;
          }
          if (token3 = this.tokenizer.link(src2)) {
            src2 = src2.substring(token3.raw.length);
            if (token3.type === "link") {
              token3.tokens = this.inlineTokens(token3.text, [], true, inRawBlock);
            }
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.reflink(src2, this.tokens.links)) {
            src2 = src2.substring(token3.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (token3.type === "link") {
              token3.tokens = this.inlineTokens(token3.text, [], true, inRawBlock);
              tokens.push(token3);
            } else if (lastToken && token3.type === "text" && lastToken.type === "text") {
              lastToken.raw += token3.raw;
              lastToken.text += token3.text;
            } else {
              tokens.push(token3);
            }
            continue;
          }
          if (token3 = this.tokenizer.emStrong(src2, maskedSrc, prevChar)) {
            src2 = src2.substring(token3.raw.length);
            token3.tokens = this.inlineTokens(token3.text, [], inLink, inRawBlock);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.codespan(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.br(src2)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.del(src2)) {
            src2 = src2.substring(token3.raw.length);
            token3.tokens = this.inlineTokens(token3.text, [], inLink, inRawBlock);
            tokens.push(token3);
            continue;
          }
          if (token3 = this.tokenizer.autolink(src2, mangle)) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          if (!inLink && (token3 = this.tokenizer.url(src2, mangle))) {
            src2 = src2.substring(token3.raw.length);
            tokens.push(token3);
            continue;
          }
          cutSrc = src2;
          if (this.options.extensions && this.options.extensions.startInline) {
            let startIndex = Infinity;
            const tempSrc = src2.slice(1);
            let tempStart;
            this.options.extensions.startInline.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call(this, tempSrc);
              if (typeof tempStart === "number" && tempStart >= 0) {
                startIndex = Math.min(startIndex, tempStart);
              }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src2.substring(0, startIndex + 1);
            }
          }
          if (token3 = this.tokenizer.inlineText(cutSrc, inRawBlock, smartypants)) {
            src2 = src2.substring(token3.raw.length);
            if (token3.raw.slice(-1) !== "_") {
              prevChar = token3.raw.slice(-1);
            }
            keepPrevChar = true;
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === "text") {
              lastToken.raw += token3.raw;
              lastToken.text += token3.text;
            } else {
              tokens.push(token3);
            }
            continue;
          }
          if (src2) {
            const errMsg = "Infinite loop on byte: " + src2.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }
        return tokens;
      }
    };
    ({ defaults: defaults$2 } = defaults$5.exports);
    ({
      cleanUrl,
      escape: escape$1
    } = helpers);
    Renderer_1 = class Renderer {
      constructor(options2) {
        this.options = options2 || defaults$2;
      }
      code(code, infostring, escaped2) {
        const lang = (infostring || "").match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            escaped2 = true;
            code = out;
          }
        }
        code = code.replace(/\n$/, "") + "\n";
        if (!lang) {
          return "<pre><code>" + (escaped2 ? code : escape$1(code, true)) + "</code></pre>\n";
        }
        return '<pre><code class="' + this.options.langPrefix + escape$1(lang, true) + '">' + (escaped2 ? code : escape$1(code, true)) + "</code></pre>\n";
      }
      blockquote(quote) {
        return "<blockquote>\n" + quote + "</blockquote>\n";
      }
      html(html) {
        return html;
      }
      heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          return "<h" + level + ' id="' + this.options.headerPrefix + slugger.slug(raw) + '">' + text + "</h" + level + ">\n";
        }
        return "<h" + level + ">" + text + "</h" + level + ">\n";
      }
      hr() {
        return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
      }
      list(body, ordered, start) {
        const type = ordered ? "ol" : "ul", startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
        return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
      }
      listitem(text) {
        return "<li>" + text + "</li>\n";
      }
      checkbox(checked) {
        return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
      }
      paragraph(text) {
        return "<p>" + text + "</p>\n";
      }
      table(header, body) {
        if (body)
          body = "<tbody>" + body + "</tbody>";
        return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
      }
      tablerow(content) {
        return "<tr>\n" + content + "</tr>\n";
      }
      tablecell(content, flags) {
        const type = flags.header ? "th" : "td";
        const tag = flags.align ? "<" + type + ' align="' + flags.align + '">' : "<" + type + ">";
        return tag + content + "</" + type + ">\n";
      }
      strong(text) {
        return "<strong>" + text + "</strong>";
      }
      em(text) {
        return "<em>" + text + "</em>";
      }
      codespan(text) {
        return "<code>" + text + "</code>";
      }
      br() {
        return this.options.xhtml ? "<br/>" : "<br>";
      }
      del(text) {
        return "<del>" + text + "</del>";
      }
      link(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<a href="' + escape$1(href) + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      }
      image(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += this.options.xhtml ? "/>" : ">";
        return out;
      }
      text(text) {
        return text;
      }
    };
    TextRenderer_1 = class TextRenderer {
      strong(text) {
        return text;
      }
      em(text) {
        return text;
      }
      codespan(text) {
        return text;
      }
      del(text) {
        return text;
      }
      html(text) {
        return text;
      }
      text(text) {
        return text;
      }
      link(href, title, text) {
        return "" + text;
      }
      image(href, title, text) {
        return "" + text;
      }
      br() {
        return "";
      }
    };
    Slugger_1 = class Slugger {
      constructor() {
        this.seen = {};
      }
      serialize(value) {
        return value.toLowerCase().trim().replace(/<[!\/a-z].*?>/ig, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
      }
      getNextSafeSlug(originalSlug, isDryRun) {
        let slug = originalSlug;
        let occurenceAccumulator = 0;
        if (this.seen.hasOwnProperty(slug)) {
          occurenceAccumulator = this.seen[originalSlug];
          do {
            occurenceAccumulator++;
            slug = originalSlug + "-" + occurenceAccumulator;
          } while (this.seen.hasOwnProperty(slug));
        }
        if (!isDryRun) {
          this.seen[originalSlug] = occurenceAccumulator;
          this.seen[slug] = 0;
        }
        return slug;
      }
      slug(value, options2 = {}) {
        const slug = this.serialize(value);
        return this.getNextSafeSlug(slug, options2.dryrun);
      }
    };
    Renderer$1 = Renderer_1;
    TextRenderer$1 = TextRenderer_1;
    Slugger$1 = Slugger_1;
    ({ defaults: defaults$1 } = defaults$5.exports);
    ({
      unescape: unescape2
    } = helpers);
    Parser_1 = class Parser {
      constructor(options2) {
        this.options = options2 || defaults$1;
        this.options.renderer = this.options.renderer || new Renderer$1();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.textRenderer = new TextRenderer$1();
        this.slugger = new Slugger$1();
      }
      static parse(tokens, options2) {
        const parser = new Parser(options2);
        return parser.parse(tokens);
      }
      static parseInline(tokens, options2) {
        const parser = new Parser(options2);
        return parser.parseInline(tokens);
      }
      parse(tokens, top = true) {
        let out = "", i, j, k, l2, l3, row, cell, header, body, token3, ordered, start, loose, itemBody, item, checked, task, checkbox, ret;
        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token3 = tokens[i];
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token3.type]) {
            ret = this.options.extensions.renderers[token3.type].call(this, token3);
            if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(token3.type)) {
              out += ret || "";
              continue;
            }
          }
          switch (token3.type) {
            case "space": {
              continue;
            }
            case "hr": {
              out += this.renderer.hr();
              continue;
            }
            case "heading": {
              out += this.renderer.heading(this.parseInline(token3.tokens), token3.depth, unescape2(this.parseInline(token3.tokens, this.textRenderer)), this.slugger);
              continue;
            }
            case "code": {
              out += this.renderer.code(token3.text, token3.lang, token3.escaped);
              continue;
            }
            case "table": {
              header = "";
              cell = "";
              l2 = token3.header.length;
              for (j = 0; j < l2; j++) {
                cell += this.renderer.tablecell(this.parseInline(token3.tokens.header[j]), { header: true, align: token3.align[j] });
              }
              header += this.renderer.tablerow(cell);
              body = "";
              l2 = token3.cells.length;
              for (j = 0; j < l2; j++) {
                row = token3.tokens.cells[j];
                cell = "";
                l3 = row.length;
                for (k = 0; k < l3; k++) {
                  cell += this.renderer.tablecell(this.parseInline(row[k]), { header: false, align: token3.align[k] });
                }
                body += this.renderer.tablerow(cell);
              }
              out += this.renderer.table(header, body);
              continue;
            }
            case "blockquote": {
              body = this.parse(token3.tokens);
              out += this.renderer.blockquote(body);
              continue;
            }
            case "list": {
              ordered = token3.ordered;
              start = token3.start;
              loose = token3.loose;
              l2 = token3.items.length;
              body = "";
              for (j = 0; j < l2; j++) {
                item = token3.items[j];
                checked = item.checked;
                task = item.task;
                itemBody = "";
                if (item.task) {
                  checkbox = this.renderer.checkbox(checked);
                  if (loose) {
                    if (item.tokens.length > 0 && item.tokens[0].type === "text") {
                      item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                      if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                        item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                      }
                    } else {
                      item.tokens.unshift({
                        type: "text",
                        text: checkbox
                      });
                    }
                  } else {
                    itemBody += checkbox;
                  }
                }
                itemBody += this.parse(item.tokens, loose);
                body += this.renderer.listitem(itemBody, task, checked);
              }
              out += this.renderer.list(body, ordered, start);
              continue;
            }
            case "html": {
              out += this.renderer.html(token3.text);
              continue;
            }
            case "paragraph": {
              out += this.renderer.paragraph(this.parseInline(token3.tokens));
              continue;
            }
            case "text": {
              body = token3.tokens ? this.parseInline(token3.tokens) : token3.text;
              while (i + 1 < l && tokens[i + 1].type === "text") {
                token3 = tokens[++i];
                body += "\n" + (token3.tokens ? this.parseInline(token3.tokens) : token3.text);
              }
              out += top ? this.renderer.paragraph(body) : body;
              continue;
            }
            default: {
              const errMsg = 'Token with "' + token3.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      }
      parseInline(tokens, renderer) {
        renderer = renderer || this.renderer;
        let out = "", i, token3, ret;
        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token3 = tokens[i];
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token3.type]) {
            ret = this.options.extensions.renderers[token3.type].call(this, token3);
            if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(token3.type)) {
              out += ret || "";
              continue;
            }
          }
          switch (token3.type) {
            case "escape": {
              out += renderer.text(token3.text);
              break;
            }
            case "html": {
              out += renderer.html(token3.text);
              break;
            }
            case "link": {
              out += renderer.link(token3.href, token3.title, this.parseInline(token3.tokens, renderer));
              break;
            }
            case "image": {
              out += renderer.image(token3.href, token3.title, token3.text);
              break;
            }
            case "strong": {
              out += renderer.strong(this.parseInline(token3.tokens, renderer));
              break;
            }
            case "em": {
              out += renderer.em(this.parseInline(token3.tokens, renderer));
              break;
            }
            case "codespan": {
              out += renderer.codespan(token3.text);
              break;
            }
            case "br": {
              out += renderer.br();
              break;
            }
            case "del": {
              out += renderer.del(this.parseInline(token3.tokens, renderer));
              break;
            }
            case "text": {
              out += renderer.text(token3.text);
              break;
            }
            default: {
              const errMsg = 'Token with "' + token3.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      }
    };
    Lexer$1 = Lexer_1;
    Parser2 = Parser_1;
    Tokenizer2 = Tokenizer_1;
    Renderer2 = Renderer_1;
    TextRenderer2 = TextRenderer_1;
    Slugger$2 = Slugger_1;
    ({
      merge,
      checkSanitizeDeprecation,
      escape: escape2
    } = helpers);
    ({
      getDefaults,
      changeDefaults,
      defaults
    } = defaults$5.exports);
    marked.options = marked.setOptions = function(opt) {
      merge(marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };
    marked.getDefaults = getDefaults;
    marked.defaults = defaults;
    marked.use = function(...args) {
      const opts = merge({}, ...args);
      const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
      let hasExtensions;
      args.forEach((pack) => {
        if (pack.extensions) {
          hasExtensions = true;
          pack.extensions.forEach((ext) => {
            if (!ext.name) {
              throw new Error("extension name required");
            }
            if (ext.renderer) {
              const prevRenderer = extensions.renderers ? extensions.renderers[ext.name] : null;
              if (prevRenderer) {
                extensions.renderers[ext.name] = function(...args2) {
                  let ret = ext.renderer.apply(this, args2);
                  if (ret === false) {
                    ret = prevRenderer.apply(this, args2);
                  }
                  return ret;
                };
              } else {
                extensions.renderers[ext.name] = ext.renderer;
              }
            }
            if (ext.tokenizer) {
              if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
                throw new Error("extension level must be 'block' or 'inline'");
              }
              if (extensions[ext.level]) {
                extensions[ext.level].unshift(ext.tokenizer);
              } else {
                extensions[ext.level] = [ext.tokenizer];
              }
              if (ext.start) {
                if (ext.level === "block") {
                  if (extensions.startBlock) {
                    extensions.startBlock.push(ext.start);
                  } else {
                    extensions.startBlock = [ext.start];
                  }
                } else if (ext.level === "inline") {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
            if (ext.childTokens) {
              extensions.childTokens[ext.name] = ext.childTokens;
            }
          });
        }
        if (pack.renderer) {
          const renderer = marked.defaults.renderer || new Renderer2();
          for (const prop in pack.renderer) {
            const prevRenderer = renderer[prop];
            renderer[prop] = (...args2) => {
              let ret = pack.renderer[prop].apply(renderer, args2);
              if (ret === false) {
                ret = prevRenderer.apply(renderer, args2);
              }
              return ret;
            };
          }
          opts.renderer = renderer;
        }
        if (pack.tokenizer) {
          const tokenizer = marked.defaults.tokenizer || new Tokenizer2();
          for (const prop in pack.tokenizer) {
            const prevTokenizer = tokenizer[prop];
            tokenizer[prop] = (...args2) => {
              let ret = pack.tokenizer[prop].apply(tokenizer, args2);
              if (ret === false) {
                ret = prevTokenizer.apply(tokenizer, args2);
              }
              return ret;
            };
          }
          opts.tokenizer = tokenizer;
        }
        if (pack.walkTokens) {
          const walkTokens = marked.defaults.walkTokens;
          opts.walkTokens = (token3) => {
            pack.walkTokens.call(this, token3);
            if (walkTokens) {
              walkTokens(token3);
            }
          };
        }
        if (hasExtensions) {
          opts.extensions = extensions;
        }
        marked.setOptions(opts);
      });
    };
    marked.walkTokens = function(tokens, callback) {
      for (const token3 of tokens) {
        callback(token3);
        switch (token3.type) {
          case "table": {
            for (const cell of token3.tokens.header) {
              marked.walkTokens(cell, callback);
            }
            for (const row of token3.tokens.cells) {
              for (const cell of row) {
                marked.walkTokens(cell, callback);
              }
            }
            break;
          }
          case "list": {
            marked.walkTokens(token3.items, callback);
            break;
          }
          default: {
            if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token3.type]) {
              marked.defaults.extensions.childTokens[token3.type].forEach(function(childTokens) {
                marked.walkTokens(token3[childTokens], callback);
              });
            } else if (token3.tokens) {
              marked.walkTokens(token3.tokens, callback);
            }
          }
        }
      }
    };
    marked.parseInline = function(src2, opt) {
      if (typeof src2 === "undefined" || src2 === null) {
        throw new Error("marked.parseInline(): input parameter is undefined or null");
      }
      if (typeof src2 !== "string") {
        throw new Error("marked.parseInline(): input parameter is of type " + Object.prototype.toString.call(src2) + ", string expected");
      }
      opt = merge({}, marked.defaults, opt || {});
      checkSanitizeDeprecation(opt);
      try {
        const tokens = Lexer$1.lexInline(src2, opt);
        if (opt.walkTokens) {
          marked.walkTokens(tokens, opt.walkTokens);
        }
        return Parser2.parseInline(tokens, opt);
      } catch (e) {
        e.message += "\nPlease report this to https://github.com/markedjs/marked.";
        if (opt.silent) {
          return "<p>An error occurred:</p><pre>" + escape2(e.message + "", true) + "</pre>";
        }
        throw e;
      }
    };
    marked.Parser = Parser2;
    marked.parser = Parser2.parse;
    marked.Renderer = Renderer2;
    marked.TextRenderer = TextRenderer2;
    marked.Lexer = Lexer$1;
    marked.lexer = Lexer$1.lex;
    marked.Tokenizer = Tokenizer2;
    marked.Slugger = Slugger$2;
    marked.parse = marked;
    marked_1 = marked;
    key = {};
    Heading = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let id;
      let { depth } = $$props;
      let { raw } = $$props;
      let { text } = $$props;
      const { slug, getOptions } = getContext(key);
      const options2 = getOptions();
      if ($$props.depth === void 0 && $$bindings.depth && depth !== void 0)
        $$bindings.depth(depth);
      if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
        $$bindings.raw(raw);
      if ($$props.text === void 0 && $$bindings.text && text !== void 0)
        $$bindings.text(text);
      id = options2.headerIds ? options2.headerPrefix + slug(text) : void 0;
      return `${depth === 1 ? `<h1${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h1>` : `${depth === 2 ? `<h2${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h2>` : `${depth === 3 ? `<h3${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h3>` : `${depth === 4 ? `<h4${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h4>` : `${depth === 5 ? `<h5${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h5>` : `${depth === 6 ? `<h6${add_attribute("id", id, 0)}>${slots.default ? slots.default({}) : ``}</h6>` : `${escape(raw)}`}`}`}`}`}`}`;
    });
    Paragraph = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<p>${slots.default ? slots.default({}) : ``}</p>`;
    });
    Text = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { text } = $$props;
      let { raw } = $$props;
      if ($$props.text === void 0 && $$bindings.text && text !== void 0)
        $$bindings.text(text);
      if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
        $$bindings.raw(raw);
      return `${slots.default ? slots.default({}) : ``}`;
    });
    Image = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { href = "" } = $$props;
      let { title = void 0 } = $$props;
      let { text = "" } = $$props;
      if ($$props.href === void 0 && $$bindings.href && href !== void 0)
        $$bindings.href(href);
      if ($$props.title === void 0 && $$bindings.title && title !== void 0)
        $$bindings.title(title);
      if ($$props.text === void 0 && $$bindings.text && text !== void 0)
        $$bindings.text(text);
      return `<img${add_attribute("src", href, 0)}${add_attribute("title", title, 0)}${add_attribute("alt", text, 0)}>`;
    });
    Link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { href = "" } = $$props;
      let { title = void 0 } = $$props;
      if ($$props.href === void 0 && $$bindings.href && href !== void 0)
        $$bindings.href(href);
      if ($$props.title === void 0 && $$bindings.title && title !== void 0)
        $$bindings.title(title);
      return `<a${add_attribute("href", href, 0)}${add_attribute("title", title, 0)}>${slots.default ? slots.default({}) : ``}</a>`;
    });
    Em = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<em>${slots.default ? slots.default({}) : ``}</em>`;
    });
    Del = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<del>${slots.default ? slots.default({}) : ``}</del>`;
    });
    Codespan = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { raw } = $$props;
      if ($$props.raw === void 0 && $$bindings.raw && raw !== void 0)
        $$bindings.raw(raw);
      return `<code>${escape(raw.replace(/`/g, ""))}</code>`;
    });
    Strong = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<strong>${slots.default ? slots.default({}) : ``}</strong>`;
    });
    Table = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<table>${slots.default ? slots.default({}) : ``}</table>`;
    });
    TableHead = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<thead>${slots.default ? slots.default({}) : ``}</thead>`;
    });
    TableBody = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<tbody>${slots.default ? slots.default({}) : ``}</tbody>`;
    });
    TableRow = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<tr>${slots.default ? slots.default({}) : ``}</tr>`;
    });
    TableCell = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { header } = $$props;
      let { align } = $$props;
      if ($$props.header === void 0 && $$bindings.header && header !== void 0)
        $$bindings.header(header);
      if ($$props.align === void 0 && $$bindings.align && align !== void 0)
        $$bindings.align(align);
      return `${header ? `<th${add_attribute("align", align, 0)}>${slots.default ? slots.default({}) : ``}</th>` : `<td${add_attribute("align", align, 0)}>${slots.default ? slots.default({}) : ``}</td>`}`;
    });
    List = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { ordered } = $$props;
      let { start } = $$props;
      if ($$props.ordered === void 0 && $$bindings.ordered && ordered !== void 0)
        $$bindings.ordered(ordered);
      if ($$props.start === void 0 && $$bindings.start && start !== void 0)
        $$bindings.start(start);
      return `${ordered ? `<ol${add_attribute("start", start, 0)}>${slots.default ? slots.default({}) : ``}</ol>` : `<ul>${slots.default ? slots.default({}) : ``}</ul>`}`;
    });
    ListItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<li>${slots.default ? slots.default({}) : ``}</li>`;
    });
    Hr = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<hr>`;
    });
    Html = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { text } = $$props;
      if ($$props.text === void 0 && $$bindings.text && text !== void 0)
        $$bindings.text(text);
      return `<!-- HTML_TAG_START -->${text}<!-- HTML_TAG_END -->`;
    });
    Blockquote = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<blockquote>${slots.default ? slots.default({}) : ``}</blockquote>`;
    });
    Code = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { lang } = $$props;
      let { text } = $$props;
      if ($$props.lang === void 0 && $$bindings.lang && lang !== void 0)
        $$bindings.lang(lang);
      if ($$props.text === void 0 && $$bindings.text && text !== void 0)
        $$bindings.text(text);
      return `<pre${add_attribute("class", lang, 0)}><code>${escape(text)}</code></pre>`;
    });
    Br = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      return `<br>${slots.default ? slots.default({}) : ``}`;
    });
    defaultRenderers = {
      heading: Heading,
      paragraph: Paragraph,
      text: Text,
      image: Image,
      link: Link,
      em: Em,
      strong: Strong,
      codespan: Codespan,
      del: Del,
      table: Table,
      tablehead: TableHead,
      tablebody: TableBody,
      tablerow: TableRow,
      tablecell: TableCell,
      list: List,
      orderedlistitem: null,
      unorderedlistitem: null,
      listitem: ListItem,
      hr: Hr,
      html: Html,
      blockquote: Blockquote,
      code: Code,
      br: Br
    };
    defaultOptions = {
      baseUrl: null,
      breaks: false,
      gfm: true,
      headerIds: true,
      headerPrefix: "",
      highlight: null,
      langPrefix: "language-",
      mangle: true,
      pedantic: false,
      renderer: null,
      sanitize: false,
      sanitizer: null,
      silent: false,
      smartLists: false,
      smartypants: false,
      tokenizer: null,
      xhtml: false
    };
    Lexer2 = marked_1.Lexer;
    Slugger2 = marked_1.Slugger;
    SvelteMarkdown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let slugger;
      let combinedOptions;
      let combinedRenderers;
      let { source = "" } = $$props;
      let { renderers = {} } = $$props;
      let { options: options2 = {} } = $$props;
      let { isInline = false } = $$props;
      const dispatch = createEventDispatcher();
      let tokens;
      let lexer;
      setContext(key, {
        slug: (val) => slugger ? slugger.slug(val) : "",
        getOptions: () => combinedOptions
      });
      if ($$props.source === void 0 && $$bindings.source && source !== void 0)
        $$bindings.source(source);
      if ($$props.renderers === void 0 && $$bindings.renderers && renderers !== void 0)
        $$bindings.renderers(renderers);
      if ($$props.options === void 0 && $$bindings.options && options2 !== void 0)
        $$bindings.options(options2);
      if ($$props.isInline === void 0 && $$bindings.isInline && isInline !== void 0)
        $$bindings.isInline(isInline);
      slugger = source ? new Slugger2() : void 0;
      combinedOptions = { ...defaultOptions, ...options2 };
      {
        {
          lexer = new Lexer2(combinedOptions);
          tokens = isInline ? lexer.inlineTokens(source) : lexer.lex(source);
          dispatch("parsed", { tokens });
        }
      }
      combinedRenderers = { ...defaultRenderers, ...renderers };
      return `${validate_component(Parser$1, "Parser").$$render($$result, { tokens, renderers: combinedRenderers }, {}, {})}`;
    });
  }
});

// .svelte-kit/output/server/chunks/about-356741bd.js
var about_356741bd_exports = {};
__export(about_356741bd_exports, {
  default: () => About
});
var css3, About;
var init_about_356741bd = __esm({
  ".svelte-kit/output/server/chunks/about-356741bd.js"() {
    init_shims();
    init_app_c78b47b4();
    init_SvelteMarkdown_fe0485ec();
    css3 = {
      code: "section.svelte-n1qo3c.svelte-n1qo3c{display:flex;justify-content:space-between;align-items:center}section.svelte-n1qo3c span.svelte-n1qo3c{max-width:50%}img.svelte-n1qo3c.svelte-n1qo3c{object-fit:cover}.vert_img.svelte-n1qo3c.svelte-n1qo3c{max-width:35%;max-height:40rem}@media(max-width: 1023px){.vert_img.svelte-n1qo3c.svelte-n1qo3c{max-width:35%}}@media(max-width: 767px){section.svelte-n1qo3c.svelte-n1qo3c{flex-direction:column;align-items:flex-start}section.svelte-n1qo3c span.svelte-n1qo3c{max-width:100%}.vert_img.svelte-n1qo3c.svelte-n1qo3c{max-width:80%}}",
      map: null
    };
    About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      const aboutMd = `
## How my worldview developed.

I was 17 years old and was visiting Bangkok with my sisters. We went to a bookstore, and I picked up a book called "12 Rules for Life." This book in particular caught my attention because I had learnt a few things about about the book's author, <a href="https://www.jordanbpeterson.com/about/">Dr. Jordan Peterson</a>. I had learnt about Dr. Peterson from his interview with English news channel, Channel 4 News, in the <a href="https://youtu.be/aMcjxSThD54">video</a> titled "Jordan Peterson debate on the gender pay gap, campus protests and postmodernism," and thought that it would be an interesting read since my fresh young mind was becoming increasingly interested in what the psychology professor had to say.

I knew little about the West, its culture, its emphasis on individuality, and how in the modern age they had become a role model for other societies to follow\u2014even after taking into considering their shortcomings. Reading the book and listening to Dr. Peterson's <a href="https://youtube.com/playlist?list=PL22J3VaeABQD_IZs7y60I3lUrrFTzkpat">Psychological Significance of the Biblical Stories</a> allowed me to have a better understanding of the West, a more concrete understanding of human psychology, motivation, and personality\u2014at least as best an understanding my English comprehension could allow me to.
`;
      $$result.css.add(css3);
      return `${$$result.head += `${$$result.title = `<title>About | Masaya&#39;s Thoughts</title>`, ""}<meta name="${"description"}" content="${"About Masaya"}" data-svelte="svelte-fgyaxa">`, ""}
<h1>About</h1>
<section class="${"svelte-n1qo3c"}"><span class="${"svelte-n1qo3c"}">${validate_component(SvelteMarkdown, "SvelteMarkdown").$$render($$result, { source: aboutMd }, {}, {})}</span>
    <img class="${"vert_img svelte-n1qo3c"}" src="${"./images/12-rules-first-bought.webp"}" alt="${"First time getting 12 Rules For Life"}">
</section>`;
    });
  }
});

// node_modules/dayjs/dayjs.min.js
var require_dayjs_min = __commonJS({
  "node_modules/dayjs/dayjs.min.js"(exports, module2) {
    init_shims();
    !function(t, e) {
      typeof exports == "object" && typeof module2 != "undefined" ? module2.exports = e() : typeof define == "function" && define.amd ? define(e) : (t = typeof globalThis != "undefined" ? globalThis : t || self).dayjs = e();
    }(exports, function() {
      "use strict";
      var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s2 = "minute", u = "hour", a = "day", o = "week", f = "month", h = "quarter", c = "year", d2 = "date", $ = "Invalid Date", l = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_") }, m = function(t2, e2, n2) {
        var r2 = String(t2);
        return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
      }, g = { s: m, z: function(t2) {
        var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
        return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
      }, m: function t2(e2, n2) {
        if (e2.date() < n2.date())
          return -t2(n2, e2);
        var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, f), s3 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s3 ? -1 : 1), f);
        return +(-(r2 + (n2 - i2) / (s3 ? i2 - u2 : u2 - i2)) || 0);
      }, a: function(t2) {
        return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
      }, p: function(t2) {
        return { M: f, y: c, w: o, d: a, D: d2, h: u, m: s2, s: i, ms: r, Q: h }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
      }, u: function(t2) {
        return t2 === void 0;
      } }, D = "en", v = {};
      v[D] = M;
      var p = function(t2) {
        return t2 instanceof _;
      }, S = function(t2, e2, n2) {
        var r2;
        if (!t2)
          return D;
        if (typeof t2 == "string")
          v[t2] && (r2 = t2), e2 && (v[t2] = e2, r2 = t2);
        else {
          var i2 = t2.name;
          v[i2] = t2, r2 = i2;
        }
        return !n2 && r2 && (D = r2), r2 || !n2 && D;
      }, w = function(t2, e2) {
        if (p(t2))
          return t2.clone();
        var n2 = typeof e2 == "object" ? e2 : {};
        return n2.date = t2, n2.args = arguments, new _(n2);
      }, O = g;
      O.l = S, O.i = p, O.w = function(t2, e2) {
        return w(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
      };
      var _ = function() {
        function M2(t2) {
          this.$L = S(t2.locale, null, true), this.parse(t2);
        }
        var m2 = M2.prototype;
        return m2.parse = function(t2) {
          this.$d = function(t3) {
            var e2 = t3.date, n2 = t3.utc;
            if (e2 === null)
              return new Date(NaN);
            if (O.u(e2))
              return new Date();
            if (e2 instanceof Date)
              return new Date(e2);
            if (typeof e2 == "string" && !/Z$/i.test(e2)) {
              var r2 = e2.match(l);
              if (r2) {
                var i2 = r2[2] - 1 || 0, s3 = (r2[7] || "0").substring(0, 3);
                return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s3)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s3);
              }
            }
            return new Date(e2);
          }(t2), this.$x = t2.x || {}, this.init();
        }, m2.init = function() {
          var t2 = this.$d;
          this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
        }, m2.$utils = function() {
          return O;
        }, m2.isValid = function() {
          return !(this.$d.toString() === $);
        }, m2.isSame = function(t2, e2) {
          var n2 = w(t2);
          return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
        }, m2.isAfter = function(t2, e2) {
          return w(t2) < this.startOf(e2);
        }, m2.isBefore = function(t2, e2) {
          return this.endOf(e2) < w(t2);
        }, m2.$g = function(t2, e2, n2) {
          return O.u(t2) ? this[e2] : this.set(n2, t2);
        }, m2.unix = function() {
          return Math.floor(this.valueOf() / 1e3);
        }, m2.valueOf = function() {
          return this.$d.getTime();
        }, m2.startOf = function(t2, e2) {
          var n2 = this, r2 = !!O.u(e2) || e2, h2 = O.p(t2), $2 = function(t3, e3) {
            var i2 = O.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
            return r2 ? i2 : i2.endOf(a);
          }, l2 = function(t3, e3) {
            return O.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
          }, y2 = this.$W, M3 = this.$M, m3 = this.$D, g2 = "set" + (this.$u ? "UTC" : "");
          switch (h2) {
            case c:
              return r2 ? $2(1, 0) : $2(31, 11);
            case f:
              return r2 ? $2(1, M3) : $2(0, M3 + 1);
            case o:
              var D2 = this.$locale().weekStart || 0, v2 = (y2 < D2 ? y2 + 7 : y2) - D2;
              return $2(r2 ? m3 - v2 : m3 + (6 - v2), M3);
            case a:
            case d2:
              return l2(g2 + "Hours", 0);
            case u:
              return l2(g2 + "Minutes", 1);
            case s2:
              return l2(g2 + "Seconds", 2);
            case i:
              return l2(g2 + "Milliseconds", 3);
            default:
              return this.clone();
          }
        }, m2.endOf = function(t2) {
          return this.startOf(t2, false);
        }, m2.$set = function(t2, e2) {
          var n2, o2 = O.p(t2), h2 = "set" + (this.$u ? "UTC" : ""), $2 = (n2 = {}, n2[a] = h2 + "Date", n2[d2] = h2 + "Date", n2[f] = h2 + "Month", n2[c] = h2 + "FullYear", n2[u] = h2 + "Hours", n2[s2] = h2 + "Minutes", n2[i] = h2 + "Seconds", n2[r] = h2 + "Milliseconds", n2)[o2], l2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
          if (o2 === f || o2 === c) {
            var y2 = this.clone().set(d2, 1);
            y2.$d[$2](l2), y2.init(), this.$d = y2.set(d2, Math.min(this.$D, y2.daysInMonth())).$d;
          } else
            $2 && this.$d[$2](l2);
          return this.init(), this;
        }, m2.set = function(t2, e2) {
          return this.clone().$set(t2, e2);
        }, m2.get = function(t2) {
          return this[O.p(t2)]();
        }, m2.add = function(r2, h2) {
          var d3, $2 = this;
          r2 = Number(r2);
          var l2 = O.p(h2), y2 = function(t2) {
            var e2 = w($2);
            return O.w(e2.date(e2.date() + Math.round(t2 * r2)), $2);
          };
          if (l2 === f)
            return this.set(f, this.$M + r2);
          if (l2 === c)
            return this.set(c, this.$y + r2);
          if (l2 === a)
            return y2(1);
          if (l2 === o)
            return y2(7);
          var M3 = (d3 = {}, d3[s2] = e, d3[u] = n, d3[i] = t, d3)[l2] || 1, m3 = this.$d.getTime() + r2 * M3;
          return O.w(m3, this);
        }, m2.subtract = function(t2, e2) {
          return this.add(-1 * t2, e2);
        }, m2.format = function(t2) {
          var e2 = this, n2 = this.$locale();
          if (!this.isValid())
            return n2.invalidDate || $;
          var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = O.z(this), s3 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, f2 = n2.months, h2 = function(t3, n3, i3, s4) {
            return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].substr(0, s4);
          }, c2 = function(t3) {
            return O.s(s3 % 12 || 12, t3, "0");
          }, d3 = n2.meridiem || function(t3, e3, n3) {
            var r3 = t3 < 12 ? "AM" : "PM";
            return n3 ? r3.toLowerCase() : r3;
          }, l2 = { YY: String(this.$y).slice(-2), YYYY: this.$y, M: a2 + 1, MM: O.s(a2 + 1, 2, "0"), MMM: h2(n2.monthsShort, a2, f2, 3), MMMM: h2(f2, a2), D: this.$D, DD: O.s(this.$D, 2, "0"), d: String(this.$W), dd: h2(n2.weekdaysMin, this.$W, o2, 2), ddd: h2(n2.weekdaysShort, this.$W, o2, 3), dddd: o2[this.$W], H: String(s3), HH: O.s(s3, 2, "0"), h: c2(1), hh: c2(2), a: d3(s3, u2, true), A: d3(s3, u2, false), m: String(u2), mm: O.s(u2, 2, "0"), s: String(this.$s), ss: O.s(this.$s, 2, "0"), SSS: O.s(this.$ms, 3, "0"), Z: i2 };
          return r2.replace(y, function(t3, e3) {
            return e3 || l2[t3] || i2.replace(":", "");
          });
        }, m2.utcOffset = function() {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
        }, m2.diff = function(r2, d3, $2) {
          var l2, y2 = O.p(d3), M3 = w(r2), m3 = (M3.utcOffset() - this.utcOffset()) * e, g2 = this - M3, D2 = O.m(this, M3);
          return D2 = (l2 = {}, l2[c] = D2 / 12, l2[f] = D2, l2[h] = D2 / 3, l2[o] = (g2 - m3) / 6048e5, l2[a] = (g2 - m3) / 864e5, l2[u] = g2 / n, l2[s2] = g2 / e, l2[i] = g2 / t, l2)[y2] || g2, $2 ? D2 : O.a(D2);
        }, m2.daysInMonth = function() {
          return this.endOf(f).$D;
        }, m2.$locale = function() {
          return v[this.$L];
        }, m2.locale = function(t2, e2) {
          if (!t2)
            return this.$L;
          var n2 = this.clone(), r2 = S(t2, e2, true);
          return r2 && (n2.$L = r2), n2;
        }, m2.clone = function() {
          return O.w(this.$d, this);
        }, m2.toDate = function() {
          return new Date(this.valueOf());
        }, m2.toJSON = function() {
          return this.isValid() ? this.toISOString() : null;
        }, m2.toISOString = function() {
          return this.$d.toISOString();
        }, m2.toString = function() {
          return this.$d.toUTCString();
        }, M2;
      }(), b = _.prototype;
      return w.prototype = b, [["$ms", r], ["$s", i], ["$m", s2], ["$H", u], ["$W", a], ["$M", f], ["$y", c], ["$D", d2]].forEach(function(t2) {
        b[t2[1]] = function(e2) {
          return this.$g(e2, t2[0], t2[1]);
        };
      }), w.extend = function(t2, e2) {
        return t2.$i || (t2(e2, _, w), t2.$i = true), w;
      }, w.locale = S, w.isDayjs = p, w.unix = function(t2) {
        return w(1e3 * t2);
      }, w.en = v[D], w.Ls = v, w.p = {}, w;
    });
  }
});

// .svelte-kit/output/server/chunks/_slug_-087c7262.js
var slug_087c7262_exports = {};
__export(slug_087c7262_exports, {
  default: () => U5Bslugu5D
});
var import_dayjs, Seo, css4, token, U5Bslugu5D;
var init_slug_087c7262 = __esm({
  ".svelte-kit/output/server/chunks/_slug_-087c7262.js"() {
    init_shims();
    init_app_c78b47b4();
    init_SvelteMarkdown_fe0485ec();
    init_stores_6c7c4832();
    import_dayjs = __toModule(require_dayjs_min());
    Seo = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { title } = $$props;
      let { dateWritten } = $$props;
      let { thumbnail } = $$props;
      if ($$props.title === void 0 && $$bindings.title && title !== void 0)
        $$bindings.title(title);
      if ($$props.dateWritten === void 0 && $$bindings.dateWritten && dateWritten !== void 0)
        $$bindings.dateWritten(dateWritten);
      if ($$props.thumbnail === void 0 && $$bindings.thumbnail && thumbnail !== void 0)
        $$bindings.thumbnail(thumbnail);
      return `${$$result.head += `${title ? `${$$result.title = `<title>${escape(title)} | Masaya&#39;s Thoughts</title>`, ""}` : `${$$result.title = `<title>Masaya&#39;s Thoughts</title>`, ""}`}<meta name="${"author"}" content="${"Masaya Shida"}" data-svelte="svelte-8wmwb6"><meta name="${"description"}" content="${"Blog article written by Masaya Shida."}" data-svelte="svelte-8wmwb6"><meta property="${"og:type"}" content="${"website"}" data-svelte="svelte-8wmwb6"><meta property="${"og:title"}"${add_attribute("content", title, 0)} data-svelte="svelte-8wmwb6"><meta property="${"og:description"}"${add_attribute("content", `Written ${dateWritten}`, 0)} data-svelte="svelte-8wmwb6"><meta property="${"og:image"}"${add_attribute("content", thumbnail, 0)} data-svelte="svelte-8wmwb6">`, ""}`;
    });
    css4 = {
      code: "@import '/static/styles/_variables.css';.backBtn.svelte-1ibza4r.svelte-1ibza4r{display:block;width:100%;max-width:100%;font-family:var(--head);text-decoration:none;color:var(--prussian_blue);font-size:125%;font-weight:600;transition:color .2s ease-in-out\r\n    }.backBtn.svelte-1ibza4r.svelte-1ibza4r:hover{color:var(--azure_blue)}img.svelte-1ibza4r.svelte-1ibza4r{display:flex;width:65%;max-width:65%;height:25vmax;object-fit:cover}.bgHero.svelte-1ibza4r.svelte-1ibza4r{display:flex;position:absolute;width:100%;left:0;z-index:-10}.bgHero.svelte-1ibza4r img.svelte-1ibza4r{filter:opacity(25%) sepia(50%);width:100%;max-width:100%;object-fit:cover;box-shadow:none;margin-bottom:4rem}@media(max-width: 767px){img.svelte-1ibza4r.svelte-1ibza4r{width:100%;max-width:100%}.bgHero.svelte-1ibza4r.svelte-1ibza4r{display:none}}",
      map: null
    };
    token = "fe98495b378ae369d79dea240fba61";
    U5Bslugu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $page, $$unsubscribe_page;
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      let articles;
      function setArticles(value) {
        articles = value;
      }
      let articlesSlugs = [];
      function setArticlesSlugs(slug) {
        articlesSlugs = [...articlesSlugs, slug];
      }
      let articlesIds = [];
      function setArticlesIds(id) {
        articlesIds = [...articlesIds, id];
      }
      fetch("https://graphql.datocms.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `
        {
            allArticles {
                id
                active
                title
                slug
                khmer
                topic
                date
                thumbnail {
                alt
                url
                }
                createdAt
                updatedAt
                content
            }
        }
        `
        })
      }).then((res) => res.json()).then((res) => {
        setArticles(res.data["allArticles"]);
        articles.forEach((article) => {
          setArticlesIds(article["id"]);
          setArticlesSlugs(article["slug"]);
        });
        console.log(articlesIds, articlesSlugs);
      }).catch((error2) => {
        console.log(error2);
      });
      $$result.css.add(css4);
      $$unsubscribe_page();
      return `

    ${articles ? `<article>${articlesSlugs.includes($page.params.slug) ? `${each(articles, (article) => `${article["slug"] === $page.params.slug ? `${validate_component(Seo, "SEO").$$render($$result, {
        title: article["title"],
        dateWritten: (0, import_dayjs.default)(article["date"]).format("DD MMM YYYY"),
        thumbnail: article["thumbnail"]["url"]
      }, {}, {})}
                    <a href="${"/blog"}" class="${"backBtn svelte-1ibza4r"}">\u{1F868} Blog</a>
                    <h1>${escape(article["title"])}</h1>
                    <p>${escape((0, import_dayjs.default)(article["date"]).format("DD MMM YYYY"))}</p>
                    <div class="${"bgHero svelte-1ibza4r"}"><img${add_attribute("src", article["thumbnail"]["url"], 0)}${add_attribute("alt", article["thumbnail"]["alt"], 0)} class="${"svelte-1ibza4r"}"></div>
                    <img${add_attribute("src", article["thumbnail"]["url"], 0)}${add_attribute("alt", article["thumbnail"]["alt"], 0)}${add_attribute("title", article["thumbnail"]["alt"], 0)} class="${"svelte-1ibza4r"}">
                    <span class="${"blog_content"}">${validate_component(SvelteMarkdown, "SvelteMarkdown").$$render($$result, { source: article["content"] }, {}, {})}
                    </span>` : ``}`)}` : `<h2 style="${"display: block; width: 100%; max-width: 100%; margin: 0 auto; text-align: center"}">404 <br> Article not found</h2>`}</article>` : `<p>Retrieving article...</p>`}`;
    });
  }
});

// .svelte-kit/output/server/chunks/blog-fad8ca90.js
var blog_fad8ca90_exports = {};
__export(blog_fad8ca90_exports, {
  default: () => Blog
});
var import_dayjs2, css5, token2, Blog;
var init_blog_fad8ca90 = __esm({
  ".svelte-kit/output/server/chunks/blog-fad8ca90.js"() {
    init_shims();
    init_app_c78b47b4();
    import_dayjs2 = __toModule(require_dayjs_min());
    css5 = {
      code: ".loader.svelte-sj4va9.svelte-sj4va9{width:48px;height:48px;border:3px solid #666;border-bottom-color:transparent;border-radius:50%;display:inline-block;position:relative;box-sizing:border-box;animation:svelte-sj4va9-rotation 1s linear infinite}.loader.svelte-sj4va9.svelte-sj4va9::after{content:'';position:absolute;box-sizing:border-box;left:20px;top:31px;border:10px solid transparent;border-right-color:#666;transform:rotate(-40deg)}@keyframes svelte-sj4va9-rotation{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.individual.svelte-sj4va9.svelte-sj4va9{padding:1.8rem 0}.individual.svelte-sj4va9.svelte-sj4va9:hover,.individual.svelte-sj4va9.svelte-sj4va9:focus{outline:2px dashed #999;outline-offset:1.8rem}.blog_link.svelte-sj4va9.svelte-sj4va9{display:flex;width:100%;flex-direction:row;justify-content:space-between;align-items:center;text-decoration:none;width:100%;max-width:100%;color:#131313}.blog_link.svelte-sj4va9 p.svelte-sj4va9,.blog_link.svelte-sj4va9:visited p.svelte-sj4va9{color:#535353}.blog_link.svelte-sj4va9.svelte-sj4va9:active{color:inherit}.blog_link.svelte-sj4va9 img.svelte-sj4va9{width:60vmin;max-width:50%;max-height:30vh;object-fit:cover}.blog_link.svelte-sj4va9 .title.svelte-sj4va9{font-size:3.2rem;max-width:35ch}@media(max-width: 1023px){.individual.svelte-sj4va9.svelte-sj4va9{padding:2.5rem 0;border-bottom:2px dashed #999}.individual.svelte-sj4va9.svelte-sj4va9:first-of-type{padding:0}.individual.svelte-sj4va9.svelte-sj4va9:last-of-type{border:0}.individual.svelte-sj4va9.svelte-sj4va9:hover,.individual.svelte-sj4va9.svelte-sj4va9:focus{outline:0}.blog_link.svelte-sj4va9 img.svelte-sj4va9{min-width:30vw}}@media(max-width: 767px){.blog_link.svelte-sj4va9.svelte-sj4va9{flex-direction:column;align-items:flex-start}.blog_link.svelte-sj4va9 .title.svelte-sj4va9{font-size:3.2rem}.blog_link.svelte-sj4va9 img.svelte-sj4va9{margin-top:2.5vh;max-width:100%;min-width:100%}}",
      map: null
    };
    token2 = "fe98495b378ae369d79dea240fba61";
    Blog = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let articles;
      function setArticles(value) {
        articles = value;
      }
      fetch("https://graphql.datocms.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token2}`
        },
        body: JSON.stringify({
          query: `
        {
            allArticles {
                id
                active
                title
                slug
                khmer
                topic
                date
                thumbnail {
                    alt
                    url
                }
                createdAt
                updatedAt
            }
        }
        `
        })
      }).then((res) => res.json()).then((res) => {
        setArticles(res.data["allArticles"]);
      }).catch((error2) => {
        console.log(error2);
      });
      $$result.css.add(css5);
      return `${$$result.head += `${$$result.title = `<title>Blog | Masaya&#39;s Thoughts</title>`, ""}<meta name="${"description"}" content="${"Articles by Masaya"}" data-svelte="svelte-aakrzg">`, ""}
<div>${articles ? `${each(articles, ({ slug, title, date, topic, thumbnail }) => `<section class="${"individual svelte-sj4va9"}"><a class="${"blog_link svelte-sj4va9"}"${add_attribute("href", `/blog/${slug}`, 0)}><div style="${"display: flex; flex-direction: column; align-items: flex-start;"}"><h1 class="${"title svelte-sj4va9"}">${escape(title)}</h1>
                    <p style="${"margin: 0"}" class="${"svelte-sj4va9"}">Category: ${escape(topic)}</p>
                    <p style="${"margin: 0"}" class="${"svelte-sj4va9"}">${escape((0, import_dayjs2.default)(date).format("DD MMM YYYY"))}</p></div>                 
                ${thumbnail ? `<img${add_attribute("src", thumbnail["url"], 0)}${add_attribute("alt", thumbnail["alt"], 0)} class="${"svelte-sj4va9"}">` : ``}</a>            
        </section>`)}` : `<span class="${"loader svelte-sj4va9"}"></span>`}
</div>`;
    });
  }
});

// .svelte-kit/output/server/chunks/app-c78b47b4.js
function get_single_valued_header(headers, key2) {
  const value = headers[key2];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key2}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key2 in obj) {
    clone2[key2.toLowerCase()] = obj[key2];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const params = route.params(match);
  const response = await handler({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key2) {
            return walk(thing[key2]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key2) {
          return safeKey(key2) + ":" + stringify(thing[key2]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key2) {
            statements_1.push("" + name + safeProp(key2) + "=" + stringify(thing[key2]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? key2 : escapeUnsafeChars(JSON.stringify(key2));
}
function safeProp(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? "." + key2 : "[" + escapeUnsafeChars(JSON.stringify(key2)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop$1() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function writable(value, start = noop$1) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
function escape_json_string_in_html(str) {
  return escape$12(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
function escape_html_attr(str) {
  return '"' + escape$12(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape$12(str, dict, unicode_encoder) {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page: page2
}) {
  const css22 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css22.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page: page2,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css22).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page2 && page2.host ? s$1(page2.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page2 && page2.host ? s$1(page2.host) : "location.host"}, // TODO this is redundant
						path: ${page2 && page2.path ? try_serialize(page2.path, (error3) => {
      throw new Error(`Failed to serialize page.path: ${error3.message}`);
    }) : null},
						query: new URLSearchParams(${page2 && page2.query ? s$1(page2.query.toString()) : ""}),
						params: ${page2 && page2.params ? try_serialize(page2.params, (error3) => {
      throw new Error(`Failed to serialize page.params: ${error3.message}`);
    }) : null}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
async function load_node({
  request,
  options: options2,
  state,
  route,
  page: page2,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page2, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const prefix = options2.paths.assets || options2.paths.base;
        const filename = (resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved).slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page2.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key2, _receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key22, value] of response2.headers) {
                  if (key22 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key22 !== "etag") {
                    headers[key22] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key2 === "text") {
                return text;
              }
              if (key2 === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key2, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page: page2,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page: page2,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page: page2
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {}
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page: page2
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key2, value) {
      if (map.has(key2)) {
        (map.get(key2) || []).push(value);
      } else {
        map.set(key2, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key2, value] = str.split("=");
    append(decodeURIComponent(key2), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key2;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key2 = directives.name;
        }
      }
    });
    if (!key2)
      throw new Error("Malformed form data");
    append(key2, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {}
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function compute_rest_props(props, keys) {
  const rest = {};
  keys = new Set(keys);
  for (const k in props)
    if (!keys.has(k) && k[0] !== "$")
      rest[k] = props[k];
  return rest;
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function custom_event(type, detail, bubbles = false) {
  const e = document.createEvent("CustomEvent");
  e.initCustomEvent(type, bubbles, false, detail);
  return e;
}
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(type, detail);
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
    }
  };
}
function setContext(key2, context) {
  get_current_component().$$.context.set(key2, context);
}
function getContext(key2) {
  return get_current_component().$$.context.get(key2);
}
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css22) => css22.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-c7fb6f57.js",
      css: [assets + "/_app/assets/start-61d1577b.css"],
      js: [assets + "/_app/start-c7fb6f57.js", assets + "/_app/chunks/vendor-052015e0.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
async function load_component(file) {
  const { entry, css: css22, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css22.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender });
}
var __accessCheck, __privateGet, __privateAdd, __privateSet, _map, chars, unsafeChars, reserved, escaped$1, objectProtoOwnPropertyNames, subscriber_queue, escape_json_string_in_html_dict, escape_html_attr_dict, s$1, s, absolute, ReadOnlyFormData, current_component, escaped, missing_component, on_destroy, css6, Root, base, assets, user_hooks, template, options, default_settings, d, empty, manifest, get_hooks, module_lookup, metadata_lookup;
var init_app_c78b47b4 = __esm({
  ".svelte-kit/output/server/chunks/app-c78b47b4.js"() {
    init_shims();
    __accessCheck = (obj, member, msg) => {
      if (!member.has(obj))
        throw TypeError("Cannot " + msg);
    };
    __privateGet = (obj, member, getter) => {
      __accessCheck(obj, member, "read from private field");
      return getter ? getter.call(obj) : member.get(obj);
    };
    __privateAdd = (obj, member, value) => {
      if (member.has(obj))
        throw TypeError("Cannot add the same private member more than once");
      member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
    };
    __privateSet = (obj, member, value, setter) => {
      __accessCheck(obj, member, "write to private field");
      setter ? setter.call(obj, value) : member.set(obj, value);
      return value;
    };
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
    reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
    escaped$1 = {
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
    Promise.resolve();
    subscriber_queue = [];
    escape_json_string_in_html_dict = {
      '"': '\\"',
      "<": "\\u003C",
      ">": "\\u003E",
      "/": "\\u002F",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    escape_html_attr_dict = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    };
    s$1 = JSON.stringify;
    s = JSON.stringify;
    absolute = /^([a-z]+:)?\/?\//;
    ReadOnlyFormData = class {
      constructor(map) {
        __privateAdd(this, _map, void 0);
        __privateSet(this, _map, map);
      }
      get(key2) {
        const value = __privateGet(this, _map).get(key2);
        return value && value[0];
      }
      getAll(key2) {
        return __privateGet(this, _map).get(key2);
      }
      has(key2) {
        return __privateGet(this, _map).has(key2);
      }
      *[Symbol.iterator]() {
        for (const [key2, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield [key2, value[i]];
          }
        }
      }
      *entries() {
        for (const [key2, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield [key2, value[i]];
          }
        }
      }
      *keys() {
        for (const [key2] of __privateGet(this, _map))
          yield key2;
      }
      *values() {
        for (const [, value] of __privateGet(this, _map)) {
          for (let i = 0; i < value.length; i += 1) {
            yield value[i];
          }
        }
      }
    };
    _map = new WeakMap();
    Promise.resolve();
    escaped = {
      '"': "&quot;",
      "'": "&#39;",
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    };
    missing_component = {
      $$render: () => ""
    };
    css6 = {
      code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
      map: null
    };
    Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let { stores } = $$props;
      let { page: page2 } = $$props;
      let { components } = $$props;
      let { props_0 = null } = $$props;
      let { props_1 = null } = $$props;
      let { props_2 = null } = $$props;
      setContext("__svelte__", stores);
      afterUpdate(stores.page.notify);
      if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
        $$bindings.stores(stores);
      if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
        $$bindings.page(page2);
      if ($$props.components === void 0 && $$bindings.components && components !== void 0)
        $$bindings.components(components);
      if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
        $$bindings.props_0(props_0);
      if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
        $$bindings.props_1(props_1);
      if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
        $$bindings.props_2(props_2);
      $$result.css.add(css6);
      {
        stores.page.set(page2);
      }
      return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
        default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
          default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
        })}` : ``}`
      })}

${``}`;
    });
    base = "";
    assets = "";
    user_hooks = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      [Symbol.toStringTag]: "Module"
    });
    template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon-96x96.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
    options = null;
    default_settings = { paths: { "base": "", "assets": "" } };
    d = (s2) => s2.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
    empty = () => ({});
    manifest = {
      assets: [{ "file": "favicon-96x96.png", "size": 1867, "type": "image/png" }, { "file": "images/12-rules-first-bought.webp", "size": 107846, "type": "image/webp" }, { "file": "images/masaya-celestial.jpg", "size": 274727, "type": "image/jpeg" }, { "file": "sitemap.xml", "size": 804, "type": "application/xml" }, { "file": "styles/globals.css", "size": 1095, "type": "text/css" }, { "file": "styles/loading-anim.css", "size": 3810, "type": "text/css" }, { "file": "styles/reset.css", "size": 1314, "type": "text/css" }, { "file": "styles/_variables.css", "size": 438, "type": "text/css" }],
      layout: "src/routes/__layout.svelte",
      error: ".svelte-kit/build/components/error.svelte",
      routes: [
        {
          type: "page",
          pattern: /^\/$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/about\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/blog\/([^/]+?)\/?$/,
          params: (m) => ({ slug: d(m[1]) }),
          a: ["src/routes/__layout.svelte", "src/routes/blog/[slug].svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        },
        {
          type: "page",
          pattern: /^\/blog\/?$/,
          params: empty,
          a: ["src/routes/__layout.svelte", "src/routes/blog.svelte"],
          b: [".svelte-kit/build/components/error.svelte"]
        }
      ]
    };
    get_hooks = (hooks) => ({
      getSession: hooks.getSession || (() => ({})),
      handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
      handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
      externalFetch: hooks.externalFetch || fetch
    });
    module_lookup = {
      "src/routes/__layout.svelte": () => Promise.resolve().then(() => (init_layout_3614214b(), layout_3614214b_exports)),
      ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(() => (init_error_9f1fe22b(), error_9f1fe22b_exports)),
      "src/routes/index.svelte": () => Promise.resolve().then(() => (init_index_68306403(), index_68306403_exports)),
      "src/routes/about.svelte": () => Promise.resolve().then(() => (init_about_356741bd(), about_356741bd_exports)),
      "src/routes/blog/[slug].svelte": () => Promise.resolve().then(() => (init_slug_087c7262(), slug_087c7262_exports)),
      "src/routes/blog.svelte": () => Promise.resolve().then(() => (init_blog_fad8ca90(), blog_fad8ca90_exports))
    };
    metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-839294d6.js", "css": ["assets/pages/__layout.svelte-ad0d032e.css"], "js": ["pages/__layout.svelte-839294d6.js", "chunks/vendor-052015e0.js", "chunks/stores-f653db05.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-05a3c889.js", "css": [], "js": ["error.svelte-05a3c889.js", "chunks/vendor-052015e0.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-287c916c.js", "css": ["assets/pages/index.svelte-9cecbb91.css"], "js": ["pages/index.svelte-287c916c.js", "chunks/vendor-052015e0.js"], "styles": [] }, "src/routes/about.svelte": { "entry": "pages/about.svelte-d7cc28e1.js", "css": ["assets/pages/about.svelte-3af89686.css"], "js": ["pages/about.svelte-d7cc28e1.js", "chunks/vendor-052015e0.js"], "styles": [] }, "src/routes/blog/[slug].svelte": { "entry": "pages/blog/_slug_.svelte-0b6921ea.js", "css": ["assets/pages/blog/_slug_.svelte-a8667847.css"], "js": ["pages/blog/_slug_.svelte-0b6921ea.js", "chunks/vendor-052015e0.js", "chunks/stores-f653db05.js"], "styles": [] }, "src/routes/blog.svelte": { "entry": "pages/blog.svelte-9bec0db3.js", "css": ["assets/pages/blog.svelte-9b7a3f2f.css"], "js": ["pages/blog.svelte-9bec0db3.js", "chunks/vendor-052015e0.js"], "styles": [] } };
  }
});

// .svelte-kit/vercel/entry.js
__export(exports, {
  default: () => entry_default
});
init_shims();

// node_modules/@sveltejs/kit/dist/node.js
init_shims();
function getRawBody(req) {
  return new Promise((fulfil, reject) => {
    const h = req.headers;
    if (!h["content-type"]) {
      return fulfil(null);
    }
    req.on("error", reject);
    const length = Number(h["content-length"]);
    if (isNaN(length) && h["transfer-encoding"] == null) {
      return fulfil(null);
    }
    let data = new Uint8Array(length || 0);
    if (length > 0) {
      let offset = 0;
      req.on("data", (chunk) => {
        const new_len = offset + Buffer.byteLength(chunk);
        if (new_len > length) {
          return reject({
            status: 413,
            reason: 'Exceeded "Content-Length" limit'
          });
        }
        data.set(chunk, offset);
        offset = new_len;
      });
    } else {
      req.on("data", (chunk) => {
        const new_data = new Uint8Array(data.length + chunk.length);
        new_data.set(data, 0);
        new_data.set(chunk, data.length);
        data = new_data;
      });
    }
    req.on("end", () => {
      fulfil(data);
    });
  });
}

// .svelte-kit/output/server/app.js
init_shims();
init_app_c78b47b4();

// .svelte-kit/vercel/entry.js
init();
var entry_default = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url || "", "http://localhost");
  let body;
  try {
    body = await getRawBody(req);
  } catch (err) {
    res.statusCode = err.status || 400;
    return res.end(err.reason || "Invalid request body");
  }
  const rendered = await render({
    method: req.method,
    headers: req.headers,
    path: pathname,
    query: searchParams,
    rawBody: body
  });
  if (rendered) {
    const { status, headers, body: body2 } = rendered;
    return res.writeHead(status, headers).end(body2);
  }
  return res.writeHead(404).end();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
/*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
