import { getBlogs, getBookTakeaways, getProjects } from "$lib/server/get-contents";


export async function load(){
    const bookTakeaways = await getBookTakeaways();
    const allBlogs = await getBlogs();
    // showdown metadata values are strings, so "false" must not count as hidden
    const blogs = allBlogs.filter(blog => blog.metadata.hidden !== "true" && blog.metadata.hidden !== true);
    blogs.sort((a, b) => b.num - a.num);
    const allProjects = await getProjects();
    // showdown/yaml metadata values can come through as strings, so "false" must not count as hidden
    const projects = allProjects.filter(project => project.metadata.hidden !== "true" && project.metadata.hidden !== true);
    return { bookTakeaways, projects, blogs }
}