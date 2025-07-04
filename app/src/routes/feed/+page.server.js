import { getBlogs, getBookTakeaways, getProjects } from "$lib/server/get-contents";


export async function load(){
    const bookTakeaways = await getBookTakeaways();
    const allBlogs = await getBlogs();
    const blogs = allBlogs.filter(blog => !blog.metadata.hidden);
    blogs.sort((a, b) => b.num - a.num);
    const projects = await getProjects();
    return { bookTakeaways, projects, blogs }
}