import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LandingPage } from '@/components/landing-page';

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect('/dashboard');
    }
  } catch {
    // Database not connected - show landing page
  }

  return <LandingPage />;
}
