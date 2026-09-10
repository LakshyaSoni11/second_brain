import React from "react";
import ReactMarkdown from "react-markdown";

export const MarkdownBlock: React.FC<{ content: string; compact?: boolean }> = ({ content, compact }) => {
  return (
    <div className={`markdown-body text-sm leading-relaxed break-words ${compact ? "line-clamp-4" : ""}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-text font-medium hover:underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="text-[0.85em] bg-surface border border-border rounded px-1 py-0.5 text-text-muted">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-surface border border-border rounded-xl p-2.5 overflow-x-auto text-xs my-2">{children}</pre>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold my-2 text-text">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-2 text-text">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1.5 text-text">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border-strong pl-2 my-1.5 text-text-muted italic">{children}</blockquote>
          ),
          strong: ({ children }) => <strong className="text-text font-semibold">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const looksLikeMarkdown = (text: string): boolean =>
  /#{1,3}\s|\*\*|__|`|^\s*[-*]\s|^\s*\d+\.\s|\[.*\]\(.*\)|<[a-z].*>/m.test(text);

export const MarkdownOrPlain: React.FC<{ text: string; compact?: boolean }> = ({ text, compact }) => {
  const isMd = looksLikeMarkdown(text);
  if (!isMd) {
    return <p className={`text-sm text-text-muted leading-relaxed break-words whitespace-pre-wrap ${compact ? "line-clamp-4" : ""}`}>{text}</p>;
  }
  return <MarkdownBlock content={text} compact={compact} />;
};
