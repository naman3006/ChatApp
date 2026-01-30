import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkDirective from 'remark-directive';
import remarkBreaks from 'remark-breaks'; // Limit: Imported new plugin
import { visit } from 'unist-util-visit';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';

// Custom plugin for Admonitions (:::note, :::tip, etc.)
const remarkAdmonitions = () => {
    return (tree) => {
        visit(tree, (node) => {
            if (
                node.type === 'containerDirective' ||
                node.type === 'leafDirective' ||
                node.type === 'textDirective'
            ) {
                const data = node.data || (node.data = {});
                const tagName = node.name;

                if (['note', 'tip', 'warning', 'danger'].includes(tagName)) {
                    data.hName = 'div';
                    data.hProperties = {
                        className: `admonition admonition-${tagName}`,
                    };
                }
            }
        });
    };
};

const MarkdownRenderer = ({ content, mentions, authUser }) => {
    // Pre-process content to convert mentions to links, avoiding code blocks
    const processedContent = useMemo(() => {
        if (!content) return "";
        if (!mentions || mentions.length === 0) return content;

        // Split by code blocks (inline `...` or multiline ```...```)
        // We strictly match pairs of backticks.
        const parts = content.split(/(`[^`]+`|```[\s\S]+?```)/g);

        return parts.map(part => {
            // If it looks like a code block/inline code (starts with `), don't touch it
            if (part.startsWith('`')) return part;

            let newPart = part;
            mentions.forEach(user => {
                const username = user.username;
                if (!username) return;
                // Escape helper (simple version)
                const escapedName = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`@${escapedName}\\b`, 'g');
                newPart = newPart.replace(regex, `[@${username}](mention://${username})`);
            });
            return newPart;
        }).join('');
    }, [content, mentions]);

    const components = {
        a: ({ href, children, ...props }) => {
            if (href && href.startsWith('mention://')) {
                const username = href.replace('mention://', '');
                const isMe = authUser?.username === username;

                return (
                    <span className={`font-semibold rounded px-0.5 transition-colors ${isMe ? "bg-yellow-500/30 text-yellow-200 ring-1 ring-yellow-500/50" : "text-violet-300 hover:underline cursor-pointer"}`}>
                        {children}
                    </span>
                );
            }

            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                    {...props}
                >
                    {children}
                </a>
            );
        },
        code: ({ node, inline, className, children, ...props }) => {
            // Fix: Removed unused 'match' variable
            return !inline ? (
                <div className="relative group/code my-2">
                    <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                        {/* Copy button could go here */}
                    </div>
                    <code className={`${className} block bg-[#1e1e24] p-3 rounded-lg text-sm overflow-x-auto border border-gray-700/50`} {...props}>
                        {children}
                    </code>
                </div>
            ) : (
                <code className="bg-gray-800/80 text-red-300 px-1 py-0.5 rounded text-sm font-mono border border-gray-700/50" {...props}>
                    {children}
                </code>
            )
        },
        ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-500/50 pl-3 my-2 italic text-gray-400 bg-gray-800/20 py-1 rounded-r">{children}</blockquote>,
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        // Using inline-block or just handling rendering carefully because existing MessageBubble wraps in <p> sometimes? 
        // Actually MessageBubble wraps content in a <p> tag already. 
        // Nested <p> is invalid HTML.
        // We should probably remove the parent <p> in MessageBubble and let MarkdownRenderer handle it, 
        // OR set MarkdownRenderer to not wrap in <p> if possible (unwrapDisallowed).
        // Or just make `p` render as `span` or `div`?
        // Let's use `div` or `span` for `p` if we are inside a bubble that is already a container.
        // However, for multiline markdown paragraphs, we DO want separation.
        // In MessageBubble, the container is a `div` mostly?
        // Let's check MessageBubble.js again.
        // Line 255: <p className="..."> ... </p>
        // So we are inside a <p>. We CANNOT render <div>, <ul>, <pre> etc. inside a <p>.
        // This is a crucial detail.
        // **Plan Change**: We must change the parent in MessageBubble from <p> to <div>.
    };

    return (
        <div className="markdown-content prose prose-sm prose-invert max-w-none break-words prose-p:my-1 prose-pre:bg-[#1e1e24] prose-pre:border prose-pre:border-gray-700/50">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath, remarkEmoji, remarkDirective, remarkAdmonitions, remarkBreaks]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
