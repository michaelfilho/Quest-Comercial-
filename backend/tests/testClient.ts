import http from 'http';
import { Duplex } from 'stream';
import type { Express } from 'express';

class MemorySocket extends Duplex {
  public remoteAddress = '127.0.0.1';
  public encrypted = false;
  _read() {}
  _write(_chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    callback();
  }
}

export interface TestResponse {
  status: number;
  headers: Record<string, any>;
  body: any;
  text: string;
}

class TestRequestBuilder implements PromiseLike<TestResponse> {
  private headers: Record<string, string> = {};
  private payload: any = undefined;

  constructor(
    private app: Express,
    private method: string,
    private url: string
  ) {}

  set(key: string, value: string): this {
    this.headers[key.toLowerCase()] = value;
    return this;
  }

  send(body: any): this {
    this.payload = body;
    return this;
  }

  private execute(): Promise<TestResponse> {
    return new Promise((resolve, reject) => {
      const socket = new MemorySocket() as any;
      const req = new http.IncomingMessage(socket);
      req.method = this.method.toUpperCase();
      req.url = this.url;

      const bodyString =
        this.payload !== undefined
          ? typeof this.payload === 'string'
            ? this.payload
            : JSON.stringify(this.payload)
          : '';

      req.headers = { ...this.headers };
      if (bodyString) {
        req.headers['content-type'] = req.headers['content-type'] || 'application/json';
        req.headers['content-length'] = String(Buffer.byteLength(bodyString));
      }

      const res = new http.ServerResponse(req);
      res.assignSocket(socket);

      const chunks: Buffer[] = [];
      const origWrite = res.write.bind(res);
      const origEnd = res.end.bind(res);

      (res as any).write = (chunk: any, encoding?: any, cb?: any) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
        }
        return origWrite(chunk, encoding, cb);
      };

      (res as any).end = (chunk?: any, encoding?: any, cb?: any) => {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
        }
        origEnd(chunk, encoding, cb);

        const rawText = Buffer.concat(chunks).toString('utf-8');
        let parsedBody: any = rawText;
        try {
          parsedBody = rawText ? JSON.parse(rawText) : {};
        } catch {
          // keep text
        }

        const rawHeaders = res.getHeaders();
        const normalizedHeaders: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawHeaders)) {
          if (k.toLowerCase() === 'set-cookie') {
            normalizedHeaders['set-cookie'] = Array.isArray(v) ? v : v ? [String(v)] : undefined;
          } else {
            normalizedHeaders[k.toLowerCase()] = v;
          }
        }

        resolve({
          status: res.statusCode,
          headers: normalizedHeaders,
          body: parsedBody,
          text: rawText,
        });
        return res;
      };

      try {
        this.app(req as any, res as any);
        if (bodyString) {
          req.push(bodyString);
        }
        req.push(null);
      } catch (err) {
        reject(err);
      }
    });
  }

  then<TResult1 = TestResponse, TResult2 = never>(
    onfulfilled?: ((value: TestResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function request(app: Express) {
  return {
    get: (url: string) => new TestRequestBuilder(app, 'GET', url),
    post: (url: string) => new TestRequestBuilder(app, 'POST', url),
    put: (url: string) => new TestRequestBuilder(app, 'PUT', url),
    patch: (url: string) => new TestRequestBuilder(app, 'PATCH', url),
    delete: (url: string) => new TestRequestBuilder(app, 'DELETE', url),
  };
}

