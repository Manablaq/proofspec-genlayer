import {
  expect,
  test,
  type APIRequestContext,
  type Page
} from "@playwright/test";

const account = "0x4444444444444444444444444444444444444444";
const txHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function resetMock(request: APIRequestContext) {
  await request.post("/api/mock-rpc", {
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "proofspec_reset",
      params: []
    }
  });
}

async function installMockWallet(page: Page) {
  await page.addInitScript(
    ({ walletAccount, hash }) => {
      let chainId = "0xf22d";
      Object.defineProperty(window, "ethereum", {
        configurable: true,
        value: {
          request: async ({
            method,
            params
          }: {
            method: string;
            params?: Array<Record<string, string>>;
          }) => {
            if (method === "eth_requestAccounts" || method === "eth_accounts") {
              return [walletAccount];
            }
            if (method === "eth_chainId") return chainId;
            if (method === "wallet_switchEthereumChain") {
              const next = params?.[0]?.chainId;
              if (next) chainId = next;
              return null;
            }
            if (method === "wallet_addEthereumChain") {
              const next = params?.[0]?.chainId;
              if (next) chainId = next;
              return null;
            }
            if (method === "eth_sendTransaction") return hash;
            throw new Error(`Unexpected wallet method: ${method}`);
          }
        }
      });
    },
    { walletAccount: account, hash: txHash }
  );
}

test.beforeEach(async ({ page, request }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
      return;
    }
    await route.abort("blockedbyclient");
  });

  await resetMock(request);
});

test("guest can read finalized certificate and inspect authenticated evidence", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByTestId("network-chip")).toContainText("Studio Devnet");
  await expect(page.getByTestId("spec-count")).toHaveText("1");
  await expect(page.getByTestId("challenge-count")).toHaveText("1");

  await page.getByLabel("Specification ID").fill("1");
  await page.getByRole("button", { name: "Open certificate" }).click();

  await expect(page.getByRole("heading", { name: "ProofSpec RC" })).toBeVisible();
  await expect(page.getByText("CERTIFIED").first()).toBeVisible();
  await expect(page.getByText("Challenge #1")).toBeVisible();

  await page.getByRole("button", { name: /Inspect snapshot/ }).click();
  await expect(page.getByTestId("snapshot-panel")).toBeVisible();
  await expect(page.getByText("VERIFIED")).toBeVisible();
  await expect(page.getByText(/ProofSpec release evidence/)).toBeVisible();
});

test("missing deployment configuration fails closed without a fabricated verdict", async ({
  page
}) => {
  await page.route("**/api/runtime-config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configured: false,
        network: null,
        contractAddress: null,
        rpcUrl: null,
        chainId: null,
        explorerUrl: null,
        mockMode: false,
        error: "Contract not configured: test fixture."
      })
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("unconfigured-state")).toContainText(
    "Contract not configured"
  );
  await expect(page.getByRole("button", { name: "Open certificate" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Review transaction" })).toBeDisabled();
});

test("wallet-assisted create write is reviewed, duplicate-locked, finalized, and refreshed", async ({
  page,
  request
}) => {
  await installMockWallet(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByTestId("wallet-address")).toBeVisible();

  await page.getByLabel("Release label").fill("Frontend RC");
  await page
    .getByLabel("Immutable release reference")
    .fill("github:Manablaq/proofspec-genlayer@frontend-rc");
  await page
    .getByLabel("Requirement")
    .fill("The frontend exposes finalized guest reads and pre-sign review.");
  await page
    .getByLabel("Primary evidence URL")
    .fill("https://github.com/example/proofspec/blob/immutable/frontend.md");

  await page.getByRole("button", { name: "Review transaction" }).click();

  const dialog = page.getByRole("dialog", { name: "Review transaction" });
  await expect(dialog).toContainText("create_spec");
  await expect(dialog).toContainText("studio-dev");
  await expect(dialog).toContainText(
    "0x1111111111111111111111111111111111111111"
  );

  const confirm = page.getByTestId("confirm-write");
  await confirm.evaluate((node) => {
    const button = node as HTMLButtonElement;
    button.click();
    button.click();
  });

  await expect(dialog).toContainText("Finalized");
  await expect(page.getByTestId("spec-count")).toHaveText("2");

  const debug = await request.post("/api/mock-rpc", {
    data: {
      jsonrpc: "2.0",
      id: 2,
      method: "proofspec_debugState",
      params: []
    }
  });
  const payload = await debug.json();
  expect(payload.result.txCount).toBe(1);
  expect(payload.result.specCount).toBe(2);
});

test("mobile layout remains usable and keyboard focus reaches primary navigation", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();

  await expect(page.getByRole("link", { name: "ProofSpec home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Release claims/ })).toBeVisible();
});
