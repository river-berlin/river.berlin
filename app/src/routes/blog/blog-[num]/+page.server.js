import showdown from "showdown"
import { dev } from '$app/environment';

const imageMap = import.meta.glob('$things/blog/blog-*/**.{svg,jpg,png}', {
  eager: true,  // Always load eagerly for SSR
  import: 'default'
});

// Client-side dynamic image map
const dynamicImageMap = import.meta.glob('$things/blog/blog-*/**.{svg,jpg,png}', {
  eager: false,
  import: 'default'
});

console.log(imageMap)


/**
 * Load function for blog page
 * @param {Object} params - Route parameters
 * @param {string} params.num - Blog number
 * @returns {Promise<{
 *   blogNum: string,
 *   markdown: string,
 *   icon: string,
 *   markdownHTML: string,
 *   metadata: Object,
 *   codespaceName?: string
 * }>}
 */
export async function load({ params }) {
    const markdown = (await import(`$things/blog/blog-${params.num}/content.md?raw`)).default;
    
    // convert markdown first to get metadata
    const converter = new showdown.Converter({metadata: true})
    converter.makeHtml(markdown)
    const metadata = converter.getMetadata()

    // Get icon path from metadata and load it
    const iconPath = `/src/things/blog/blog-${params.num}/${metadata.icon || 'icon.svg'}`;
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
        metadata
    };

    if (dev) {
        // @ts-ignore
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}