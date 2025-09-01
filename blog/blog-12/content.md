---
shortSummary: How to build a great billing system
author: River / Aditya Shankar
dated: 2025-06-08
title: How to build a great billing system
icon: icon.jpg
icon_v2: true
iconCredit: Jordan Wilson
iconCreditUrl: https://unsplash.com/illustrations/fLIfHga9_gM
url: build-a-great-billing-system
hidden: true
---


# How to build a great billing system

skip to [How to make your customers love you](#how-to-make-your-customers-love-you) for the meat of the article

Okay, this blog post is very close to being a rant

Its also written from a _humane_ perspective, the idea that, when you treat your customers with care and kindness, your customers would want to use your service more

## Who am I?

I am an experienced Customer Operations and Innovation Executive, I have helped companies build relationships with hundreds of thousands of customers, working with some of the largest companies in the world

I make people fall in love with your service, I take the humanistic approach of psycology to do so

## Why I am writing this article

There is a problem wherein cloud providers create a technological problem - only to also provide an overly complicated solution for it

I am specifically talking about "accident forgiveness", https://fly.io/blog/accident-forgiveness/

Here's a fairly common scenario

1. Oh no, you accidentally uploaded too many files to S3!, or Oh no, you accidentally provisioned too many cloud VMs!

2. No problem, now you will have to suffer the next few days in worry emailing fly.io staff, or GCP staff or AWS staff trying to get them to forgive your situation

And this is a very very common scenario that occurs

<example 1>
<example 2>
<example 3>
<example 4>

And I find it slighty, troubling, because this is a situation, wherein – the problem has been created via bad design, and the solution is also bad design

## A humanistic approach to building services

A good service is a relationship you are providing to your users, people are paying you money to have something done

Getting people entagled, or giving them *gotchas*, is a great way to mess up your relationship with your users, a significant amount of services use these [bad design strategies](add example here) to "entangle" you with a service, to make it harder to opt out

And, I think the reality is, these services cause short term gain for long term loss

The more people feel exhausted using your service, feel cheated, the more you're going to lose them in the long term to competetors who won't do similar things

Like, essentially, this comes down to onus of responsibility, If one person makes a mistake crashing into a road sign at a place, it probably is the persons fault

If 60 people do that, its bad architectural design that needs to be improved

## How to make your customers love you

There are 4 main rules of doing this properly

1. Remove the roadblocks
2. Don't surprise people
3. Be honest
4. Be kind
5. Be clear

### Remove the roadblocks

as the old addage goes

> Fool me once, shame on you, fool me twice, shame on me

well, this doesn't hold true in practice, people make the same mistake over and over again

something about the API here

which api is better in terms of mistake proofing design

```js
const abc = service.provisionMachine(10);
```

```javascript
const provisioner = new MachineProvisioner()
provisioner.setMaxMachines(10)

provisioner.provisionMachine(5)
```

One approach lets people explicitly set limits to avoid stepping on a roadblock, the other lets people accidentally ram their car through the roadblock

For automatic deposit systems

Allow people to setup custom limits – Or rather, ask customers to explicitly set custom spend limits

preventing mishaps from occurring on the long term

(also check out <xyz> service that calls for this)

### Don't surprise people

A thing that frustrates people very often is the following

Displayed price

Actual price (after taxes)

<example 1>
<example 2>

*Oh but this works for Apple, won't it work for me too!*

Apple, has advertised a "feeling" a brand value it provides its customers, but the moment people get an honest alternative – which builds the next device just as well, but doesn't try to make you feel bad for buying it, they will switch

That beind said, the main disappointment apple's customers have had with it, has also been this [that apple devices are too expensive](<example url for this>)

And you likely, are running a business with competetor - <give example of service where people switched or stopped buying due to a better alternative>

### Be clear

Be clear for _what your customers where charged for

Essentially, when you charge people over a certain period of time – be clear on what were charged for

So for example, if you are running an API service, it makes more sense to charge per API call, than per month

This prevents customers from coming back and asking "Hey where did this part of the  money go?" or hey "Why was this <period of time>" super expensive?

Example of bad service

Example of good alternative

Now, let's say that one API call can charge you for 3 different things (in reality this can be far more)

Let's say that you run a transcription service, wherein you charge people differently for the voice their running the transcription service using, and the number of words they are being billed on the basis of and the transcription output quality (with a premium speech and regular voice)

Now let'S reverse see this from a customers perspective

Let's say a customer regularly gets a 45$ bill but one fine day in the morning they see a 100$ bill

Which bill do you feel they would be least surprised by?

1. Bill 1
2. Bill 2
3. Bill 3

The bottom line here is, the more detailed we are, the more users can understand their own roadblocks and are less likely to hit them

### Be kind to your users

As much as, as I mentioned earlier, the reason why I believe GCP/AWS issues occur because they aren't addressing the core of the issue (likely because they make money off those failures)

## Conclusion