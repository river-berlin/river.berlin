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
    const markdownHTML = converter.makeHtml(markdown)
    
    const returnObj = {
        blogNum: params.num, 
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