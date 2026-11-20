import 'react';

declare module 'react' {
  interface ViewTransitionProps {
    children?: React.ReactNode;
    name?: string;
    enter?: string | Record<string, string>;
    exit?: string | Record<string, string>;
    update?: string | Record<string, string>;
    share?: string | Record<string, string>;
    default?: 'auto' | 'none' | string;
  }

  export const ViewTransition: React.FC<ViewTransitionProps>;
  export function addTransitionType(type: string): void;
}
