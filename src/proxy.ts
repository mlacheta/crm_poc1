// Chequeo optimista (sólo cookie, sin base): redirige a /login o al home del rol.
// La verificación segura la hace requireUser() en cada página y server action.
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeFor } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // Rutas de ingreso públicas: /login, /login/clinica y los links de cada clínica (/c/<slug>/…).
  // No redirigen por cookie: una cookie válida de un usuario borrado, inactivo o de una clínica suspendida
  // generaría un bucle con requireUser(). Cada página verifica contra la base.
  if (pathname === "/login" || pathname.startsWith("/login/") || pathname.startsWith("/c/")) return NextResponse.next();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (pathname === "/" || !canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
