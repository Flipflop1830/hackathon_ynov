import { NextResponse, type NextRequest } from "next/server";

import { decrypt } from "@/lib/jwt";

// "Proxy" = ex-middleware (renommé dans Next.js 16). Vérification optimiste de
// session pour rediriger ; la sécurité réelle est faite côté route/serveur (DAL).
const PUBLIC_ROUTES = ["/login", "/register"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const token = req.cookies.get("session")?.value;
  const session = await decrypt(token);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Ne pas exécuter sur les API, les assets Next et les fichiers statiques.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
