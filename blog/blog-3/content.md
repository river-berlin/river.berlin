---
shortSummary: Ignore the hype – AI still has no moat
author: River / Aditya Shankar
dated: 2025-05-23
title: Ignore the hype – AI still has no moat
icon: icon.jpg
---

## Ignore the hype – AI still has no moat

Despite the massive amount of hype, the larger models – most people are still missing nuance, nearly every single thread of logic via llms points towards AI having no moat

I don't want this to be confused via "openai has no moat", since hype/popularity are a moat – if you are the only thing people know, it is likely that people are going to use your platform, but you will still have to constantly advertise or make it convenient to a degree wherein people feel uncomfortable using any other piece of software

Google achieved this via ensuring that every other major competetor, firefox or safari – had it's parent owners paid to make google their default search engine, thus creating an illegal monopoly over the search market – and [it looks like this is in a bad state](https://apnews.com/article/google-search-antitrust-case-59114d8bf1dc4c8453c08acaa4051f14)

---

1. "AGI" is not the goal, "Good enough" is the goal

Take the difference between a (waterman pen)[https://www.waterman.com/] and a regular [0.12€ pen](https://www.promostore.de/nash-kugelschreiber-mit-farbigem-schaft-und-griff-456940.html), a majority of people will not buy a waterman pen – The pens are rediculously expensive, and sell aesthetics and a brand of luxury that most people do not need

For 90% of use cases, you likely will be able to get away with using a much smaller model, such as [gemma3 27b](https://huggingface.co/google/gemma-3-27b-it) or even much smaller models

The SOTA model difference between the best open source model (Qwen3 235B w/ 22B active parameters) and the SOTA closed source model is 10% [(65% to 75%)](https://livecodebench.github.io/leaderboard.html) – This is [without considering benchmark overfitting](https://arxiv.org/abs/2503.21934v1)

2. Every single AI tool – has an open source alternative, every. single. one – so programming wise, for a new company to implement these features is not a matter of development complexity but a matter of getting the biggest audience

Take for example

- [lifelike text to speech](https://huggingface.co/suno/bark)
- [nearly sota coding](https://mistral.ai/news/devstral)
- [deep research](https://huggingface.co/blog/open-deep-research)
- [text to video](https://huggingface.co/Wan-AI/Wan2.1-VACE-14B)
- [sota speech to text](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2)
- [open source programming editor](https://voideditor.com/)

3. The entire industry is changing at such a significant pace, that nearly nobody is able to keep up and build effective tooling that will last on the longer run

A common trope that has come up now is that implementation details are constantly missing features due to the rapid progress of change within the industry

Changes here are quite evident in the mannerism where

- The standard for representation of "how to prompt" has constantly changed throughout, [older models simply took in a prompt parameter](https://huggingface.co/docs/transformers/main/tasks/prompting), newer models have alternative systems of "system messages" and "user messages" ([see here](https://huggingface.co/mistralai/Devstral-Small-2505#transformers)) - oh, and system messages themselves in openai [have been renamed to developer messages now](https://lunary.ai/blog/openai-developer-role#what-are-developer-messages)

- Older tooling frequently used such as Automatic1111 or ComfyUI [have had extensions constantly break](https://github.com/comfyanonymous/ComfyUI/issues/6921) due to the rapid changes occurring in the ecosystem

- Newer models now also have been changing, what is considered "modern" is hard to track now, is it huggingface, is it comfyui, is it ollama, is it vllm? – what is the best tool to use can be a mind boggling experience

- The underlying architecture itself has been significantly changing, leading to a lack of provider support in many circumstances – and it is also now likely going to be upended by [1-bit llms](https://github.com/microsoft/BitNet) or [diffusion models](https://deepmind.google/models/gemini-diffusion/) once again

4. Lastly, from personal experience, for most practical purposes – You will have to likely fine tune a model to the task you are trying to use since most models come with severe lag due to the amount of time it takes to "load" the context into a model, which can be heavy if a signficant amount of long context is present/needs to be trained on

The bottom line here is that, smaller companies or newly emerging big companies in the field have a solid start at winning the race