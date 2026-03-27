import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Email actions — unit tests for FE-007                              */
/*                                                                     */
/*  Tests cover the three new transactional email actions:             */
/*    - sendSignupConfirmationEmail                                     */
/*    - sendWelcomeEmail                                                */
/*    - sendAdminOrderNotification                                      */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks (avoid TDZ with vi.hoisted) ────────────────────────

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/integrations/email/provider", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/integrations/email/sender", () => ({
  getFullFromAddress: vi.fn((_type: string, name: string) => `"${name}" <no-reply@agency.hu>`),
  getRecipient: vi.fn((email: string) => email),
  getReplyToEmail: vi.fn(() => null),
}));

vi.mock("@/lib/integrations/email/templates", () => ({
  renderSignupConfirmationEmail: vi.fn(async () => "<html>signup</html>"),
  renderWelcomeEmail: vi.fn(async () => "<html>welcome</html>"),
  renderAdminOrderNotificationEmail: vi.fn(async () => "<html>admin</html>"),
  renderOrderReceiptEmail: vi.fn(async () => "<html>receipt</html>"),
  renderShippingUpdateEmail: vi.fn(async () => "<html>shipping</html>"),
  renderAbandonedCartEmail: vi.fn(async () => "<html>abandoned</html>"),
  renderNewsletterEmail: vi.fn(async () => "<html>newsletter</html>"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/security/unsubscribe-token", () => ({
  signUnsubscribeToken: vi.fn(async () => "mock-token"),
}));

// Mutable config object so individual tests can toggle flags
const emailConfig = {
  adminNotificationRecipients: ["admin@agency.hu"],
  sendSignupConfirmation: true,
  sendWelcomeEmail: true,
  sendAdminOrderNotification: true,
};

vi.mock("@/lib/config/site.config", () => ({
  siteConfig: {
    store: { name: "Agency Store", currency: "HUF" },
    get email() {
      return emailConfig;
    },
  },
}));

// ── Import after mocks ────────────────────────────────────────────────

import {
  sendSignupConfirmationEmail,
  sendWelcomeEmail,
  sendAdminOrderNotification,
} from "@/lib/integrations/email/actions";

// ── Helpers ───────────────────────────────────────────────────────────

function mockSendSuccess() {
  mockSendEmail.mockResolvedValue({ success: true, messageId: "msg-123" });
}

function mockSendFailure(error = "Resend API error") {
  mockSendEmail.mockResolvedValue({ success: false, error });
}

// ── Tests: sendSignupConfirmationEmail ───────────────────────────────

describe("sendSignupConfirmationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailConfig.sendSignupConfirmation = true;
  });

  it("sends email when sendSignupConfirmation is enabled", async () => {
    mockSendSuccess();

    const result = await sendSignupConfirmationEmail({
      to: "user@example.com",
      name: "Kovács János",
    });

    expect(result.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toContain("Sikeres regisztráció");
    expect(call.html).toBe("<html>signup</html>");
    expect(call.tags).toContainEqual({ name: "type", value: "signup_confirmation" });
  });

  it("returns success without sending when feature flag is off", async () => {
    emailConfig.sendSignupConfirmation = false;

    const result = await sendSignupConfirmationEmail({
      to: "user@example.com",
      name: "Kovács János",
    });

    expect(result.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns error result when sendEmail fails", async () => {
    mockSendFailure("Resend timeout");

    const result = await sendSignupConfirmationEmail({
      to: "user@example.com",
      name: "Teszt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Resend timeout");
  });

  it("returns error result when an exception is thrown", async () => {
    mockSendEmail.mockRejectedValue(new Error("Network failure"));

    const result = await sendSignupConfirmationEmail({
      to: "user@example.com",
      name: "Teszt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
  });
});

// ── Tests: sendWelcomeEmail ──────────────────────────────────────────

describe("sendWelcomeEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailConfig.sendWelcomeEmail = true;
  });

  it("sends welcome email with correct subject containing store name", async () => {
    mockSendSuccess();

    const result = await sendWelcomeEmail({
      to: "uj@pelda.hu",
      name: "Szabó Péter",
    });

    expect(result.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("uj@pelda.hu");
    expect(call.subject).toContain("Üdvözlünk");
    expect(call.subject).toContain("Agency Store");
    expect(call.html).toBe("<html>welcome</html>");
    expect(call.tags).toContainEqual({ name: "type", value: "welcome" });
  });

  it("returns success without sending when feature flag is off", async () => {
    emailConfig.sendWelcomeEmail = false;

    const result = await sendWelcomeEmail({ to: "uj@pelda.hu", name: "Teszt" });

    expect(result.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns error result when sendEmail fails", async () => {
    mockSendFailure("Provider unavailable");

    const result = await sendWelcomeEmail({ to: "uj@pelda.hu", name: "Teszt" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Provider unavailable");
  });

  it("returns error result when an exception is thrown", async () => {
    mockSendEmail.mockRejectedValue(new Error("Timeout"));

    const result = await sendWelcomeEmail({ to: "uj@pelda.hu", name: "Teszt" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Timeout");
  });
});

// ── Tests: sendAdminOrderNotification ────────────────────────────────

describe("sendAdminOrderNotification", () => {
  const orderParams = {
    orderId: "ord-uuid-001",
    orderNumber: "ORD-001",
    customerName: "Kiss Anna",
    customerEmail: "anna@example.hu",
    itemCount: 3,
    total: 24990,
    shippingMethod: "home",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    emailConfig.sendAdminOrderNotification = true;
    emailConfig.adminNotificationRecipients = ["admin@agency.hu"];
  });

  it("sends to configured admin recipients", async () => {
    mockSendSuccess();

    const result = await sendAdminOrderNotification(orderParams);

    expect(result.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toContain("admin@agency.hu");
  });

  it("includes order number and customer name in subject", async () => {
    mockSendSuccess();

    await sendAdminOrderNotification(orderParams);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.subject).toContain("ORD-001");
    expect(call.subject).toContain("Kiss Anna");
  });

  it("tags the message with type and order_id", async () => {
    mockSendSuccess();

    await sendAdminOrderNotification(orderParams);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.tags).toContainEqual({ name: "type", value: "admin_order_notification" });
    expect(call.tags).toContainEqual({ name: "order_id", value: "ord-uuid-001" });
  });

  it("returns success without sending when feature flag is off", async () => {
    emailConfig.sendAdminOrderNotification = false;

    const result = await sendAdminOrderNotification(orderParams);

    expect(result.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns success without sending when recipients list is empty", async () => {
    emailConfig.adminNotificationRecipients = [];

    const result = await sendAdminOrderNotification(orderParams);

    expect(result.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns error result when sendEmail fails", async () => {
    mockSendFailure("SMTP error");

    const result = await sendAdminOrderNotification(orderParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMTP error");
  });

  it("returns error result when an exception is thrown", async () => {
    mockSendEmail.mockRejectedValue(new Error("Unexpected crash"));

    const result = await sendAdminOrderNotification(orderParams);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unexpected crash");
  });
});
