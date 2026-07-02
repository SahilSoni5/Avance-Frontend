'use client';
import { PublicRoute } from '@/components/auth/RouteGuards';
import { LoginPage } from '@/views/LoginPage';
export default function Page() {
  return (<PublicRoute><LoginPage /></PublicRoute>);
}
