import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apenas proteger rotas /admin/*
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Permitir acesso à página de login e accept-invite sem autenticação
    if (request.nextUrl.pathname === '/admin/login' || request.nextUrl.pathname === '/admin/accept-invite') {
      return response;
    }

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              request.cookies.set({
                name,
                value,
                ...options,
              });
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set({
                name,
                value,
                ...options,
              });
            },
            remove(name: string, options: any) {
              request.cookies.set({
                name,
                value: '',
                ...options,
              });
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set({
                name,
                value: '',
                ...options,
              });
            },
          },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Se não está autenticado, redirecionar para login
      if (!user) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Verificar se usuário está na tabela admin_users e está ativo
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (!adminUser) {
        // Usuário autenticado mas não é admin ou está inativo
        return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
      }

      // Atualizar last_login_at
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminUser.id);

    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/admin/login?error=auth_error', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
