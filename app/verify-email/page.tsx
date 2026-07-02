'use client';
import { PublicRoute } from '@/components/auth/RouteGuards';
import { VerifyEmailPage } from '@/views/AuthPages';
export default function Page() {
  return (<PublicRoute><VerifyEmailPage /></PublicRoute>);
}
