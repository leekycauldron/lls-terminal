import type { ReactNode } from 'react';
import './terminal.css';

interface TerminalLayoutProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function TerminalLayout({ header, children, footer }: TerminalLayoutProps) {
  return (
    <div className="terminal-layout scanlines crt-vignette">
      <div className="terminal-frame">
        {header}
        <div className="terminal-content">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
