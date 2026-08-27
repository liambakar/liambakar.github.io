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
Knowing your heart rate does not tell you about the headache you had or that you skipped breakfast or that you're anxious about moving to a new country[^1].

Enter active tracking.

People have been doing this forever when it comes to tracking their macros when they eat or their progress when they lift. 
These records capture subjective experiences sensors often miss.

The issue is that active tracking requires work.
The more structured and comprehensive someone wants their health logs to be, the more effort they need to put into creating it. That tension is what led me to ask the question: 

How can we take a diary entry or natural description of someone's day and turn that into structured health logs?

## Idea

As cliche as it sounds, the answer is in language models.

Models like Gemini, Claude, and ChatGPT can take a free-form description and reliably turn it into structured output such as JSON.
But using a large hosted model for every health log introduces a couple drawbacks.
Health diaries can contain highly personal information, and relying on an external API means sending that information to a third-party service.
Additionally, it's not cheap to use said APIs.
Specialized information-extraction models like [NuExtract](https://about.nuextract.ai/) fall under the same umbrella, especially after their new [pricing model](https://about.nuextract.ai/pricing). 

So we took a different approach: fine-tuning Qwen3-0.6b.
At around 600M parameters, Qwen3-0.6b is tiny by modern LLM standards; small enough that it can run on cheap hardware or even on your phone.
Moreover, our task does not require a general-purpose model, it just needs to be able to reliably map an unstructured description of a person's health into a predefined schema. 

We fine-tuned Qwen3-0.6b specifically for information extraction using our general health-log JSON template. 
For example, given an <b>input</b> like <i>"I had a headache this morning so I skipped breakfast, it's probably because I'm feeling anxious about moving to the UK,"</i> we want the model to produce an <b>output</b> like:
```json
{
    "activity": {},
    "food": {
        "consumed_items": [],
        "missing_items": ["breakfast"]
    },
    "mood": {
        "description": "anxious",
        "classification": ["negative"]
    },
    "symptom": {
        "keywords": ["headache"],
        "description": "headache possibly due to anxiety"
    },
    "treatment": {}
}
```
The actual schema is more detailed, but this is essentially the extraction mechanism we wanted the model to learn.

## Fine-Tuning

The first thing that pops up into my mind when we want to create a task-specific LM is SFT.
The hard part about any sort of supervised training is getting the dataset.

## Reinforcement Learning

RL used to be the type of thing you learn in your robotics or algo class then never again.
Now, it's the state-of-the-art way to improve Large Language Models.



[^1]: There actually is lots of research on using wearable devices to extrapolate information about your symptoms like [this](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2021.625247/full) and [this](https://dl.acm.org/doi/abs/10.1145/3770655), so that statement might soon become outdated.

