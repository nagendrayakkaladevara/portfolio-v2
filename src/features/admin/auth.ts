import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
} from "oidc-client-ts";

let manager: UserManager | undefined;
export function ownerAuth() {
  if (manager) return manager;
  const authority = import.meta.env.VITE_OIDC_AUTHORITY;
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
  if (!authority || !clientId) return undefined;
  if (new URL(authority).protocol !== "https:")
    throw new Error("Owner sign-in requires an HTTPS identity provider.");
  manager = new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/admin/callback`,
    post_logout_redirect_uri: `${window.location.origin}/admin`,
    response_type: "code",
    scope: import.meta.env.VITE_OIDC_SCOPE || "openid profile",
    // PKCE/state survive the redirect. Access and ID tokens stay in memory.
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    automaticSilentRenew: false,
    loadUserInfo: false,
    requestTimeoutInSeconds: 15,
    ...(import.meta.env.VITE_OIDC_AUDIENCE
      ? { extraQueryParams: { audience: import.meta.env.VITE_OIDC_AUDIENCE } }
      : {}),
  });
  return manager;
}
let callback: ReturnType<UserManager["signinRedirectCallback"]> | undefined;
// StrictMode can mount twice; consume a one-time authorization code only once.
export function finishSignIn() {
  const auth = ownerAuth();
  if (!auth) throw new Error("Owner sign-in has not been configured.");
  return (callback ??= auth.signinRedirectCallback());
}
export async function ownerToken() {
  const user = await ownerAuth()?.getUser();
  if (!user || user.expired)
    throw new Error("Your session expired. Sign in again to continue.");
  return user.access_token;
}

export const isSignInCallback = (pathname: string) => pathname.replace(/\/+$/, "") === "/admin/callback";
