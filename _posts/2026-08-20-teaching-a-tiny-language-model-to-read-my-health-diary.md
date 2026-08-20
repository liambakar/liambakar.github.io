---
layout: post
title: Teaching a Tiny Language Model to Read My Health Diary
date: 2026-08-20 21:32:00 +00:00
description: draft
published: true
---
## Motivation

There are two broad ways we track health: passive and active tracking. 

Due to the increasing work in wearable sensors in smartwatches and similar devices, passive tracking excels at recognizing physical activities, measuring cardiovascular signals, and estimating sleep quality with little effort from the user.
However, these metrics only capture a part of the whole story about your health.
Knowing your heart rate does not tell you about the headache you had or that you skipped breakfast or that you're anxious about your soon-to-be long-distance relationship[^1].

Enter active tracking.

People have been doing this forever when it comes to tracking their macros when they eat or their progress when they lift. 
These records capture subjective experiences sensors often miss.

The issue is that active tracking requires work.
The more structured and comprehensive someone wants their health logs to be, the more effort they need to put into creating it. That tension is what led me to ask the question: 

How can we take the diary or natural description of someone's day and turn that into structured health logs?

## Ideas

As cliche as this is, the answer is in language models, but maybe not the way you'd expect.
Gemini, Claude, ChatGPT, and other frontier models do a great job of turning strings of text into JSON objects, but they are expensive and lack in privacy.
[NuExtract](https://about.nuextract.ai/) falls under the same umbrella, especially after their new [pricing update](https://about.nuextract.ai/pricing). 


 

[^1]: There actually is lots of research on using wearable devices to extrapolate information about your symptoms like [this](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2021.625247/full) and [this](https://dl.acm.org/doi/abs/10.1145/3770655), so that statement might soon become outdated.
