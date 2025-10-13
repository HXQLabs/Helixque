import React from 'react';
import LinkifyIt from 'linkify-it';

const linkify = new LinkifyIt();

// Define types
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface Message {
  text: string;
  linkPreview?: LinkPreview;
  userId?: string;
  createdAt?: number;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { text, linkPreview } = message;

  const renderTextWithLinks = (s: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches = linkify.match(s) || [];
    if (matches.length === 0) return <span>{s}</span>;

    matches.forEach((m, idx) => {
      const start = m.index;
      const end = m.lastIndex;
      if (start > lastIndex) parts.push(<span key={`t-${idx}`}>{s.slice(lastIndex, start)}</span>);
      parts.push(
        <a key={`a-${idx}`} href={m.url} target="_blank" rel="noopener noreferrer" className="underline">
          {m.raw}
        </a>
      );
      lastIndex = end;
    });

    if (lastIndex < s.length) parts.push(<span key="tail">{s.slice(lastIndex)}</span>);
    return <>{parts}</>;
  };

  // Safe URL validation
  const isValidHttpUrl = (str?: string) => {
    if (!str) return false;
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return null;
    }
  };

  return (
    <div className="p-2">
      <div className="text-sm break-words">{renderTextWithLinks(text)}</div>

      {linkPreview && isValidHttpUrl(linkPreview.url) && (
        <a
          href={linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 no-underline"
        >
          <div className="flex border rounded overflow-hidden max-w-md">
            {isValidHttpUrl(linkPreview.image) ? (
              <img
                src={linkPreview.image}
                alt={linkPreview.title || 'preview'}
                className="w-24 h-24 object-cover"
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center bg-gray-100">🔗</div>
            )}
            <div className="p-2 flex-1">
              <div className="font-medium text-sm">
                {linkPreview.title ? linkPreview.title : encodeURI(linkPreview.url)}
              </div>
              {linkPreview.description && (
                <div className="text-xs mt-1 text-gray-600">{linkPreview.description}</div>
              )}
              {getHostname(linkPreview.url) && (
                <div className="text-xs mt-2 text-gray-400">{getHostname(linkPreview.url)}</div>
              )}
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
