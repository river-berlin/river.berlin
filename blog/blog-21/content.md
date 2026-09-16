---
shortSummary: Attempting to recreate Armin Ronacher's Pangram AI detection experiment
author: River / Aditya Shankar
dated: 2026-09-16
title: Attempting to recreate Armin Ronacher's Pangram experiment
icon: icon.jpg
icon_v2: true
iconCredit: heyquilia from unsplash
iconCreditUrl: https://unsplash.com/de/fotos/person-die-auf-einem-laptop-tippt-3GZNPBLImWc
url: pangram-experiment-recreation
hidden: true
---

# Attempting to recreate Armin Ronacher's Pangram experiment

[Armin Ronacher's new blog post](https://lucumr.pocoo.org/2026/9/14/interpreting-pangram/) tried to see if Pangram will flag a text 100% AI slop if it's rewritten (it does for him), I wanted to attempt to recreate the experiment he did, my background here is that the dialect of English I natively speak would be Indian English - my parents were different parts of India and since growing up I haven't lived in the same place for more than 3-4 years ever. I now live in Berlin and I have been cramming German. (I wanna rewrite this in German out of curiousity sometime but that time is not today lol).

I rewrote the text, originally coming from Armin's text on his website in my own words below - I rewrote the Opus 5 variant

The thing I am doing probably differently here, is I am writing it in the style of "me", how would I actually write it personally


> The AI leaders Sam Altman and Dario Amodai are portraying a worry with regard to AI capabilities. In order to portray themselves as more secure, 2 things have happened
>
> 1. Dario Amodai published a paper called "We must pace the frontier"
> 2. Both have committed to giving independent evaluators employee-like access.
> 
> To this, I think the pair are likely to be surprised with my response, and it's that they should definitely do so
> 
> OpenAI and Anthropic, are the 2 biggest market players in this field, they have the most amount of customers, and they get the most amount of revenue. When I go out to talk to people at conferences people replace the word "AI" with Claude and apart from developers, people tend to replace the word "AI" with ChatGPT (i.e. people will say, "I was using ChatGPT as a therapist" even if they were using Gemini). Both Sama and Amordei are talking about "the lead widening" and "models training models". If this is true, the pacing really doesn't make much of a difference - since you can just pour that money at a different period of time and have the same impact.
> 
> And you know what, you guys made the models, you have the right to do step back if you feel like stuff is risky. 

> But here's the thing, you should not be blaming the rest of the world for your problems, there's like a few startups that have led to the problems like [the huggingface incident](https://huggingface.co/blog/agent-intrusion-technical-timeline) or [the rubygems incident](https://simonwillison.net/2026/Sep/12/openai-agents-rubygems/).
> 
> It's really weird, because you too lead every benchmark for the most capable models, both incidents were caused by _your_ models, why should other developers suffer because of your actions? just because you too claim to be made milk, this is some "holier than thou" nonsense where "none non holy may pass"
> 
> Also, you know, I am really really skeptical of this being done for the public good, maybe Sama and Dario really believe that, not sure. But ultimately, we still live under a capitalism and Sam and Dario still probably want to justify their companies massive valuations, and why it doesn't make a profit yet (and if it can ever make a profit), essentially I think there's a chance that both CEOs are doing this to justify their revenue cycles, and get an excuse to "slow down the pace" for their investors while they continue to bleed money. and it bans chinese competition in the US proprietary-only landscape, it's like a weird way you can scrape the entire internet (and it's okay if you do so), but the moment competetors start scraping you - it's a "that's too risky" moment.
> 
> trotzdem, If you slow down, it does let us think about a better model of regulation - as opposed to Bernie's "shut it all down". He's trying to appeal to his voters there, but that isn't a good policy decision. 
> 
> And you know there is a slight argument to be made that if only two firms are blocked by this proposal - and the rest of the world does what they want (including China), that's legitimately not safety for the rest of the world.


lines I purposefully omitted :

1. "I am not going to second guess a risk assessment I have no access to, that's dishonest lol, a ton of firms are horribly incompetent and I absolutely will second guess their risk assessment.


[Pangram scores this](https://www.pangram.com/history/32e804f8-c1ab-47ea-89ce-25d68cce2f1f?ucc=ZRiXVLxHO5K) as 100% human. 

Authors note : I do not agree with the Article in-and-of itself as I write it, as a developer my instinct is that, as developers we have historically taken care of numerous bugs on a timely manner, so y2k, heardbleed and idk, the thousand other problems have been largely taken care of. 

I think this may be a problem to some small companies with 50-year-old codebases, and their CEOs are going to have to get comfortable with having AI analyse that code and they're going to have to find the money somewhere to fix that, or have AI fix those issues, and yeah that's going to be expensive, but "End of humanity" is not a story I am buying. This will have environmentally bad consequences however.

I asked gemini to make corrections, hereafter:

> The AI leaders Sam Altman and Dario Amodei are portraying a worry with regard to AI capabilities. In order to portray themselves as more secure, 2 things have happened:
>
> 1. Dario Amodei published a paper called "We must pace the frontier"
> 2. Both have committed to giving independent evaluators employee-like access.
> 
> To this, I think the pair are likely to be surprised with my response, and it's that they should definitely do so.
> 
> OpenAI and Anthropic are the 2 biggest market players in this field, they have the most amount of customers, and they get the most amount of revenue. When I go out to talk to people at conferences people replace the word "AI" with Claude and apart from developers, people tend to replace the word "AI" with ChatGPT (i.e. people will say, "I was using ChatGPT as a therapist" even if they were using Gemini). Both Sama and Amodei are talking about "the lead widening" and "models training models". If this is true, the pacing really doesn't make much of a difference - since you can just pour that money at a different period of time and have the same impact.
> 
> And you know what, you guys made the models, you have the right to step back if you feel like stuff is risky. 
>
> But here's the thing, you should not be blaming the rest of the world for your problems, there are like a few startups that have led to the problems like [the huggingface incident](https://huggingface.co/blog/agent-intrusion-technical-timeline) or [the rubygems incident](https://simonwillison.net/2026/Sep/12/openai-agents-rubygems/).
> 
> It's really weird, because you two lead every benchmark for the most capable models, both incidents were caused by _your_ models, why should other developers suffer because of your actions? just because you two claim to be made of milk, this is some "holier than thou" nonsense where "none non holy may pass"
> 
> Also, you know, I am really really skeptical of this being done for the public good, maybe Sama and Dario really believe that, not sure. But ultimately, we still live under capitalism and Sam and Dario still probably want to justify their companies' massive valuations, and why they don't make a profit yet (and if they can ever make a profit), essentially I think there's a chance that both CEOs are doing this to justify their revenue cycles, and get an excuse to "slow down the pace" for their investors while they continue to bleed money. And it bans Chinese competition in the US proprietary-only landscape, it's like a weird way you can scrape the entire internet (and it's okay if you do so), but the moment competitors start scraping you - it's a "that's too risky" moment.
> 
> Trotzdem, if you slow down, it does let us think about a better model of regulation - as opposed to Bernie's "shut it all down". He's trying to appeal to his voters there, but that isn't a good policy decision. 
> 
> And you know there is a slight argument to be made that if only two firms are blocked by this proposal - and the rest of the world does what they want (including China), that's legitimately not safety for the rest of the world.

[Pangram analysed this](https://www.pangram.com/history/22141d88-cc51-4a7f-8ee4-66485dfc7183?ucc=ZRiXVLxHO5K) as 100% human again