import showdown from "showdown"
import { dev } from '$app/environment';
import type { Metadata } from 'showdown';

// @ts-ignore
export async function load({ params }) {
    const markdown = (await import(`$things/blog/blog-${params.num}/content.md?raw`)).default;
    
    // convert markdown
    const converter = new showdown.Converter({metadata : true})
    const markdownHTML = converter.makeHtml(markdown)
    const metadata = converter.getMetadata() as Metadata

    // Get icon name from metadata and import it
    const iconPath = metadata.icon || 'icon.svg'
    const icon = (await import(`$things/blog/blog-${params.num}/${iconPath}`)).default;

    const returnObj = {blogNum : params.num, markdown, icon, markdownHTML, metadata};

    if (dev){
        // @ts-ignore
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}