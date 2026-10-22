import { error } from '@sveltejs/kit';
import { load as loadBlog } from '../../../blog/[blogShortUrl]/+page.server.js';

export async function load(event) {
    const data = await loadBlog(event);
    if (!data.german) error(404, 'German version not available');
    return { ...data, language: 'de' };
}
