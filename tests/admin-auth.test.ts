import { describe, expect, it } from 'vitest';
import { isSignInCallback } from '../src/features/admin/auth';
describe('OIDC callback routing', () => {
  it('recognizes static-host directory redirects without treating unrelated paths as callbacks', () => {
    expect(isSignInCallback('/admin/callback')).toBe(true);
    expect(isSignInCallback('/admin/callback/')).toBe(true);
    expect(isSignInCallback('/admin/')).toBe(false);
    expect(isSignInCallback('/admin/callback/another')).toBe(false);
  });
});
