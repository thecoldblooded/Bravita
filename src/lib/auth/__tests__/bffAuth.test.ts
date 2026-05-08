import {
  __resetBffSessionRestoreCacheForTests,
  restoreBffSession,
  type BffSessionPayload,
} from "../bffAuth";

const sessionPayload: BffSessionPayload = {
  access_token: "x",
  expires_at: 1_800_000_000,
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1" },
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("restoreBffSession", () => {
  afterEach(() => {
    __resetBffSessionRestoreCacheForTests();
    vi.unstubAllGlobals();
  });

  it("concurrent restore calls share a single network request", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal("fetch", fetchMock);

    const firstRestore = restoreBffSession();
    const secondRestore = restoreBffSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(jsonResponse(sessionPayload));

    await expect(Promise.all([firstRestore, secondRestore])).resolves.toEqual([
      sessionPayload,
      sessionPayload,
    ]);
  });

  it("reuses the immediate restore result instead of refetching", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(sessionPayload)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(restoreBffSession()).resolves.toEqual(sessionPayload);
    await expect(restoreBffSession()).resolves.toEqual(sessionPayload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
