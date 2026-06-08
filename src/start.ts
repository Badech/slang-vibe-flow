import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// NOTE on Clerk middleware:
//
// `@clerk/tanstack-react-start/server` exports a `clerkMiddleware()` that
// must be added here for `auth()` to read the request context. We're
// intentionally NOT importing it at module scope so the app boots in dev
// without `CLERK_SECRET_KEY`. When you set up Clerk locally, wire it like:
//
//   import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
//   export const startInstance = createStart(() => ({
//     requestMiddleware: [errorMiddleware, clerkMiddleware()],
//   }));
//
// Until then `auth()` in `src/lib/auth.server.ts` returns anonymous and the
// API routes that require sign-in respond 401 — which is the correct
// behaviour for a server with no Clerk credentials.

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
