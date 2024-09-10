import { getBlogs, getProjects } from "$lib/server/get-contents";


export async function load(){
    const blogs = await getBlogs();
    const projects = await getProjects();
    return { blogs, projects }
}