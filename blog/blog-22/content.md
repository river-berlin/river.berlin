---
shortSummary: Software engineering problems have changed, it's no logner just writing code - the hard part is now being responisible and writing good code
author: River / Aditya Shankar
dated: 2026-10-22
title: AI took the old software engineering, there is a new software engineering in town
title_de: KI hat das alte Softwareentwicklungmodell übernommen, es gibt ein neues Softwareentwicklungsverfahrung in der Stadt
icon: icon.jpg
icon_v2: true
iconCredit: Emilipothèse
iconCreditUrl: https://unsplash.com/de/fotos/grau-weisse-roboter-illustration-FTfjMijq-Ws
url: ai-makes-software-engineering-harder-there-is-no-going-back
---

> As fun as AI is, we built so much bad software over the last 30 years, and now the universe is punishing us for our sins.

[source](https://simonwillison.net/2026/Oct/22/armin-ronacher/) 

<p class="text-sm">note : source redirects to simon willison's website, simon's website redirects to X, I have no interest in linking to X, given it's run by a facist.</p>

Obviously, there is a junior developer crisis now and software engineers are being fired en-masse because we [suddenly decided that AI can take over jobs now](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/).

So here's the claim I am making - I think AI replaced the "old software engineering model", but nobody can use that anymore.

So, firstly, although we've had checks in the past for linting, test driven development, CI/CD, etc. The reality is that not every developer has been rigerous with the usage of these coding tools over time.

It's really interesting, because humans have been writing slop code for a very long time (or AI won't be writing sloppy code!), and we've been following bad software practices for a very long time, don't believe me?

Remember the [old twitch source code leak](https://apiiro.com/blog/what-we-learned-from-the-twitch-code-leak-about-application-security-programs/), where the developers

1. AWS credentials hardcoded in source code.
2. Twitch client secrets and access tokens stored in a test file within the repository.
3. A private cryptographic key committed to the repository.
4. A Google API key hardcoded in source code.
5. A plaintext database password embedded in a Terraform configuration file.
6. BGP authentication passwords stored in network configuration files within the repository.

Or remember when the entire [codebase for Black](https://github.com/psf/black/blob/6bedb5c58a7d8c25aa9509f8217bc24e9797e90d/black.py) was one giant unsplit python file?

Or [when Uber committed admin keys with admin priviledges directly to their source code repository, twice, once in 2014 and once in 2016](https://www.ftc.gov/business-guidance/blog/2018/04/ftc-addresses-ubers-undisclosed-data-breach-new-proposed-order?utm_source=chatgpt.com)

Or when [equifax stored it's administrative credentials in plain text](https://www.ftc.gov/business-guidance/blog/2019/07/575-million-equifax-settlement-illustrates-security-basics-your-business?utm_source=chatgpt.com)

In a world wherein agents can figure out serious software CVEs [simply by the rumor of it](https://anil.recoil.org/notes/rumour-is-the-exploit), these lax practices are no longer going to be okay.

The mean time for [discovering a bug is now -7 days](https://anil.recoil.org/notes/rumour-is-the-exploit), be damn sure when your source code leaks, there are probably a bunch of agents already trying to analyse it.

This creates a much stronger need of something else less documented, and that's _responsible software_, it's the instilling of paradigms within people, we are trying to replace this with "harnesses", [we are failing](https://lucumr.pocoo.org/2026/9/7/astra-why/), AI will write slop unless you really really ask it not to.

The future of software development is _responsible software_, it's developers who are aware of doing the right thing and as assholes about it. We can't go back to a time without AI, but we can sure be responsible against it.