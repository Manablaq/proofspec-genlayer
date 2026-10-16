import { NextResponse } from "next/server";
import { applyMockWrite, mockState, resetMockState } from "@/lib/mock-state";
import type { WriteIntent } from "@/lib/types";

export const dynamic = "force-dynamic";

type RpcBody = {
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: unknown[];
};

function ok(id: number, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function fail(id: number, message: string, code = -32000) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  if (process.env.PROOFSPEC_E2E_MOCK !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as RpcBody;
  const id = typeof body.id === "number" ? body.id : 0;
  const params = Array.isArray(body.params) ? body.params : [];

  try {
    switch (body.method) {
      case "proofspec_reset": {
        const state = resetMockState();
        return ok(id, { specCount: state.specCount, challengeCount: state.challengeCount });
      }
      case "proofspec_getSpecCount":
        return ok(id, mockState().specCount);
      case "proofspec_getChallengeCount":
        return ok(id, mockState().challengeCount);
      case "proofspec_getSpec": {
        const spec = mockState().specs[Number(params[0])];
        if (!spec) return fail(id, "Specification does not exist.");
        return ok(id, spec);
      }
      case "proofspec_getChallenge": {
        const challenge = mockState().challenges[Number(params[0])];
        if (!challenge) return fail(id, "Challenge does not exist.");
        return ok(id, challenge);
      }
      case "proofspec_getEvidenceSnapshot": {
        const snapshot = mockState().snapshots[String(params[0])];
        if (!snapshot) return fail(id, "Evidence snapshot does not exist.");
        return ok(id, snapshot);
      }
      case "proofspec_verifyEvidenceSnapshot":
        return ok(id, Boolean(mockState().snapshots[String(params[0])]));
      case "proofspec_applyWrite": {
        const intent = params[0] as WriteIntent;
        const account = String(params[2] || "");
        const result = applyMockWrite(intent, account);
        mockState().txCount += 1;
        return ok(id, result);
      }
      case "proofspec_waitFinalized": {
        await new Promise((resolve) => setTimeout(resolve, 120));
        return ok(id, {
          hash: String(params[0]),
          status: "FINALIZED",
          execution_result: "FINISHED_WITH_RETURN"
        });
      }
      case "proofspec_debugState":
        return ok(id, {
          specCount: mockState().specCount,
          challengeCount: mockState().challengeCount,
          txCount: mockState().txCount
        });
      default:
        return fail(id, `Unsupported mock RPC method: ${String(body.method)}`, -32601);
    }
  } catch (error) {
    return fail(id, error instanceof Error ? error.message : "Unknown mock RPC error");
  }
}
