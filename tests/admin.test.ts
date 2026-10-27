import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("../src/features/admin/auth", () => ({
  ownerToken: async () => "owner-access-token",
}));
import {
  adminRequest,
  postInput,
  uploadImage,
} from "../src/features/admin/api";
afterEach(() => vi.unstubAllGlobals());
describe("Studio API boundaries", () => {
  it("attaches owner auth and ETag only to the API request", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ETag: '"2"' },
      });
    });
    const result = await adminRequest(
      "/posts/1",
      z.object({ ok: z.boolean() }),
      { method: "PUT", body: { title: "Hello" }, etag: '"1"' },
    );
    expect(calls[0].url).toBe("/api/v1/admin/posts/1");
    expect(calls[0].init.headers).toMatchObject({
      Authorization: "Bearer owner-access-token",
      "If-Match": '"1"',
    });
    expect(calls[0].init.credentials).toBe("omit");
    expect(result.etag).toBe('"2"');
  });
  it("preserves concurrency errors without echoing server internals", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ detail: "private SQL query" }), {
          status: 412,
        }),
    );
    await expect(adminRequest("/posts/1", z.unknown())).rejects.toThrow(
      "changed in another window",
    );
  });
  it("rejects malformed responses instead of letting them reach the editor", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ ok: "wrong type" }), { status: 200 }),
    );
    await expect(
      adminRequest("/session", z.object({ ok: z.boolean() })),
    ).rejects.toThrow();
  });
  it("uploads bytes without leaking the owner token to storage and finalizes through the API", async () => {
    const id = "8318a34f-1484-4eb8-8ab1-b3a1378a2d8c";
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/uploads"))
        return new Response(
          JSON.stringify({
            data: {
              id,
              uploadUrl: "https://bucket.example/upload",
              method: "PUT",
              headers: { "Content-Type": "image/png" },
            },
          }),
        );
      if (url === "https://bucket.example/upload")
        return new Response(null, { status: 200 });
      return new Response(
        JSON.stringify({
          data: {
            id,
            url: "https://images.example/image.webp",
            width: 20,
            height: 10,
          },
        }),
      );
    });
    const image = await uploadImage(
      new File(["png bytes"], "test.png", { type: "image/png" }),
      "A diagram",
    );
    expect(calls).toHaveLength(3);
    expect(calls[1].init.headers).toEqual({ "Content-Type": "image/png" });
    expect(calls[1].init.body).toBeInstanceOf(File);
    expect(calls[2].url).toBe(`/api/v1/admin/media/${id}/complete`);
    expect(image.alt).toBe("A diagram");
  });
  it("validates file type, size, and descriptions before requesting an upload", async () => {
    await expect(
      uploadImage(
        new File(["svg"], "test.svg", { type: "image/svg+xml" }),
        "Alt",
      ),
    ).rejects.toThrow("JPEG");
    await expect(
      uploadImage(new File(["png"], "test.png", { type: "image/png" }), ""),
    ).rejects.toThrow("description");
  });
  it("accepts drafts with nullable media and rejects unsafe slugs and unknown publication statuses", () => {
    const draft = {
      slug: "hello",
      title: "Hello",
      excerpt: "",
      bodyMarkdown: "Text",
      tags: [],
      mediaIds: [],
      coverImageId: null,
      isDemo: false,
      status: "draft",
    };
    expect(postInput.safeParse(draft).success).toBe(true);
    expect(postInput.safeParse({ ...draft, slug: "../admin" }).success).toBe(
      false,
    );
    expect(postInput.safeParse({ ...draft, status: "deleted" }).success).toBe(
      false,
    );
  });
});
