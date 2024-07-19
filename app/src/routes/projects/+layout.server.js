// @ts-nocheck
import { getProjects } from "$lib/server/get-contents";
import { dev } from '$app/environment';
import { page } from '$app/stores';


export async function load({route}){
    const currPath = route.id.split('/').at(-1);
    const projects = await getProjects()
    const project = (await projects).find(el => el.metadata.shortPath == currPath);

    const returnObj = {project};

    if(dev){
        returnObj.codespaceName = process.env.CODESPACE_NAME;
    }

    return returnObj;
}