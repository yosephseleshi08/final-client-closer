import React, { useState } from 'react';
import { ExternalLink, Check, Mail } from 'lucide-react';
import { getPlatformLink } from '../utils/channelStorage';

interface TestLinkButtonProps {
  url?: string;
  lead?: any;
  platform?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export const TestLinkButton: React.FC<TestLinkButtonProps> = ({
  url,
  lead,
  platform,
  label,
  className = '',
  size = 'xs',
}) => {
  const [tested, setTested] = useState(false);

  const resolvedPlatform = platform || lead?.platform || lead?.channel || '';
  const resolvedHref = getPlatformLink(url || lead, resolvedPlatform);

  if (!resolvedHref) return null;

  const isMail = resolvedHref.startsWith('mailto:');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTested(true);
    setTimeout(() => setTested(false), 2200);

    if (isMail) {
      window.location.href = resolvedHref;
    } else {
      window.open(resolvedHref, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95 shadow-sm shrink-0 ${
        tested
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-950/30'
          : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/50'
      } ${
        size === 'xs'
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-1 text-xs'
      } ${className}`}
      title={isMail ? `Test Email: Open ${resolvedHref}` : `Test Link: Open ${resolvedHref} in new tab`}
      aria-label="Test lead profile link"
    >
      {tested ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Opened</span>
        </>
      ) : isMail ? (
        <>
          <Mail className="w-3 h-3 text-indigo-400" />
          <span>Test Link</span>
        </>
      ) : (
        <>
          <ExternalLink className="w-3 h-3 text-indigo-400" />
          <span>Test Link</span>
        </>
      )}
    </button>
  );
};
