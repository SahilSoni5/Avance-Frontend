'use client';
import { PublicRoute } from '@/components/auth/RouteGuards';
import { ResetPasswordPage } from '@/views/AuthPages';
export default function Page() {
  return (<PublicRoute><ResetPasswordPage /></PublicRoute>);
}
