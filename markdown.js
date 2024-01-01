const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Function to convert Markdown to HTML
function convertMarkdownToHTML(markdown) {
  return marked.marked(markdown);
}

// Function to read a Markdown file, convert it to HTML, and save as an HTML file
function processMarkdownFile(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf8');
  const html = convertMarkdownToHTML(markdown);

  const htmlFilePath = filePath.replace('.md', '.html');
  fs.writeFileSync(htmlFilePath, html, 'utf8');

  console.log(`Converted: ${filePath} => ${htmlFilePath}`);
}

// Function to process all Markdown files in a folder
function processMarkdownFiles(folderPath) {
  fs.readdirSync(folderPath).forEach(file => {
    const filePath = path.join(folderPath, file);
    if (path.extname(file) === '.md') {
      processMarkdownFile(filePath);
    }
  });
}

// Specify the folder containing Markdown files
const markdownFolder = './pages';

// Run the conversion process
processMarkdownFiles(markdownFolder);
