// @ts-nocheck
import showdown from "showdown";
import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';
import yaml from "js-yaml";
import { fileURLToPath } from 'url'

async function getMarkdownFiles(thingsPath, markdownOf) {
    let files;

    // Find all matching markdown files
    if (markdownOf == "book-takeaway"){
        files = glob.sync(`${thingsPath}/book-takeaways/book-*/content.md`);
    } else if (markdownOf == "blog"){
        files = glob.sync(`${thingsPath}/blog/blog-*/content.md`);
    }

    // Read the content of each file
    const fileContents = await Promise.all(files.map(async (file) => {
        const content = await fs.readFile(file, 'utf-8');
        return { file, content };
    }));

    const markdowns = {};

    for(let f of fileContents){
        markdowns[f.file] = f.content;
    }


    return markdowns;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export async function getProjects(viteEnvironment=true) {
    let fileContents = [];

    if(!viteEnvironment){
        // Find all matching markdown files
        const projectsPath = path.join(currentDir, `../../routes/projects/*/metadata.yml`);
        const files = glob.sync(projectsPath);
    
        // Read the content of each file
        fileContents = await Promise.all(files.map(async (file) => {
            const content = await fs.readFile(file, 'utf-8');
            return { file, content };
        }));
    } else {
        let metadatas = import.meta.glob("/src/routes/projects/*/metadata.yml", {
            query : "?raw"
        })

        for(let file in metadatas){
            let content = (await (metadatas[file]())).default;
            fileContents.push({file, content });
        }

    }

    const metadata = [];
    
    for(let f of fileContents){
        const info = yaml.load(f.content);
        info.file = f.file;
        info.shortPath = f.file.split('/').at(-2);
        
        metadata.push({metadata : info});
    }
    metadata.sort((info1, info2) => (new Date(info1.metadata.dated) - new Date(info2.metadata.dated)))

    for(let i=0; i<metadata.length; i++){
        metadata[i].num = i + 1
    }

    metadata.reverse()


    return metadata;
}

export async function getBookTakeaways(viteEnvironment=true, thingsPath=null){

    let markdowns;

    if(viteEnvironment){
        markdowns = import.meta.glob("$things/book-takeaways/book-*/content.md", {
            query : "?raw"
        })
    } else {
        markdowns = await getMarkdownFiles(thingsPath, "book-takeaway")
    } 

    const blogs = [];
    
    for (let markdownKey in markdowns){
        const num = Number.parseInt(markdownKey.split('/src/things/book-takeaways/book-')[1].split("/content.md")[0])

        let mdContent;
        if(viteEnvironment){

            mdContent = (await (markdowns[markdownKey]())).default;
        } else {

            mdContent = markdowns[markdownKey]
        }

        const converter = new showdown.Converter({metadata : true})
        const markdownHTML = converter.makeHtml(mdContent)
        const metadata = converter.getMetadata()

        blogs.push({markdownHTML, metadata, num})
    }

    // ensure latest blog comes on top
    blogs.reverse()
    return blogs
}

export async function getBlogs(viteEnvironment=true, thingsPath=null){

    let markdowns;

    if(viteEnvironment){
        markdowns = import.meta.glob("$things/blog/blog-*/content.md", {
            query : "?raw"
        })

    } else {
        markdowns = await getMarkdownFiles(thingsPath, "blog")
    } 

    const blogs = [];
    
    for (let markdownKey in markdowns){
        const num = Number.parseInt(markdownKey.split('/src/things/blog/blog-')[1].split("/content.md")[0])

        let mdContent;
        if(viteEnvironment){

            mdContent = (await (markdowns[markdownKey]())).default;
        } else {

            mdContent = markdowns[markdownKey]
        }

        const converter = new showdown.Converter({metadata : true})
        const markdownHTML = converter.makeHtml(mdContent)
        const metadata = converter.getMetadata()

        blogs.push({markdownHTML, metadata, num})
    }

    // ensure latest blog comes on top
    blogs.reverse()
    return blogs
}