'use client';

import { SessionProvider as Provider } from 'next-auth/react';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function SessionProvider({ children }: Props) {
  return <Provider>{children}</Provider>;
}
