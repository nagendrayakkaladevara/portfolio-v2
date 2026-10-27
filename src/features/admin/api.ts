import { z } from "zod";
import { postSchema, postSummarySchema } from "../writing/contracts";
import { ownerToken } from "./auth";

export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
const adminPostSummary = postSummarySchema.extend({
  publishedAt: z.iso.datetime().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.number().int().positive(),
});
export const adminPost = postSchema.extend({
  publishedAt: z.iso.datetime().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  mediaIds: z.array(z.uuid()),
  coverImageId: z.uuid().nullable(),
});
export const postInput = z.strictObject({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(160),
  excerpt: z.string().trim().max(320),
  bodyMarkdown: z.string().min(1).max(200000),
  tags: z
    .array(
      z.object({
        slug: z
          .string()
          .max(60)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        name: z.string().min(1).max(60),
      }),
    )
    .max(8),
  mediaIds: z.array(z.uuid()).max(50),
  coverImageId: z.uuid().nullable(),
  isDemo: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});
export type PostInput = z.infer<typeof postInput>;
export type AdminPost = z.infer<typeof adminPost>;
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: string;
    body?: unknown;
    etag?: string;
    signal?: AbortSignal;
  } = {},
) {
  const token = await ownerToken();
  const response = await fetch(`${apiBase}/admin${path}`, {
    method: options.method || "GET",
    credentials: "omit",
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.etag ? { "If-Match": options.etag } : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Your session expired. Sign in again.",
      403: "This account does not have owner access.",
      409: "This slug already exists. Choose another slug.",
      412: "This article changed in another window. Reload it before saving again.",
      428: "Reload this article before saving.",
      503: "This service has not been configured yet.",
    };
    throw new AdminError(
      response.status,
      messages[response.status] ||
        `Request failed (${response.status}). Please try again.`,
    );
  }
  return {
    data: schema.parse(await response.json()),
    etag: response.headers.get("ETag"),
  };
}
const pagination = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  limit: z.number(),
});
export const adminList = z.object({
  data: z.array(adminPostSummary),
  pagination,
});
export const sessionSchema = z.object({
  data: z.object({ subject: z.string(), storageConfigured: z.boolean() }),
});
export const revisionList = z.object({
  data: z.array(
    z.object({
      version: z.number().int(),
      createdAt: z.iso.datetime(),
      snapshot: z.record(z.string(), z.unknown()),
    }),
  ),
  pagination,
});
const uploadResponse = z.object({
  data: z.object({
    id: z.uuid(),
    uploadUrl: z.url(),
    method: z.literal("PUT"),
    headers: z.object({
      "Content-Type": z.enum(["image/png", "image/jpeg", "image/webp"]),
    }),
  }),
});
const readyResponse = z.object({
  data: z.object({
    id: z.uuid(),
    url: z.url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});
export async function uploadImage(file: File, alt: string) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 5242880
  )
    throw new Error("Choose a JPEG, PNG or WebP image up to 5 MiB.");
  if (!alt.trim() || alt.trim().length > 250)
    throw new Error("Add an image description of 1–250 characters.");
  const {
    data: { data: upload },
  } = await adminRequest("/media/uploads", uploadResponse, {
    method: "POST",
    body: { contentType: file.type, sizeBytes: file.size, alt: alt.trim() },
  });
  // Never forward the owner token to object storage.
  if (new URL(upload.uploadUrl).protocol !== "https:")
    throw new Error("The upload URL must use HTTPS.");
  const sent = await fetch(upload.uploadUrl, {
    method: "PUT",
    body: file,
    headers: upload.headers,
    credentials: "omit",
    signal: AbortSignal.timeout(60000),
  });
  if (!sent.ok)
    throw new Error("Image upload failed. Please choose the file again.");
  const {
    data: { data: asset },
  } = await adminRequest(`/media/${upload.id}/complete`, readyResponse, {
    method: "POST",
    body: {},
  });
  return { ...asset, alt: alt.trim(), caption: null };
}
