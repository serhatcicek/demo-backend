const http = require("node:http");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT || 3001);
const POLL_AFTER_MS = 1500;

const demoOutcomes = {
  pm_card_visa: {
    terminalStatus: "succeeded",
    failure: null,
  },
  pm_card_chargeDeclined: {
    terminalStatus: "failed",
    failure: {
      code: "card_declined",
      message: "The card was declined by the issuer.",
    },
  },
};

const payments = new Map();

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendError(res, statusCode, code, message, details = []) {
  sendJson(res, statusCode, {
    error: {
      code,
      message,
      details,
    },
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function validateIntent(body) {
  const details = [];

  if (typeof body.orderId !== "string" || body.orderId.trim() === "") {
    details.push({ field: "orderId", message: "Must be a non-empty string." });
  }

  if (!Number.isInteger(body.amount) || body.amount <= 0) {
    details.push({ field: "amount", message: "Must be a positive integer in minor units." });
  }

  if (typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency)) {
    details.push({ field: "currency", message: "Must be a 3-letter uppercase currency code." });
  }

  if (typeof body.paymentMethodToken !== "string" || !(body.paymentMethodToken in demoOutcomes)) {
    details.push({
      field: "paymentMethodToken",
      message: "Must be one of: pm_card_visa, pm_card_chargeDeclined.",
    });
  }

  if (
    typeof body.customer !== "object" ||
    body.customer === null ||
    typeof body.customer.email !== "string" ||
    body.customer.email.trim() === ""
  ) {
    details.push({ field: "customer.email", message: "Must be a non-empty string." });
  }

  return details;
}

function createPayment(body) {
  const paymentId = `pay_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const outcome = demoOutcomes[body.paymentMethodToken];
  const now = new Date().toISOString();

  const payment = {
    paymentId,
    orderId: body.orderId,
    amount: body.amount,
    currency: body.currency,
    status: "processing",
    retryable: false,
    updatedAt: now,
    failure: null,
    pollCount: 0,
    terminalStatus: outcome.terminalStatus,
    terminalFailure: outcome.failure,
  };

  payments.set(paymentId, payment);

  return {
    paymentId,
    status: "processing",
    clientSecret: `demo_secret_${paymentId.slice(4)}`,
    pollAfterMs: POLL_AFTER_MS,
  };
}

function resolvePayment(payment) {
  if (payment.status !== "processing") {
    return payment;
  }

  payment.pollCount += 1;

  if (payment.pollCount >= 2) {
    payment.status = payment.terminalStatus;
    payment.retryable = payment.status === "failed";
    payment.failure = payment.terminalFailure;
    payment.updatedAt = new Date().toISOString();
  }

  return payment;
}

function statusPayload(payment) {
  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    retryable: payment.retryable,
    updatedAt: payment.updatedAt,
    failure: payment.failure,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments/intent") {
    try {
      const body = await readJsonBody(req);
      const details = validateIntent(body);

      if (details.length > 0) {
        sendError(res, 400, "validation_error", "Validation failed.", details);
        return;
      }

      const payload = createPayment(body);
      sendJson(res, 201, payload);
      return;
    } catch (error) {
      sendError(res, 400, "invalid_json", "Request body must be valid JSON.");
      return;
    }
  }

  const statusMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/status$/);

  if (req.method === "GET" && statusMatch) {
    const paymentId = statusMatch[1];
    const payment = payments.get(paymentId);

    if (!payment) {
      sendError(res, 404, "payment_not_found", "Payment was not found.");
      return;
    }

    resolvePayment(payment);
    sendJson(res, 200, statusPayload(payment));
    return;
  }

  if (url.pathname.startsWith("/api/payments/")) {
    sendError(res, 405, "method_not_allowed", "Method not allowed.");
    return;
  }

  sendError(res, 404, "not_found", "Route not found.");
});

server.listen(PORT, () => {
  console.log(`demo-backend listening on http://localhost:${PORT}`);
});
