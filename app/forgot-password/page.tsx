'use client';
import { PublicRoute } from '@/components/auth/RouteGuards';
import { ForgotPasswordPage } from '@/views/AuthPages';
export default function Page() {
  return (<PublicRoute><ForgotPasswordPage /></PublicRoute>);
}
