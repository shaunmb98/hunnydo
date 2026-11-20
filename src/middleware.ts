import { NextResponse, type NextRequest } from "next/server";

// One service, two front doors:
//   doithunny.com      -> the public landing page only
//   app.doithunny.com  -> sign-in and everything behind it
// Any other host (localhost, the Cloud Run address) serves both and is left alone.
const APEX = "doithunny.com";
const APP = `app.${APEX}`;

export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const { pathname, search } = req.nextUrl;

  // www is just the apex.
  if (host === `www.${APEX}`) return NextResponse.redirect(`https://${APEX}${pathname}${search}`, 308);

  // The marketing site has one page. Everything else belongs to the app.
  if (host === APEX && pathname !== "/") return NextResponse.redirect(`https://${APP}${pathname}${search}`, 307);

  // The app has no marketing page. Its front door is the dashboard, which sends signed-out visitors to sign in.
  if (host === APP && pathname === "/") return NextResponse.redirect(`https://${APP}/home`, 307);

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and static files.
  matcher: ["/((?!_next/|api/|samples/|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
