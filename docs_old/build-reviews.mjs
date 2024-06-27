import showdown from 'showdown';
import fs from 'fs';


const converter     = new showdown.Converter();
const htmlTemplate = fs.readFileSync("./book-reviews/book-1-template.html", 'utf8')
const markdown      = fs.readFileSync("./book-reviews-markdown/1-The-Happiness-Hypothesis-Jon-Heidt.md", 'utf8')
const html          = htmlTemplate.replace("{MARKDOWN}", converter.makeHtml(markdown));

fs.writeFileSync("./book-reviews/book-1.html", html, 'utf8');