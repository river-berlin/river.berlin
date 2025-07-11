---
shortSummary: The guide to how I hacked into my language learning progress
author: River / Aditya Shankar
dated: 2025-06-06
title: How I hacked into my language learning app to optimize it
icon: icon.jpg
icon_v2: true
iconCredit: Ghariza Mahavira
iconCreditUrl: https://unsplash.com/illustrations/a-line-drawing-of-a-hand-holding-a-baseball-bat-_HMJy1YHvlo
url: how-i-hacked-language-learning-app-reword
---

# How I hacked into my language learning app to optimize it

Okay, so I have been learning German for a while now, and my German learning flashcards app (reword) has had one flaw

<img src="/blog/blog-9/reword_app_word_examples.jpg" alt="reword app word examples" width="200" style="text-align: center; margin: auto;"/>

There aren't enough examples within the app, some words have no examples at all

<img src="/blog/blog-9/reword_app_word_no_examples.jpg" alt="reword app word no examples" width="200" style="text-align: center; margin: auto;"/>

So, now to the app's credit, it does allow you to manually edit the words via the screen

<img src="/blog/blog-9/reword_app_word_edit.jpg" alt="reword app word edit" width="200" style="text-align: center; margin: auto;"/>

However, this process is cumbersome, and I wanted something faster, something that I can programmatically edit and add sentences to

So I thought about the ways I could go on to do this

<br/>
I have 2 ideas here

1. See if the app provides any export mechanism to export the data
2. Create an automation that automatically controls the GUI to edit the words (something that automatically clicks, edits and adds on a loop)

**\#2** seemed hard, so I looked around the application for a little bit

I saw that the app provides an "export data" feature, but it does so in a weird .backup file

So, not sure what I can use to actually edit this, however, I have been doing stuff like this for a while, so I decided to check if it is a JSON file or so

So I exported the data, and opened it up in a text editor

<img src="/blog/blog-9/reword_app_backup.jpg" alt="reword app backup" width="200" style="text-align: center; margin: auto;"/>

## Looking through the backup format

Here's the text content I got from the top of the file

```
SQLite format 3   @    �  �           5                 r                              � .r�
� 6�
�
U�Q�
```

okay, bummer, this isn't a JSON file

but wait, what's that on the top...I think this means that it is an SQLITE database

so I loaded it up via `sqlite3 reword_app_backup.backup`, and voilà, it opened up!


so I looked at the tables in the db

```shell
sqlite> .tables
AUDIO             LOG               WORD              android_metadata
CATEGORY          PICTURE           WORD_AUDIO      
DAILY_GOAL        SETTINGS          WORD_CATEGORY   
```

nice, okay, there is a WORD table, let's look at it, we can do this via the pragma command

```shell
sqlite> pragma table_info(WORD);
0|ID|INTEGER|0||1
1|WORD|TEXT|1||0
2|REG|INTEGER|0|NULL|0
3|PICTURE_ID|INTEGER|0|NULL|0
4|RUS|TEXT|0||0
5|ENG|TEXT|0||0
6|TUR|TEXT|0||0
7|SPA|TEXT|0||0
8|POR|TEXT|0||0
9|ITA|TEXT|0||0
10|FRA|TEXT|0||0
11|UKR|TEXT|0||0
12|EXAMPLES_RUS|TEXT|0||0
13|EXAMPLES_ENG|TEXT|0||0
14|EXAMPLES_TUR|TEXT|0||0
15|EXAMPLES_SPA|TEXT|0||0
...
```

There were a few more columns, but this gives the basic idea of what is in the app

now I brought up 2 words, wherein there were english examples

```shell
sqlite> select ID, WORD, EXAMPLES_ENG from WORD where EXAMPLES_ENG is not null limit 2;
ID|WORD|EXAMPLES_ENG
15|etc. (et cetera)|[{"o":"Wieso fügen Leute so einfache und weitverbreitete Sätze wie \"Hallo!\", \"Wie geht es dir?\" #etc.# hinzu?","t":"Why do people add simple and common sentences such as \"hello\", \"how are you\", #etc.#?"}]
53|alt|[{"o":"Bronislaw ist 18 Jahre #alt#.","t":"Bronisław is eighteen years #old#."},{"o":"Einer neuen Wahrheit ist nichts schädlicher als ein #alter# Irrtum.","t":"A new truth is no less harmful than an #old# falsehood."},{"o":"Mein neuer Klapprechner ist dünner und leichter als mein #alter#.","t":"My new laptop is thinner and lighter than my #old# one."}]
```

## Manually editing sqlite data

nice, okay, so I can now edit the database

It's interesting, cause there is a json inside the sql, but let's try adding one more example manually over here

