import showdown from "showdown"
import { dev } from '$app/environment';

// @ts-ignore
const imageMap = import.meta.glob('$things/book-takeaways/book-*/icon.{svg,jpg,png}', {
    eager: import.meta.env.SSR,  // eager loading only during SSR/static builds
    import: 'default'
});

// @ts-ignore
export async function load({ params }) {
    const markdown = (await import(`$things/book-takeaways/book-${params.num}/content.md?raw`)).default;
    
    // convert markdown first to get metadata
    const converter = new showdown.Converter({metadata: true})
    converter.makeHtml(markdown)
    const metadata = converter.getMetadata()

    // Updated image loading logic
    const iconPath = `/src/things/book-takeaways/book-${params.num}/${metadata.icon}`;
    const icon = import.meta.env.SSR ? 
        imageMap[iconPath] : 
        await imageMap[iconPath]();

    // Convert markdown again for the HTML (or reuse previous conversion)
    const markdownHTML = converter.makeHtml(markdown)

    const returnObj = {
        blogNum: params.num, 
        markdown, 
        icon: import.meta.env.SSR ? icon : icon.default,
        markdownHTML, 
        metadata
    };

    if (dev){
        // @ts-ignore
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}