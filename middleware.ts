import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { getOrCreateProfile } from '@/lib/database-service-v2';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  // Always run for API routes
  '/(api|trpc)(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Check if user is authenticated
  const { userId } = await auth();

  // If user is authenticated and accessing a protected route, ensure they have a profile
  if (userId && isProtectedRoute(req)) {
    try {
      console.log(`[Middleware] Ensuring profile exists for user: ${userId}`);
      await getOrCreateProfile(userId);
      console.log(`[Middleware] Profile verified/created for user: ${userId}`);
    } catch (error) {
      console.error(`[Middleware] Failed to create profile for user ${userId}:`, error);
      // Don't block the request, just log the error
      // The user can still access the app, but direct messaging might not work
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
