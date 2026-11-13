import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import {
  daysFromToday,
  identities,
  sampleTool,
  setup,
  signIn,
  type TestConvex,
} from "./test.setup";

// These run the real Convex functions against an in-memory backend, with
// Clerk identities simulated by withIdentity. They check that the rules hold
// on the server, whatever a client sends.

let t: TestConvex;

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", identities.admin.email);
  t = setup();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Alice lists a tool, Bob requests it for tomorrow to the day after. */
async function aliceToolWithBobRequest() {
  const alice = await signIn(t, identities.alice);
  const bob = await signIn(t, identities.bob);
  const toolId = await alice.mutation(api.tools.create, sampleTool);
  const loanId = await bob.mutation(api.loans.request, {
    toolId,
    startDate: daysFromToday(1),
    endDate: daysFromToday(2),
  });
  return { alice, bob, toolId, loanId };
}

describe("public access", () => {
  it("listPublic returns only id, name and category, with no owner details", async () => {
    const alice = await signIn(t, identities.alice);
    await alice.mutation(api.tools.create, sampleTool);

    const tools = await t.query(api.tools.listPublic, {});
    expect(tools).toHaveLength(1);
    expect(Object.keys(tools[0]).sort()).toEqual(["_id", "category", "name"]);
    expect(JSON.stringify(tools)).not.toContain("alice");
  });

  it("signed-out callers can't read the full list or write anything", async () => {
    await expect(t.query(api.tools.listAll, {})).rejects.toThrow(/UNAUTHENTICATED/);
    await expect(t.mutation(api.tools.create, sampleTool)).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
  });

  it("signed-in tool lists never include the owner's email", async () => {
    const { bob } = await aliceToolWithBobRequest();
    const tools = await bob.query(api.tools.listAll, {});
    expect(JSON.stringify(tools)).not.toContain(identities.alice.email);
  });
});

