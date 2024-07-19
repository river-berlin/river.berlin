import showdown from "showdown"
import { dev } from '$app/environment';

// @ts-ignore
export async function load({ params }) {
    const markdown = (await import(`$things/book-takeaways/book-${params.num}/content.md?raw`)).default;
    const icon = (await import(`$things/book-takeaways/book-${params.num}/icon.svg`)).default;

    // convert markdown
    const converter = new showdown.Converter({metadata : true})
    const markdownHTML = converter.makeHtml(markdown)
    const metadata = converter.getMetadata()

    const returnObj = {blogNum : params.num,markdown, icon, markdownHTML, metadata};

    if (dev){
        // @ts-ignore
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}