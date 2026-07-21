import { describe, it, expect, vi, beforeEach } from "vitest";

function makeRes() {
  return {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
}

function makeReq(headers = {}, remoteAddress = "9.9.9.9") {
  return { headers, socket: { remoteAddress } };
}

describe("rateLimit", () => {
  beforeEach(() => {
    // Re-import the module fresh so the in-memory bucket map and the
    // env-derived limits are reset for each test.
    vi.resetModules();
    process.env.RATE_LIMIT_MAX = "2";
    process.env.RATE_LIMIT_WINDOW_MS = "100000";
  });

  it("allows requests under the limit and sets rate-limit headers", async () => {
    const { rateLimit } = await import("./rateLimit.js");
    const res = makeRes();
    const allowed = rateLimit(makeReq({ "x-forwarded-for": "1.1.1.1" }), res);

    expect(allowed).toBe(true);
    expect(res.headers["X-RateLimit-Limit"]).toBe("2");
    expect(res.headers["X-RateLimit-Remaining"]).toBe("1");
    expect(res.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("blocks requests over the limit and sets Retry-After", async () => {
    const { rateLimit } = await import("./rateLimit.js");
    const req = makeReq({ "x-forwarded-for": "2.2.2.2" });

    expect(rateLimit(req, makeRes())).toBe(true); // 1
    expect(rateLimit(req, makeRes())).toBe(true); // 2
    const res = makeRes();
    expect(rateLimit(req, res)).toBe(false); // 3 > limit of 2

    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(res.headers["Retry-After"]).toBeDefined();
  });

  it("uses the first x-forwarded-for entry as the client IP", async () => {
    const { rateLimit } = await import("./rateLimit.js");
    const req = makeReq({ "x-forwarded-for": "5.5.5.5, 10.0.0.1" });
    // Two requests from the same forwarded IP; second should show remaining 0.
    rateLimit(req, makeRes());
    const res = makeRes();
    rateLimit(req, res);
    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
  });

  it("falls back to x-real-ip and socket.remoteAddress", async () => {
    const { rateLimit } = await import("./rateLimit.js");
    // Distinct IPs are counted independently, so each is allowed once.
    expect(rateLimit({ headers: { "x-real-ip": "3.3.3.3" }, socket: {} }, makeRes())).toBe(true);
    expect(rateLimit({ headers: {}, socket: { remoteAddress: "4.4.4.4" } }, makeRes())).toBe(true);
    expect(rateLimit({ headers: {}, socket: {} }, makeRes())).toBe(true); // "unknown"
  });
});
