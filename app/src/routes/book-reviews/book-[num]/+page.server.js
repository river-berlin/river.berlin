// @ts-ignore
export async function load({ params }) {
    const content = (await import(`$things/book-takeaways/book-${params.num}/content.md?raw`)).default;
    const icon = (await import(`$things/book-takeaways/book-${params.num}/icon.svg`)).default;
    return {content:content, icon:icon}
}