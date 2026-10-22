import { getBlogs, getBookTakeaways, getProjects } from "$lib/server/get-contents";
import showdown from 'showdown';

const germanArticles = import.meta.glob('$things/blog/blog-*/content_de.md', {
    query: '?raw',
    import: 'default'
});


export async function load(){
    const bookTakeaways = await getBookTakeaways();
    const allBlogs = await getBlogs();
    // showdown metadata values are strings, so "false" must not count as hidden
    const blogs = allBlogs.filter(blog => blog.metadata.hidden !== "true" && blog.metadata.hidden !== true);
    for (const blog of blogs) {
        const german = germanArticles[`/src/things/blog/blog-${blog.num}/content_de.md`];
        if (!german) continue;
        const converter = new showdown.Converter({ metadata: true });
        converter.makeHtml(/** @type {string} */ (await german()));
        blog.germanTitle = blog.metadata.title_de || /** @type {Record<string, string>} */ (converter.getMetadata()).title || null;
    }
    blogs.sort((a, b) => b.num - a.num);
    const allProjects = await getProjects();
    // showdown/yaml metadata values can come through as strings, so "false" must not count as hidden
    const projects = allProjects.filter(project => project.metadata.hidden !== "true" && project.metadata.hidden !== true);
    return { bookTakeaways, projects, blogs }
}
