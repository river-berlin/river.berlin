import { getBlogs, getBookTakeaways, getProjects } from "$lib/server/get-contents";


export async function load(){
    const bookTakeaways = await getBookTakeaways();
    const blogs = await getBlogs();
    const projects = await getProjects();
    return { bookTakeaways, projects, blogs }
}