// pen saved at https://codepen.io/thegraything/pen/WNqQmoj
import path from 'path';
import nodeHtmlToImage from 'node-html-to-image';
import {getBlogs, getBookTakeaways, getProjects} from './src/lib/server/get-contents.js'


const style = `
* {
  font-family: Reenie Beanie,cursive;
  font-weight: 400;
  font-style: normal;
  color: #f0f0f0;
}

.main {
  width: 500px;
  height: 250px;
  position : relative;
}

.bottom-thingy{
  position : absolute;
  left : 35px;
  right : 35px;
  bottom : 35px;
  display : flex;
}

.mainimg{
}

.name-and-stuff{
  display: flex;
  align-items : center;
}


.bottom-thingy h1{
  font-size: 20px;
  margin-left : 15px;
  margin-bottom: 0;
  padding: 0;
  margin-top: 0;
}

.content-indicator .type{
  margin-top: 0;
  margin-bottom: 0;
}

.content-indicator .big-text{
  margin-top: 7px;
  margin-bottom: 0;
  width: 270px;
  margin-left: 30px;
  font-family: 'Comic Neue', cursive;
  font-weight: 300;
  font-size: 20px;
}

.type-container img{
  margin-right: 15px;
}

.content-indicator .author{
  font-size: 13px;
  margin-top: 0;
  margin-bottom: 0;
}

.bottom-thingy p{
  margin: 0;
  margin-left : 15px;
}

.content-indicator{
  position: absolute;
  left: 35px;
  top: 35px;
  
  display : flex;
}

.text-stuff{
  margin-left: 0;
}

.type-container {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.type-container img {
  margin-right: 15px;
}

.type-container .type {
  margin-left: 0;
}`

function generateHTML(preImageURL, topShortText, mainText, byText){
return `<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Reenie+Beanie&amp;display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Delius&family=Shadows+Into+Light&display=swap" rel="stylesheet">
  <title>Document</title>
  <style>
   ${style}
   body {
      width: 500px;
      height: 250px;
      margin: 0;
      padding: 0;
      scale: 2;
      transform: translate(25%, 25%);
      background-color:rgb(17 24 39);
      color: #f0f0f0;
    }
    
    .type-container .type,
    .big-text,
    .author,
    .name-and-stuff h1,
    .name-and-stuff p {
      color: #f0f0f0;
    }
    
    .main {
      background-color: rgb(17 24 39);
    }
  </style>
</head>
<body>
  <div class="main">
    
    <div class="content-indicator">
      <div class="text-stuff">
        <div class="type-container">
          <img src="${preImageURL}" alt="" class="scroll" width=15>
          <h4 class="type">${topShortText}</h4>
        </div>
        <h1 class="big-text">${mainText}</h1>
        <p class='author'>${byText} </p>
      </div>
    </div>
    
    <div class="bottom-thingy">
      <img class="mainimg" src="https://river.berlin/_app/immutable/assets/meditating-enby.Ddx2L9rE.svg" alt="" width=40>
      
      <div class="name-and-stuff">
        <h1>· River's blog ·</h1>
        <p>https://river.berlin</p>
      </div>
    </div>
  </div>
</body>
</html>`}


const currentDir = process.cwd();

const bookTakeaways = await getBookTakeaways(false, path.join(currentDir, "/src/things"))
const projects = await getProjects(false)
const blogs = await getBlogs(false, path.join(currentDir, "/src/things"))

function formatDate(dateString) {
  const date = new Date(dateString);
  
  // Array of suffixes for day of the month (1st, 2nd, 3rd, etc.)
  const suffixes = ['ᵗʰ', 'ˢᵗ', 'ⁿᵈ', 'ʳᵈ', 'ᵗʰ', 'ᵗʰ', 'ᵗʰ', 'ᵗʰ', 'ᵗʰ', 'ᵗʰ'];
  
  // Function to get the suffix for the day of the month
  function getSuffix(day) {
      if (day >= 11 && day <= 13) {
          return 'th'; // special case for 11th, 12th, 13th
      }
      return suffixes[day % 10];
  }
  
  // Get day, month, and year
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  
  // Construct the formatted date string
  const formattedDate = `${day}${getSuffix(day)} ${month} ${year}`;
  
  return formattedDate;
}

for(let bookTakeaway of bookTakeaways){
  nodeHtmlToImage({
    output : path.join(currentDir, `/static/opengraph/book-takeaways/${bookTakeaway.num}.png`),
    html : generateHTML("https://river.berlin/scroll.svg", `book take away #${bookTakeaway.num} · ${formatDate(bookTakeaway.metadata.dated)}`, bookTakeaway.metadata.bookTitle, ``)
  })
}

for(let blog of blogs){
  nodeHtmlToImage({
    output : path.join(currentDir, `/static/opengraph/blog/${blog.num}.png`),
    html : generateHTML("https://river.berlin/scroll.svg", `blog #${blog.num} · ${formatDate(blog.metadata.dated)}`, blog.metadata.title, ``)
  })
}

for(let project of projects){
  nodeHtmlToImage({
    output : path.join(currentDir, `/static/opengraph/projects/${project.metadata.shortPath}.png`),
    html : generateHTML("https://river.berlin/fruits/watermelon.svg", `project #${project.num} · ${formatDate(project.metadata.dated)}`, project.metadata.projectTitle, ``)
  })
}
