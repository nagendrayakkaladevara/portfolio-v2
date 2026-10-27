import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useBlocker,
} from "react-router-dom";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { motion } from "motion/react";
import { ArrowLeft, LogOut, Plus, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageMeta } from "@/src/components/layout/page-meta";
import { ArticleBody } from "../writing/markdown";
import { useTheme } from "@/src/hooks/use-preferences";
import { finishSignIn, ownerAuth, isSignInCallback } from "./auth";
import {
  adminList,
  adminPost,
  adminRequest,
  postInput,
  revisionList,
  sessionSchema,
  uploadImage,
  type AdminPost,
  type PostInput,
} from "./api";
import "./styles.css";

const emptyPost: PostInput = {
  slug: "",
  title: "",
  excerpt: "",
  bodyMarkdown: "",
  tags: [],
  mediaIds: [],
  coverImageId: null,
  isDemo: false,
  status: "draft",
};
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`admin-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function AdminPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { dark, toggleTheme } = useTheme();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const auth = ownerAuth();
    if (!auth) {
      setChecking(false);
      return;
    }
    const update = () => {
      void auth.getUser().then((user) => {
        if (active) setSignedIn(Boolean(user && !user.expired));
      });
    };
    auth.events.addUserLoaded(update);
    auth.events.addUserUnloaded(update);
    auth.events.addAccessTokenExpired(update);
    const init = async () => {
      try {
        if (isSignInCallback(pathname)) {
          await finishSignIn();
          navigate("/admin", { replace: true });
        }
        const user = await auth.getUser();
        if (active) setSignedIn(Boolean(user && !user.expired));
      } catch {
        if (active) {
          setError("Sign-in could not be completed. Please try again.");
          if (isSignInCallback(pathname))
            navigate("/admin", { replace: true });
        }
      } finally {
        if (active) setChecking(false);
      }
    };
    void init();
    return () => {
      active = false;
      auth.events.removeUserLoaded(update);
      auth.events.removeUserUnloaded(update);
      auth.events.removeAccessTokenExpired(update);
    };
  }, [navigate, pathname]);
  async function signOut() {
    await ownerAuth()?.removeUser();
    cache.removeQueries({ queryKey: ["admin"] });
    setSignedIn(false);
    navigate("/admin");
  }
  return (
    <main id="main" className="admin-page" tabIndex={-1}>
      <PageMeta
        title="Studio — Sai Nagendra"
        description="Portfolio publishing studio"
        noIndex
      />
      <header className="admin-header">
        <div>
          <Link to="/" className="back-link">
            <ArrowLeft size={13} /> Portfolio
          </Link>
          <h1>
            Studio<span>Writing, thoughtfully published.</span>
          </h1>
        </div>
        <div className="admin-actions">
          <Button variant="ghost" onClick={toggleTheme}>
            {dark ? "Light" : "Dark"}
          </Button>
          {signedIn && (
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut size={14} />
              Sign out
            </Button>
          )}
        </div>
      </header>
      {checking ? (
        <Notice>Checking your session…</Notice>
      ) : !signedIn ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-login"
        >
          <p className="section-label">Owner access</p>
          <h2>A quiet space for your next idea.</h2>
          <p>
            Write, preview, and publish articles. Manage images and revisit
            earlier versions.
          </p>
          {error && <Notice error>{error}</Notice>}
          {ownerAuth() ? (
            <Button
              onClick={() => {
                setError("");
                void ownerAuth()!
                  .signinRedirect()
                  .catch(() =>
                    setError("Could not start sign-in. Please try again."),
                  );
              }}
            >
              Sign in to Studio
            </Button>
          ) : (
            <Notice>Owner sign-in is awaiting configuration.</Notice>
          )}
        </motion.section>
      ) : (
        <OwnerStudio />
      )}
    </main>
  );
}
function OwnerStudio() {
  const session = useQuery({
    queryKey: ["admin", "session"],
    queryFn: ({ signal }) =>
      adminRequest("/session", sessionSchema, { signal }),
    retry: false,
  });
  if (session.isPending) return <Notice>Opening Studio…</Notice>;
  if (session.isError)
    return (
      <>
        <Notice error>{message(session.error)}</Notice>
        <Button variant="outline" onClick={() => void session.refetch()}>
          Try again
        </Button>
      </>
    );
  return (
    <Routes>
      <Route index element={<ArticleList />} />
      <Route
        path="posts/new"
        element={
          <Editor
            storageConfigured={session.data.data.data.storageConfigured}
          />
        }
      />
      <Route
        path="posts/:id"
        element={
          <Editor
            storageConfigured={session.data.data.data.storageConfigured}
          />
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
function ArticleList() {
  const [search, setSearch] = useState(""),
    [q, setQuery] = useState(""),
    [status, setStatus] = useState("");
  const list = useInfiniteQuery({
    queryKey: ["admin", "posts", q, status],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (pageParam) params.set("cursor", pageParam);
      return (await adminRequest(`/posts?${params}`, adminList, { signal }))
        .data;
    },
    getNextPageParam: (page) => page.pagination.nextCursor || undefined,
    retry: false,
  });
  const posts = list.data?.pages.flatMap((p) => p.data) || [];
  return (
    <section>
      <div className="admin-section-title">
        <h2>Your writing</h2>
        <Button asChild>
          <Link to="/admin/posts/new">
            <Plus size={15} />
            New article
          </Link>
        </Button>
      </div>
      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <label className="admin-search">
          Search articles
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={120}
            placeholder="Search by title or excerpt"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All articles</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <Button variant="outline" type="submit">
          Search
        </Button>
      </form>
      {list.isPending ? (
        <Notice>Loading your articles…</Notice>
      ) : list.isError ? (
        <>
          <Notice error>{message(list.error)}</Notice>
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </>
      ) : !posts.length ? (
        <div className="admin-empty">
          <h3>
            {q || status
              ? "No matching articles."
              : "Your next idea starts here."}
          </h3>
          <p>
            {q || status
              ? "Try a different search or status."
              : "Create a draft and take your time."}
          </p>
        </div>
      ) : (
        <ul className="admin-articles">
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={`/admin/posts/${post.id}`}>
                <div>
                  <strong>{post.title}</strong>
                  <span>
                    {new Date(post.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · Version {post.version}
                  </span>
                </div>
                <span className={`admin-status status-${post.status}`}>
                  {post.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button
          variant="outline"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? "Loading…" : "More articles"}
        </Button>
      )}
      {list.isFetchNextPageError && (
        <Notice error>Could not load more articles. Please try again.</Notice>
      )}
    </section>
  );
}
function Editor({ storageConfigured }: { storageConfigured: boolean }) {
  const { id } = useParams();
  const article = useQuery({
    queryKey: ["admin", "post", id],
    queryFn: ({ signal }) =>
      adminRequest(`/posts/${id}`, z.object({ data: adminPost }), { signal }),
    enabled: Boolean(id),
    retry: false,
  });
  if (id && article.isPending) return <Notice>Loading article…</Notice>;
  if (id && article.isError)
    return (
      <>
        <Notice error>{message(article.error)}</Notice>
        <Button variant="outline" onClick={() => void article.refetch()}>
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link to="/admin">Back to articles</Link>
        </Button>
      </>
    );
  return (
    <ArticleEditor
      key={`${id || "new"}:${article.data?.etag || ""}`}
      initial={article.data?.data.data}
      etag={article.data?.etag || undefined}
      storageConfigured={storageConfigured}
    />
  );
}
function ArticleEditor({
  initial,
  etag,
  storageConfigured,
}: {
  initial?: AdminPost;
  etag?: string;
  storageConfigured: boolean;
}) {
  const navigate = useNavigate(),
    cache = useQueryClient();
  const [draft, setDraft] = useState<PostInput>(() =>
    initial
      ? postInput.parse({
          slug: initial.slug,
          title: initial.title,
          excerpt: initial.excerpt,
          bodyMarkdown: initial.bodyMarkdown,
          tags: initial.tags,
          mediaIds: initial.mediaIds,
          coverImageId: initial.coverImageId,
          isDemo: initial.isDemo,
          status: initial.status,
        })
      : emptyPost,
  );
  const [tags, setTags] = useState(
    initial?.tags.map((t) => t.name).join(", ") || "",
  );
  const [media, setMedia] = useState(initial?.media || []);
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [preview, setPreview] = useState(false),
    [history, setHistory] = useState(false),
    [alt, setAlt] = useState("");
  const allowNavigation = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigation.current &&
      (dirty || pending) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  const revisions = useInfiniteQuery({
    queryKey: ["admin", "revisions", initial?.id],
    initialPageParam: undefined as string | undefined,
    enabled: history && Boolean(initial),
    queryFn: async ({ pageParam, signal }) =>
      (
        await adminRequest(
          `/posts/${initial!.id}/revisions?limit=10${pageParam ? `&cursor=${pageParam}` : ""}`,
          revisionList,
          { signal },
        )
      ).data,
    getNextPageParam: (page) => page.pagination.nextCursor || undefined,
    retry: false,
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || pending) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  function change<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setSuccess("");
  }
  async function save() {
    setError("");
    setSuccess("");
    const names = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = postInput.safeParse({
      ...draft,
      tags: names.map((name) => ({
        name,
        slug: name
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      })),
    });
    if (!parsed.success) {
      setError(
        "Check the title, slug, article body, and tags. Use at most 8 tags with letters or numbers.",
      );
      return;
    }
    if (
      new Set(parsed.data.tags.map((t) => t.slug)).size !==
      parsed.data.tags.length
    ) {
      setError("Remove duplicate tags before saving.");
      return;
    }
    setPending(true);
    try {
      const result = await adminRequest(
        initial ? `/posts/${initial.id}` : "/posts",
        z.object({ data: adminPost }),
        { method: initial ? "PUT" : "POST", body: parsed.data, etag },
      );
      setDirty(false);
      // Update authoritative ETag and form content together. Stale saves never overwrite newer edits.
      cache.setQueryData(["admin", "post", result.data.data.id], result);
      await cache.invalidateQueries({ queryKey: ["admin", "posts"] });
      await cache.invalidateQueries({
        queryKey: ["admin", "revisions", result.data.data.id],
      });
      await cache.invalidateQueries({ queryKey: ["writing"] });
      if (!initial) {
        allowNavigation.current = true;
        navigate(`/admin/posts/${result.data.data.id}`, { replace: true });
      }
      setSuccess("Article saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setPending(true);
    setError("");
    try {
      const asset = await uploadImage(file, alt);
      setMedia((items) => [...items, asset]);
      change("mediaIds", [...draft.mediaIds, asset.id]);
      setAlt("");
      setSuccess(
        "Image ready. Insert it into the article or use it as the cover. Save the article to keep the reference.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(false);
    }
  }
  function back() {
    navigate("/admin");
  }
  return (
    <section>
      <div className="admin-toolbar">
        <Button variant="ghost" onClick={back} disabled={pending}>
          <ArrowLeft size={14} />
          Articles
        </Button>
        <div className="admin-actions">
          <span role="status" className="admin-save-status">
            {pending ? "Working…" : dirty ? "Unsaved changes" : "Up to date"}
          </span>
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            disabled={pending || (!dirty && Boolean(initial))}
            onClick={() => void save()}
          >
            <Save size={14} />
            {pending ? "Saving…" : "Save article"}
          </Button>
        </div>
      </div>
      {blocker.state === "blocked" && (
        <div className="admin-notice" role="alert">
          <p>You have unsaved changes. Leave this article?</p>
          <div className="admin-actions">
            <Button variant="outline" onClick={() => blocker.reset()}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => blocker.proceed()}
            >
              Discard changes
            </Button>
          </div>
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      <fieldset disabled={pending} className="admin-fieldset">
        <div className="admin-editor-grid">
          <div className="admin-editor-main">
            <label>
              Title
              <Input
                value={draft.title}
                maxLength={160}
                onChange={(e) => change("title", e.target.value)}
                placeholder="Give your idea a title"
              />
            </label>
            <label>
              Excerpt
              <Textarea
                value={draft.excerpt}
                maxLength={320}
                onChange={(e) => change("excerpt", e.target.value)}
                rows={3}
                placeholder="A short introduction for readers"
              />
            </label>
            {preview ? (
              <div className="admin-preview">
                <h2>{draft.title || "Untitled article"}</h2>
                <ArticleBody markdown={draft.bodyMarkdown} media={media} />
              </div>
            ) : (
              <label>
                Article <span className="admin-hint">Markdown supported</span>
                <Textarea
                  className="admin-markdown"
                  value={draft.bodyMarkdown}
                  onChange={(e) => change("bodyMarkdown", e.target.value)}
                  maxLength={200000}
                  rows={24}
                  placeholder="Start writing…"
                />
              </label>
            )}
          </div>
          <aside className="admin-editor-aside">
            <label>
              URL slug
              <Input
                value={draft.slug}
                maxLength={120}
                onChange={(e) => change("slug", e.target.value)}
                placeholder="my-next-article"
              />
            </label>
            <label>
              Publication status
              <select
                value={draft.status}
                onChange={(e) =>
                  change("status", e.target.value as PostInput["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <p className="admin-hint">
              Published articles are visible to everyone after saving. Archived
              articles are hidden.
            </p>
            <label>
              Tags
              <Input
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  setDirty(true);
                }}
                placeholder="Angular, Interfaces"
              />
              <span className="admin-hint">
                Separate up to 8 tags with commas.
              </span>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.isDemo}
                onChange={(e) => change("isDemo", e.target.checked)}
              />
              Sample article
            </label>
            <div className="admin-upload">
              <h3>Images</h3>
              {storageConfigured ? (
                <>
                  <label>
                    Image description
                    <Input
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      maxLength={250}
                      placeholder="Describe the image"
                    />
                  </label>
                  <label className="admin-file">
                    <Upload size={15} />
                    Choose image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={pending || !alt.trim()}
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="admin-hint">JPEG, PNG or WebP · Up to 5 MiB</p>
                </>
              ) : (
                <p className="admin-hint">
                  Image uploads are awaiting storage configuration.
                </p>
              )}
              {media.map((asset) => (
                <div className="admin-asset" key={asset.id}>
                  <img src={asset.url} alt={asset.alt} />
                  <span>{asset.alt}</span>
                  <div className="admin-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        change(
                          "bodyMarkdown",
                          `${draft.bodyMarkdown}\n\n![${asset.alt.replace(/[\[\]\\]/g, "")}](${asset.url})\n`,
                        )
                      }
                    >
                      Insert
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        change(
                          "coverImageId",
                          draft.coverImageId === asset.id ? null : asset.id,
                        )
                      }
                    >
                      {draft.coverImageId === asset.id
                        ? "Remove cover"
                        : "Use as cover"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </fieldset>
      {initial && (
        <section className="admin-history">
          <Button
            variant="outline"
            onClick={() => setHistory(!history)}
            aria-expanded={history}
          >
            Version history
          </Button>
          {history &&
            (revisions.isPending ? (
              <Notice>Loading revisions…</Notice>
            ) : revisions.isError ? (
              <>
                <Notice error>{message(revisions.error)}</Notice>
                <Button
                  variant="outline"
                  onClick={() => void revisions.refetch()}
                >
                  Try again
                </Button>
              </>
            ) : (
              <>
                <ul>
                  {revisions.data?.pages
                    .flatMap((p) => p.data)
                    .map((revision) => (
                      <li key={revision.version}>
                        <details>
                          <summary>
                            Version {revision.version} ·{" "}
                            {new Date(revision.createdAt).toLocaleString(
                              "en-IN",
                            )}
                          </summary>
                          <p>
                            {String(revision.snapshot.title || "")} ·{" "}
                            {String(revision.snapshot.status || "")}
                          </p>
                          <pre>
                            {String(revision.snapshot.body_markdown || "")}
                          </pre>
                        </details>
                      </li>
                    ))}
                </ul>
                {revisions.hasNextPage && (
                  <Button
                    variant="outline"
                    disabled={revisions.isFetchingNextPage}
                    onClick={() => void revisions.fetchNextPage()}
                  >
                    Older versions
                  </Button>
                )}
              </>
            ))}
        </section>
      )}
    </section>
  );
}
