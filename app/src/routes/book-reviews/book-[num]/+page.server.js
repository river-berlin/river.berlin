import { error } from '@sveltejs/kit';

// @ts-ignore
export async function load({ params }) {
    const content = (await import(`$things/book-takeaways/book-${params.num}/content.md?raw`)).default;
    return {content:content}
}