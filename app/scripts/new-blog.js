#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";

// blog directory
const blogDir = path.resolve("../blog");

// helper to ask user input with defaults
function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const q = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  // ensure blogDir exists
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
  }

  // find existing blog-[n] folders
  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  const blogNumbers = entries
    .filter((e) => e.isDirectory() && /^blog-\d+$/.test(e.name))
    .map((e) => parseInt(e.name.replace("blog-", ""), 10));

  const nextNum = blogNumbers.length ? Math.max(...blogNumbers) + 1 : 1;
  const newBlogDir = path.join(blogDir, `blog-${nextNum}`);

  // create the new folder
  fs.mkdirSync(newBlogDir);

  // defaults
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // prompt user
  const shortSummary = await ask("Short summary of the article");
  const author = await ask("Author", "River / Aditya Shankar");
  const dated = await ask("Date", today);
  const title = await ask("Title of the article");
  const icon = await ask("Icon", "icon.jpg");
  const iconUrl = await ask("Icon URL");
  const iconCredit = await ask("Icon author");
  let urlDefault =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = await ask("URL of the article", urlDefault);
  const hidden = await ask("Hidden?", "false");

  // build markdown header
  const header = `---
shortSummary: ${shortSummary}
author: ${author}
dated: ${dated}
title: ${title}
icon: ${icon}
icon_v2: true
iconCredit: ${iconCredit}
iconCreditUrl: ${iconUrl}
url: ${url}
hidden: ${hidden}
---`;

  // write to content.md
  const filePath = path.join(newBlogDir, "content.md");
  fs.writeFileSync(filePath, header + "\n\n");

  console.log(`Created ${filePath}`);
}

main();
