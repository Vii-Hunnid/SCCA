'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/store';

export default function ChatByIdPage() {
  const params = useParams();
  const router = useRouter();
  const { setActiveConversationId } = useChatStore();

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      setActiveConversationId(id);
      router.replace('/dashboard');
    }
  }, [params.id, setActiveConversationId, router]);

  return null;
}
