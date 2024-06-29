import showdown from "showdown"

// @ts-ignore
export async function load({ params }) {
    const markdown = (await import(`$things/book-takeaways/book-${params.num}/content.md?raw`)).default;
    const icon = (await import(`$things/book-takeaways/book-${params.num}/icon.svg`)).default;

    // convert markdown
    const converter = new showdown.Converter({metadata : true})
    const markdownHTML = converter.makeHtml(markdown)
    const metadata = converter.getMetadata()

    return {markdown, icon, markdownHTML, metadata}
}