describe("tool ownership", () => {
  it("only the owner can edit or delete a listing", async () => {
    const alice = await signIn(t, identities.alice);
    const bob = await signIn(t, identities.bob);
    const toolId = await alice.mutation(api.tools.create, sampleTool);

    await expect(
      bob.mutation(api.tools.update, { toolId, ...sampleTool, name: "Hijacked" }),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(bob.mutation(api.tools.remove, { toolId })).rejects.toThrow(/FORBIDDEN/);

    await alice.mutation(api.tools.update, {
      toolId,
      ...sampleTool,
      name: "Hammer drill",
    });
    const mine = await alice.query(api.tools.listMine, {});
    expect(mine[0].name).toBe("Hammer drill");
  });

  it("validates listing length limits on the server", async () => {
    const alice = await signIn(t, identities.alice);
    await expect(
      alice.mutation(api.tools.create, { ...sampleTool, description: "x".repeat(281) }),
    ).rejects.toThrow(/INVALID_INPUT/);
  });

  it("an owner can't delete a tool that's on an approved loan", async () => {
    const { alice, toolId, loanId } = await aliceToolWithBobRequest();
    await alice.mutation(api.loans.approve, { loanId });
    await expect(alice.mutation(api.tools.remove, { toolId })).rejects.toThrow(
      /CONFLICT/,
    );
  });
});

describe("borrowing rules", () => {
  it("you can't borrow your own tool", async () => {
    const alice = await signIn(t, identities.alice);
    const toolId = await alice.mutation(api.tools.create, sampleTool);
    await expect(
      alice.mutation(api.loans.request, {
        toolId,
        startDate: daysFromToday(1),
        endDate: daysFromToday(1),
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("rejects past start dates and reversed ranges", async () => {
    const alice = await signIn(t, identities.alice);
    const bob = await signIn(t, identities.bob);
    const toolId = await alice.mutation(api.tools.create, sampleTool);
    await expect(
      bob.mutation(api.loans.request, {
        toolId,
        startDate: daysFromToday(-1),
        endDate: daysFromToday(1),
      }),
    ).rejects.toThrow(/past/);
    await expect(
      bob.mutation(api.loans.request, {
        toolId,
        startDate: daysFromToday(3),
        endDate: daysFromToday(2),
      }),
    ).rejects.toThrow(/on or after/);
  });

  it("rejects a request that overlaps an approved loan", async () => {
    const { alice, toolId, loanId } = await aliceToolWithBobRequest();
    await alice.mutation(api.loans.approve, { loanId });

    const carol = await signIn(t, identities.carol);
    await expect(
      carol.mutation(api.loans.request, {
        toolId,
        startDate: daysFromToday(2),
        endDate: daysFromToday(4),
      }),
    ).rejects.toThrow(/already booked/);
  });

  it("approving declines other pending requests that overlap", async () => {
    const { alice, toolId, loanId } = await aliceToolWithBobRequest();
    const carol = await signIn(t, identities.carol);
    await carol.mutation(api.loans.request, {
      toolId,
      startDate: daysFromToday(2),
      endDate: daysFromToday(3),
    });

    await alice.mutation(api.loans.approve, { loanId });
    const carolsRequests = await carol.query(api.loans.listMyRequests, {});
    expect(carolsRequests[0].status).toBe("declined");
  });
});

describe("loan permissions and transitions", () => {
  it("only the borrower can cancel, only while pending, and the lender is notified", async () => {
    const { alice, bob, loanId } = await aliceToolWithBobRequest();
    const carol = await signIn(t, identities.carol);

    await expect(alice.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await expect(carol.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await bob.mutation(api.loans.cancel, { loanId });
    expect((await bob.query(api.loans.listMyRequests, {}))[0].status).toBe("cancelled");
    await expect(bob.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      /INVALID_TRANSITION/,
    );

    const event = await t.run((ctx) =>
      ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", `notification:${loanId}:loan_cancelled`),
        )
        .unique(),
    );
    const data = await t.query(internal.automation.getNotificationPayload, {
      eventId: event!._id,
    });
    expect(data?.payload.recipient.email).toBe(identities.alice.email);
  });

  it("a borrower can't cancel an approved loan", async () => {
    const { alice, bob, loanId } = await aliceToolWithBobRequest();
    await alice.mutation(api.loans.approve, { loanId });
    await expect(bob.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      /INVALID_TRANSITION/,
    );
  });

  it("the borrower can't approve their own request", async () => {
    const { bob, loanId } = await aliceToolWithBobRequest();
    await expect(bob.mutation(api.loans.approve, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it("an unrelated user can't approve, decline or return a loan", async () => {
    const { loanId } = await aliceToolWithBobRequest();
    const carol = await signIn(t, identities.carol);
    await expect(carol.mutation(api.loans.approve, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await expect(carol.mutation(api.loans.decline, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await expect(carol.mutation(api.loans.markReturned, { loanId })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });

  it("follows requested -> approved -> returned and rejects anything else", async () => {
    const { alice, loanId } = await aliceToolWithBobRequest();

    // You can't return something that was never approved.
    await expect(alice.mutation(api.loans.markReturned, { loanId })).rejects.toThrow(
      /INVALID_TRANSITION/,
    );
    await alice.mutation(api.loans.approve, { loanId });
    await expect(alice.mutation(api.loans.approve, { loanId })).rejects.toThrow(
      /INVALID_TRANSITION/,
    );
    await expect(alice.mutation(api.loans.decline, { loanId })).rejects.toThrow(
      /INVALID_TRANSITION/,
    );
    await alice.mutation(api.loans.markReturned, { loanId });

    const incoming = await alice.query(api.loans.listIncoming, {});
    expect(incoming[0].status).toBe("returned");
  });

  it("each side only sees their own loans", async () => {
    await aliceToolWithBobRequest();
    const carol = await signIn(t, identities.carol);
    expect(await carol.query(api.loans.listMyRequests, {})).toEqual([]);
    expect(await carol.query(api.loans.listIncoming, {})).toEqual([]);
  });
});

describe("display names", () => {
  it("never falls back to the email address, since other users see the name", async () => {
    const noName = await signIn(t, {
      subject: "user_noname",
      email: "john.smith@example.com",
      emailVerified: true,
    });
    expect((await noName.query(api.users.me, {}))?.name).toBe("Neighbor");

    const withUsername = await signIn(t, {
      subject: "user_handle",
      nickname: "jsmith",
      email: "j@example.com",
      emailVerified: true,
    });
    expect((await withUsername.query(api.users.me, {}))?.name).toBe("jsmith");
  });
});

describe("admin role", () => {
  it("non-admins can't use admin functions", async () => {
    const { bob, toolId } = await aliceToolWithBobRequest();
    const bobUser = await bob.query(api.users.me, {});
    await expect(bob.query(api.admin.listAllLoans, {})).rejects.toThrow(/FORBIDDEN/);
    await expect(bob.mutation(api.admin.removeTool, { toolId })).rejects.toThrow(
      /FORBIDDEN/,
    );
    await expect(
      bob.mutation(api.admin.setTrustedLender, {
        userId: bobUser!._id,
        isTrustedLender: true,
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("an admin can view all loans, remove any listing and mark a Trusted Lender", async () => {
    const { alice, toolId } = await aliceToolWithBobRequest();
    const admin = await signIn(t, identities.admin);
    const aliceUser = await alice.query(api.users.me, {});

    expect(await admin.query(api.admin.listAllLoans, {})).toHaveLength(1);
    await admin.mutation(api.admin.setTrustedLender, {
      userId: aliceUser!._id,
      isTrustedLender: true,
    });
    const listed = await admin.query(api.tools.listAll, {});
    expect(listed[0].owner.isTrustedLender).toBe(true);

    await admin.mutation(api.admin.removeTool, { toolId });
    expect(await t.query(api.tools.listPublic, {})).toEqual([]);
  });

  it("ADMIN_EMAILS only applies to verified emails", async () => {
    const unverified = await signIn(t, { ...identities.admin, emailVerified: false });
    expect((await unverified.query(api.users.me, {}))?.role).toBe("user");
  });

  it("adding someone to ADMIN_EMAILS later doesn't promote an existing account", async () => {
    const bob = await signIn(t, identities.bob);
    vi.stubEnv("ADMIN_EMAILS", identities.bob.email);
    await bob.mutation(api.users.ensureCurrentUser, {});
    expect((await bob.query(api.users.me, {}))?.role).toBe("user");
  });
});