```shell
sqlite> update WORD set EXAMPLES_ENG = '[{"o":"Wieso fügen Leute so einfache und weitverbreitete Sätze wie \"Hallo!\", \"Wie geht es dir?\" #etc.# hinzu?","t":"Why do people add simple and common sentences such as \"hello\", \"how are you\", #etc.#?"},{"o":"Magst du stationary, wie zum Beispiel Bleistifte, Notizbücher #etc.#?","t":"Do you like #stationery#, such as pencils, notebooks, #etc.#?"}]' where ID = 15;
```
    
Now lets load the file into the app, to see if it loads it up correctly (hopefully there are no integrity checks in place!)

<img src="/blog/blog-9/reword_app_word_with_new_example.jpg" alt="reword app backup with new example" width="200" style="text-align: center; margin: auto;"/>

nice!, this works

now, let's try to do this automatically for all german words in a loop via llms

## Using openai to generate examples

first, I created a simple script in nodejs to loop through all the words, and to ask openai to generate the examples for me automatically

What it essentially does is, it loops through the words to find a word without any example in it

I am using the https://www.npmjs.com/package/sqlite3 package

```js
import sqlite3 from 'sqlite3';

db.serialize(() => {
    db.each("SELECT * FROM WORD where EXAMPLES_ENG is null", (err, row) => {
        ...
    });
});
```

then it asks openai to generate the examples for me automatically

```js
import OpenAI from 'openai';
import z from 'zod';
import { zodFunction } from 'openai/helpers/zod';
import { zodTextFormat } from "openai/helpers/zod";

const zodExamples = z.object({
  examples: z.array(z.object({
    o: z.string(),
    t: z.string(),
  })),
});

async function createExamples(word){
    const response = await openai.responses.parse ({
        model: 'gpt-4.1',
        input: [
            {
                "role": "system",
                "content": "You are a helpful language learning assistant. Only use the schema for creating examples for german words",
            },
            { "role": "user", "content": `Create 5 examples for the German word '${word}'. For each example, 'o' should be the original German sentence with the target word wrapped in #hashtags#, and 't' should be the English translation with the corresponding English word also wrapped in #hashtags#.` },
        ],
        text: {
            format: zodTextFormat(zodExamples, 'examples')
        },
    });

    return response.output_parsed.examples;
}
```

then it updates the database with the new examples

```js
const examplesJson = JSON.stringify(examples);
db.run("UPDATE WORD SET EXAMPLES_ENG = ? WHERE ID = ?", [examplesJson, id], function(err) {
  if (err) {
    reject(err);
    return;
  }
  resolve(this.changes);
});
```

## Testing it out

now, let's run it for 50 different examples and see if everything is getting updated

```shell
> node add_examples.js --limit 50
Adding example for "beispiel" (1/50)
Added 5 sentences for "beispiel"
- original : Zum #Beispiel#, wir haben ein Schokoladeneis.
  translation : For #example#, we have a chocolate ice cream.
- original : Dieses #Beispiel# zeigt, wie man die Aufgabe lösen kann.
  translation : This #example# shows how to solve the task.
- original : Kannst du mir ein gutes #Beispiel# geben?
  translation : Can you give me a good #example#?
- original : Das ist ein perfektes #Beispiel# für diese Situation.
  translation : That is a perfect #example# for this situation.
- original : Ich verstehe das Konzept nicht, gib mir bitte ein #Beispiel#.
  translation : I don't understand the concept, please give me an #example#.

Adding example for ...
```

## Finally, modifying everything

okay, so it works, let's run it for all words

```shell
> node add_examples.js
Found 6655 words without examples
Adding example for "beispiel" (1/6655)
Added 5 sentences for "beispiel"
- original : Zum #Beispiel#, wir haben ein Schokoladeneis.
  translation : For #example#, we have a chocolate ice cream.
- original : Dieses #Beispiel# zeigt, wie man die Aufgabe lösen kann.
  translation : This #example# shows how to solve the task.
- original : Kannst du mir ein gutes #Beispiel# geben?
  translation : Can you give me a good #example#?
- original : Das ist ein perfektes #Beispiel# für diese Situation.
  translation : That is a perfect #example# for this situation.
- original : Ich verstehe das Konzept nicht, gib mir bitte ein #Beispiel#.
  translation : I don't understand the concept, please give me an #example#.

Adding example for "feucht" (2/6655)
Added 5 sentences for "feucht"
- original : Der Boden war nach dem Regen sehr #feucht#.
  translation : The floor was very #wet# after the rain.
- original : Ich habe ein #feuchtes# Handtuch benutzt.
  translation : I used a #wet# towel.
- original : Die Luft in Wald ist oft #feucht#.
  translation : The air in the forest is often #moist#.
- original : Bitte stelle die Pflanzen an einen #feuchten# Ort.
  translation : Please place the plants in a #moist# place.
- original : Der Hund kam mit #feuchtem# Fell nach Hause.
  translation : The dog came home with #wet# fur.
...
```

<img src="/blog/blog-9/reword_app_word_examples_1.jpg" alt="reword app word with examples 1" width="200" style="text-align: center; margin: auto;"/>

and tada!, that worked!, now all the words in the app have examples!
