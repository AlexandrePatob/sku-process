import assert from "node:assert/strict";
import { test } from "node:test";
import { getReports } from "../src/services/api.ts";

test("loads every reports page and normalizes processing for the list", async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(url);
    return Response.json({
      data: [
        {
          run_id: url.endsWith("page=1") ? "active" : "done",
          status: url.endsWith("page=1") ? "processing" : "completed",
          total: null,
        },
      ],
      pagination: { page: urls.length, limit: 100, total: 101, total_pages: 2 },
    });
  });
  const runs = await getReports();
  assert.deepEqual(urls, [
    "http://localhost:3000/reports?limit=100&page=1",
    "http://localhost:3000/reports?limit=100&page=2",
  ]);
  assert.deepEqual(
    runs.map((run) => [run.run_id, run.status]),
    [
      ["active", "pending"],
      ["done", "completed"],
    ],
  );
});

test("empty history makes one request and API failures are surfaced", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ data: [], pagination: { total_pages: 0 } }),
  );
  assert.deepEqual(await getReports(), []);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(
    async () => new Response("unavailable", { status: 503 }),
  );
  await assert.rejects(getReports(), /HTTP 503/);
});
