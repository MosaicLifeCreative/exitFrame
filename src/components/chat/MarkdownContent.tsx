"use client";

import React from "react";

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={i} className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-3 mb-1">{formatInline(line.slice(4))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-semibold mt-3 mb-1">{formatInline(line.slice(3))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-bold mt-3 mb-1">{formatInline(line.slice(2))}</h2>);
      i++;
      continue;
    }

    // List items
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-muted-foreground shrink-0">{num}.</span>
          <span>{formatInline(text)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{formatInline(line)}</p>);
    i++;
  }

  return <div className="text-sm leading-relaxed space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(processEmphasis(codeMatch[1], key++));
      parts.push(
        <code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    parts.push(processEmphasis(remaining, key++));
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function processEmphasis(text: string, key: number): React.ReactNode {
  const boldParts = text.split(/\*\*(.*?)\*\*/g);
  if (boldParts.length > 1) {
    return (
      <span key={key}>
        {boldParts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i}>{part}</strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }

  return <span key={key}>{text}</span>;
}
