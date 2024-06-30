import fs from "node:fs/promises"
import showdown from "showdown";


export async function load(){
    const markdowns = import.meta.glob("$things/book-takeaways/book-*/content.md", {
        query : "?raw"
    })

    const mdPaths = [];
    const blogs = [];
    
    for (let markdownKey in markdowns){
        mdPaths.push(markdownKey)
        const num = Number.parseInt(markdownKey.split('/src/things/book-takeaways/book-')[1].split("/content.md")[0])

        // @ts-ignore
        const mdContent = (await (markdowns[markdownKey]())).default;

        const converter = new showdown.Converter({metadata : true})
        const markdownHTML = converter.makeHtml(mdContent)
        const metadata = converter.getMetadata()

        blogs.push({markdownHTML, metadata, num})
    }

    // ensure latest blog comes on top

    blogs.reverse()

    return { blogs }
}