---
shortSummary: Napkin Math - The collective ownership costs for diffusiongemma
author: River / Aditya Shankar
dated: 2026-06-20
title: The collective ownership costs for LLMs - 2026 June
icon: icon.jpg
icon_v2: true
iconCredit: Joel Mott
iconCreditUrl: https://unsplash.com/de/fotos/stehen-und-sitzen-von-personen-die-gruppenfotos-machen-O9Ogddfvl-U
url: llm-collective-ownership
---

# Napkin Math: The collective ownership costs for LLMs

Clickbait warning: This purely talks about [diffusiongemma](https://huggingface.co/google/diffusiongemma-26B-A4B-it), the article headline is clickbait otherwise.

Some back of the napkin math here - take this article with a pinch of salt

## Subquestionio 1: The cost of the GPU

The current pricing for an RTX PRO 6000 Nvidia GPU is about 13,000€ ([source](https://www.idealo.de/preisvergleich/OffersOfProduct/206328547_-rtx-pro-6000-blackwell-nvidia.html)).

The actual cost of setting the machine up is going to be a little higher. Nonetheless, since nearly all processing happens in the card itself, and we are talking about a very small group of users, cheap CPU hardware/ram assumptions are probably going to be alright. So let's pessimistically add about 2000€ for setup cost there.

So taking a starting investment of 15,000€.

For the purposes of this discussion, we are going to split this by 12 and assume this is a monthly price, with a 5% markup (so 15,750€), and assume we get this as a loan.

So that comes down to 1312€/month.

I assume a 1-year depreciation window because I suspect by next year [we will have ASICs](https://taalas.com/the-path-to-ubiquitous-ai/), making this calculation wrong.

Now, the question is, how many people can diffusion gemma realistically serve?

## Subquestionio 2: How many tokens does the 'average' person use per day?

This is a hard question to answer, [this paper](https://arxiv.org/pdf/2603.28680) on ChatGPT sees about 14.4 requests/user/day.

> Instead, we derive the baseline
per-user daily request rate ¯q(0) from public ChatGPT usage
statistics: with approximately 2.5–3 billion prompts processed
daily across 190.6 million daily active users [33], the ratio
yields ¯q(0) ≈ 14.4 req/user/day.

They also neatly have an average tokens per request along a chart (which comes to about 969.17 tokens), so rounding that to 1,000 the average person uses about 14000 tokens per day (14 x 1000 tokens per request).

This paper is from 2026, however, I suspect the answer is nonetheless misleading us to how many users would actually use _our_ collectively hosted LLM, 14k tokens is...plainly not a lot.

This is very hard to put concrete numbers towards, since this typically follows a normal distribution and users that are interested in collectively hosting LLMs are going to be of the niche variety wherein they'd likely use LLMs more than the "average" person.

[This paper](https://arxiv.org/pdf/2603.26337) has some cost estimations on this.

> Regarding token consumption, interactive agents incur substan-
tially higher token costs than AutoCodeRover. For example, under DeepSeek, TraeAgent consumes 3,485.9K tokens per instance and mini-SWE-Agent consumes 1,897.6K tokens, which are 18.7× and 10.2× higher than AutoCodeRover (186.0K), respectively. Interestingly, when the base model is GPT, the token consumption of in-
teractive agents decreases dramatically. Compared with DeepSeek, token usage drops by 78.4% for TraeAgent (from 3,485.9K to 751.1K) and by 86.6% for mini-SWE-Agent (from 1,897.6K to 253.9K). This trend is consistent with Figure 3, where the average number of conversational messages decreases substantially under GPT

So this is about 3 million tokens "per task", a task being

> To address this limitation, we introduce RACE-bench,
a reasoning-augmented benchmark for evaluating code agents on repository-level feature addition tasks. RACE-bench contains 528 real-world feature addition instances from 12 open-source repositories.

A developer is likely to do many more tasks compared to the average user. This also talks about agentic-AI in particular, and does not take into account activities such as code-lookups, analysis, debugging, and more. Even assuming you did 5 such tasks per day (which is on the low end, fair), you'd consume about 15 million tokens per day.


So, there's a huge gap here. Developers are [_whale_](https://www.g2a.com/news/glossary/what-is-a-whale-in-gaming-whale-definition-explained/) users and we are unsustainably economically consuming tokens.


This does not take into account how many tokens people spend rectifying the codebase, and to ensure code-quality does not degrade over time, and to look up and generate charts for the codebase.

For this article to proceed, I'll say we collectively set "limits" to LLM usage per user per day. This math looks very different for agentic AI compared to average usage.

## Subquestionio 3: How much does the electricity price for the machine cost?

The current German [electricity costs](https://www.co2online.de/energie-sparen/strom-sparen/strom-sparen-stromspartipps/strompreis/) are about 37.2 cents per kWh (0.37€/kWh).

Assuming the box ran 24/7 at 600W per hour (it won't, but assuming the worst case will be easier for napkin math).

We get 600W × 730h = 438 kWh/month.

So at maximum this will cost 438 kWh/month x 0.37€ = 162€/month.

## Subquestionio 4: Total summed up cost

The total summed up cost comes to 1312€/month + 162€/month = 1,474€/month per GPU.

At [700 tokens per second](https://developers.googleblog.com/diffusiongemma-the-developer-guide/), at 700 tokens/s × 86,400 seconds/day we get about 60,480,000 tokens/day.

Realistically we are going to have throughput issues, and people are going to use this at similar periods of time each day. Let's assume we get a fifth of this – so 12 million tokens per day. This calculation gets a little weird here to be honest, and has many implementation caveats so I'll admit to this being a "hand wavy number".

<p style="font-size:10px">Note: there are some optimistic advantages we may be able to take from unsloth to get their <a href="https://unsloth.ai/docs/models/diffusiongemma">2000 tokens/second number</a> so do consider that as well</p>


I guess the per person costs come down to how much people use it, and when and where they use it.

For ChatGPT per user usage levels, we have about 14k tokens/user/day which sustains (very optimistically) 857 users - this obviously doesn't account for the networking/system administration/proper system costs to actually sustain all of this, but that comes to about (1474/857 users) 1.7€/month/user. This calculation however, is misleading, as a [significant amount of ChatGPT users are "free" users](https://www.theregister.com/software/2025/10/15/chatgpt-so-popular-hardly-anyone-will-pay-for-it/1106309), and around 5% of users actually pay for the product.

At a hyper optimistic workload for developers of 100k tokens/user/day one can sustainably have a 120 people use it simultaneously - getting to 1474/120 or **12.28€/user/month**.

At a million tokens per user per day, we can have 12 people run it simultaneously, getting to **122.8€/user/month**.

But for "proper" agentic AI, this is plain unsustainable, given the assumption of 15 million tokens per day per developer with agentic AI, this comes to more than our assumed pessimistic 12 million tokens per day as throughput we could get from the entire system. Further, if we use the hyper-optimistic 60 million tokens per day number, we get to a maximum of about 4 users per day or about 1474/4 = **368.5€/user/month**.

A major assumption early on, in this article has been the 1-year depreciation rate for GPUs, I think this is a good assumption personally. However, in an ironic sense to the assumption itself, in both cases

1. If ASICs do come up

The cost of collective hosting (or maybe just buying the ASIC for yourself), radically goes down.

2. If the GPU does not depreciate that fast in terms of cost

Then the bulk of the monthly hosting costs reduce from 1312€/month to 437.34€/month, which also does significantly reduce the per-user costs. (to about 40€/month when divided among 12 people)

I heard Hank Green talk about how he thinks these investments are going to help smaller companies in the future more that bigger companies. I think I agree with that assumption – and I think these are the early signs that we are probably getting closer to that assumption coming true. 