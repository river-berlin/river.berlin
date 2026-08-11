import showdown from "showdown";
import showdownHighlight from "showdown-highlight";
import { dev } from '$app/environment';
import { getBlogs } from '$lib/server/get-contents';

const imageMap = import.meta.glob('$things/blog/blog-*/**.{svg,jpg,png}', {
  eager: true,  // Always load eagerly for SSR
  import: 'default'
});

// Client-side dynamic image map
const dynamicImageMap = import.meta.glob('$things/blog/blog-*/**.{svg,jpg,png}', {
  eager: false,
  import: 'default'
});

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="code-copy-icon" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

// Splits highlighted <code> inner HTML into one <span class="code-line"> per
// source line, re-opening/closing any hljs <span> that straddles a newline
// (e.g. a multi-line comment or heredoc) so each line stays well-formed HTML.
function numberCodeLines(innerHtml) {
    const tokens = innerHtml.match(/<[^>]+>|[^<]+/g) || [];
    const stack = [];
    const lines = [];
    let current = '';

    const closeOpenTags = () =>
        stack.slice().reverse().map((tag) => {
            const name = tag.match(/^<([a-zA-Z0-9]+)/);
            return name ? `</${name[1]}>` : '';
        }).join('');
    const reopenTags = () => stack.join('');

    for (const token of tokens) {
        if (/^<\/[a-zA-Z0-9]+>$/.test(token)) {
            current += token;
            stack.pop();
        } else if (/^<[a-zA-Z0-9][^>]*\/>$/.test(token)) {
            current += token;
        } else if (/^<[a-zA-Z0-9]/.test(token)) {
            current += token;
            stack.push(token);
        } else {
            const parts = token.split('\n');
            parts.forEach((part, i) => {
                current += part;
                if (i < parts.length - 1) {
                    current += closeOpenTags();
                    lines.push(current);
                    current = reopenTags();
                }
            });
        }
    }
    lines.push(current);

    // a trailing newline in the source produces one empty trailing line
    if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
    }

    return lines.map((line) => `<span class="code-line">${line}</span>`).join('');
}

// Wrap each rendered <pre><code> code block with a numbered header, per-line
// numbering, and a copy-button footer. Safe as a plain regex since
// showdown-highlight HTML-escapes code content, so a literal "</pre>" never
// appears inside a block.
function addCodeBlockChrome(html) {
    let index = 0;
    return html.replace(
        /<pre\b([^>]*)>(<code\b[^>]*>)([\s\S]*?)(<\/code>)<\/pre>/g,
        (_full, preAttrs, codeOpenTag, codeInner, codeCloseTag) => {
            index += 1;
            const numberedCode = numberCodeLines(codeInner);
            const pre = `<pre${preAttrs}>${codeOpenTag}${numberedCode}${codeCloseTag}</pre>`;
            const copyButton = `<button type="button" class="code-copy-btn">${COPY_ICON_SVG}<span class="code-copy-label">Copy</span></button>`;
            return `<div class="code-block"><div class="code-block-header"><span class="code-block-number">Snippet ${index}</span></div>${pre}<div class="code-block-footer">${copyButton}</div></div>`;
        }
    );
}


/**
 * Load function for blog page
 * @param {Object} params.params - Route parameters
 * @param {string} params.params.blogShortUrl - Blog number
 * @returns {Promise<{
 *   blogNum: string,
 *   markdown: string,
 *   markdownHTML: string,
 *   metadata: Object,
 *   codespaceName?: string,
 *   allBlogs: Array
 * }>}
 */


export async function load({ params }) {
    const allBlogs = await getBlogs();
    const blogShortUrl = params.blogShortUrl;
    const blogNum = allBlogs.find(blog => blog.metadata.url === blogShortUrl)?.num;

    const markdown = (await import(`$things/blog/blog-${blogNum}/content.md?raw`)).default;
    
    // Configure showdown converter with syntax highlighting and metadata
    const converter = new showdown.Converter({
        metadata: true,
        extensions: [
            showdownHighlight({pre: true})
        ]
    });
    
    converter.makeHtml(markdown)
    const metadata = converter.getMetadata()

    // Get icon path from metadata and load it
    const iconPath = `/src/things/blog/blog-${blogNum}/${metadata.icon || 'icon.svg'}`;
    const icon = import.meta.env.SSR ? 
        imageMap[iconPath] : 
        await dynamicImageMap[iconPath]();

    // Convert markdown again for the HTML (or reuse previous conversion)
    const markdownHTML = addCodeBlockChrome(converter.makeHtml(markdown))
    
    const returnObj = {
        blogNum, 
        markdown, 
        icon: import.meta.env.SSR ? icon : icon.default,
        markdownHTML, 
        metadata,
        allBlogs
    };

    if (dev) {
        // @ts-ignore
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}