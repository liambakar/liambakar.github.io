---
layout: post
title: Teaching a Tiny Language Model to Read My Health Diary
date: 2026-08-20 21:32:00 +00:00
description: What I learned fine-tuning Qwen3-0.6B to turn free-form health
  diary entries into structured logs. What we can do with this knowledge
cover_image: /images/blog/image.png
cover_alt: ""
tags:
  - health tracking
  - Information Extraction
  - LLM
  - Qwen3
  - Fine-Tuning
  - Reinforcement Learning
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
Creating a structured and comprehensive health logs requires more user effort. So, I want to answer the following:

**How can we take a diary entry or natural description of someone's day and turn that into structured health logs?**

## Idea

As cliche as it sounds, the answer is in language models.

Models like Gemini, Claude, and ChatGPT can reliably convert a free-form description into a structured output such as JSON.
But using a large hosted model for every health log introduces a couple drawbacks.
Health diaries can contain highly personal information, and relying on an external API means sending that information to a third-party service.
Additionally, it's not cheap to use said APIs.
Specialized information-extraction models like [NuExtract](https://about.nuextract.ai/) fall under the same umbrella, especially after their new [pricing model](https://about.nuextract.ai/pricing). 

So we took a different approach: fine-tuning [Qwen3-0.6b](https://huggingface.co/Qwen/Qwen3-0.6B).

At around 600M parameters, Qwen3-0.6b is tiny by modern LLM standards; small enough that it can run on cheap hardware or even on your phone.
Moreover, our task does not require a general-purpose model, it just needs to be able to reliably map an unstructured description of a person's health into a predefined schema. 

I'm obviously not the first to think of diary-styled tracking.
A growing number of companies and research labs are exploring ways to make health logging feel more natural.

One example, [Luffu](https://luffu.com/), allows people to *"Use voice, text, photos, documents, or app integrations to instantly record information, from medical records and medications to meals and vital signs."*

This is the type of interaction I'm interested in; though rather than focusing on building the full health-tracking product, I am focusing on the model beneath it.

I want to to ensure that the model is small, reliable, private, and cheap.

We fine-tuned Qwen3-0.6b specifically for information extraction using our general health-log JSON template. 
For example, given an **input** like *"I had a headache this morning so I skipped breakfast, it's probably because I'm feeling anxious about moving to the UK,"* we want the model to produce an **output** like:
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

The obvious place to start was supervised fine-tuning (SFT). 
The hard part about any sort of supervised training is getting the dataset.

What did we use to generate a synthetic one? You guessed it— LLMs!


## Dataset

First, we sampled demographic seeds from an occupation and age-range table from the Labor Force Statistics[^2]. 
For each occupation, the pipeline randomly selected an age range, sampled an age within that range, and assigned a gender from a fixed set of options. 
These demographic seeds were used to prompt an LLM to generate structured personas containing a name, description, medications or supplements, general mood, and possible health conditions or injuries.

We then used each generated persona to synthesize labeled health-log entries. 
A Jinja prompt template incorporated the persona attributes, the target category set, and few-shot examples of both single-label and multi-label logs, resulting in around 125K health utterances.

Upon inspection of these utterances, we confirmed that LLMs notoriously do not write like real humans.
An LLM's idea of how someone describes their headache may be much cleaner than how someone actually writes when their head hurts.

Similarly, persona generation can introduce weird distributions. Generated personas are often repetitive in sentence structure and do not represent the messiness and ambiguity in real human writing.

Instead of hand labeling every utterance, the pipeline uses the larger [NuExtract3](https://huggingface.co/numind/NuExtract3) model as a teacher.
NuExtract3 receives the natural language utterance and a JSON template describing our intended output.

Given our low resource research environment, extraction was distributed across a resumable pool of GPU workers with semaphoring.
This creates a [pseudo-labeled general-health-information extraction dataset](https://huggingface.co/datasets/lbakar/health-log-extraction-dataset): natural-language inputs paired with structured outputs generated by a stronger model.

## Low Budget Environment

Again, with our low-budget research environment, we distributed training jobs across four GPUs. 
The training job uses data parallelism; each of the four GPUs holds a complete copy of the model and the training examples are divided among them. 
Lightning's [Distributed Data Parallel Strategy (DDP)](https://lightning.ai/docs/fabric/stable/full-api-reference/api/generated/lightning.fabric.strategies.DDPStrategy) connects the processes into a single distributed training group.

Each GPU independently performs a forward pass on its local examples and calculates the language-model loss. 
The backward pass calculates gradients for the model replica on that GPU.

The configuration accumulates gradients for 16 microbatches before updating the model.
Each GPU processes `4 examples × 16 microbatches = 64 examples`.
Across four GPUs, one optimizer update represents approximately `4 examples/GPU × 4 GPUs × 16 accumulation steps = 256 examples`.
So the nominal effective global batch size is 256.

## Fine-Tuning

In a sense, this is response-based knowledge distillation. 
Using a large teacher model, we distill information into our smaller student model. 
However, it's not classical knowledge distillation as our student model never sees the logits of the teacher. 
In our case, the student model was Qwen3-0.6B.
Each row is formatted into the following prompt:
```
<template>
The JSON structure to fill in
</template>

<user>
The original utterance
</user>

<assistant>
The expected structured extraction
</assistant>
```
The loss is masked over the template and user message. 
Qwen is not trained to reproduce its prompt; it is graded only on the structured JSON it should generate. 

We then perform full-parameter fine-tuning and end up with a [light information-extraction model](https://huggingface.co/lbakar/health-log-extraction) specialized for this particular health and daily-life schema.

## Reinforcement Learning


SFT revolves around matching a target sequence of tokens, but we also want to emphasize extracting the right information, following the schema, and avoiding hallucinations.
To do this, we chose to augment the SFT model with some RL. 

RL used to be the type of thing you learn in your robotics or algo class then never again.
Now, it's a widely used method for post-training language models.

This pipeline uses Group Relative Policy Optimization (GRPO) to refine the existing health-information extraction model.
For every utterance, we generate four candidate extractions.

Each candidate receives a numerical reward based on the following equation:
$$
R_\text{total} = 
\begin{cases} -1 & \text{not a valid JSON} \\
\\
R_\text{extraction} + R_\text{schema} - P_\text{hallucination}  & \text{otherwise}  
\end{cases}
$$

- $R_\text{extraction}$: a reward for recovering the information present in the diary entry 
- $R_\text{schema}$: a reward for following the schema and using the correct dtypes
- $P_\text{hallucination}$: a penalty for adding information unseen in the diary entry

Because the candidates were generated for the same input, we could score them relative to one another. 
GRPO normalizes rewards within the group, giving above-average responses positive advantages and below-average responses negative advantages.
This allows the model to learn which generated candidates are better in comparison to others rather than arbitrarily.
These candidates have a higher likelihood of being generated.

Now, we have a fine-tuned, [RL-boosted lightweight model]().

## What's next?

Extraction only gets us so far.

If someone writes, *"I had a horrible headache after lunch,"* the model might correctly identify the symptom, its approximate time, and its severity. But there are still plenty of things it doesn't know. 

How long did it last? 
Did they take anything for it? 
Has this happened before?

We could ask all of those questions.

This introduces the two questions I want to answer in the future:

#### 1. What kinds of questions should we ask?

Knowing that information is missing does not tell us what question to ask.

Take the above utterance about the headache after lunch.
We could ask about the duration, severity, triggers, and frequency. 
Each question would fill a different part of the health record, but differ in how much effort they require from the user.

The format of the question could also differ. 
Multiple choice, short answer, selection, and confirmation questions affect the interactions surrounding a health logging system and each format brings its own pros and cons. 

People may also have preferences. 
One person may prefer multiple-choice questions, while another may prefer answering everything in a single sentence.

Those preferences could also depend on context. 
Someone might be happy to answer a free-text question while sitting at home, but prefer a one-tap response while walking or commuting.

So, I want to answer the following question: **What is the best way to request that information from this person, in this context?**

I want to explore whether a system can learn these interaction preferences over time. 
If a user ignores open-ended questions but responds to multiple-choice prompts, the system could adapt. 
If a user gives more detailed responses when asked about symptoms but gives more sparse responses for food logs, the interaction style could vary by category.

This introduces a personalization problem: choosing what to ask and how to ask it in a way that maximizes useful information while minimizing effort.

#### 2. How can we justify when to ask a person to fill in missing information?

Every follow-up question has a cost.
It takes time, creates friction, and adds user burden.

Given our extraction mechanism, we can turn this into an [information gain](https://en.wikipedia.org/wiki/Information_gain_(decision_tree)) problem.
We can generate candidate questions and their corresponding answers, estimate how much each question could reduce entropy or uncertainty in the health log, and compare that benefit with against the burden of asking it.

The goal is to ask a question only when
$$\text{expected information gain} > \text{cost of asking the user}$$

Much literature exists surrounding this[^3], but these NLP approaches represent user burden with a fixed constant or a relatively simple numerical function.
Human preferences are unlikely to be that simple.

If we can learn a better representation of how people actually perceive the burden of follow-up questions, we may be able to build systems that ask fewer, better questions.

The health domain also provides another useful constraint.
Not all missing information is equally valuable. 
Knowing whether someone took a medication may matter more than knowing the location of where they ate lunch.

So, I want to answer the following question: **How can we balance information gain, domain-specific value, and human burden to decide when—and how—to ask a follow-up question?**



[^1]: There actually is lots of research on using wearable devices to extrapolate information about your symptoms like [this](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2021.625247/full) and [this](https://dl.acm.org/doi/abs/10.1145/3770655), so that statement might soon become outdated.

[^2]: https://www.bls.gov/cps/cpsaat11b.htm

[^3]: I do recommend reading these papers because they're very well written, but they do unfortunately simplify human perspectives to constants or linear values. Check [this](https://aclanthology.org/2025.findings-naacl.306/) and [this](http://arxiv.org/abs/2302.09664) and [this](http://aclweb.org/anthology/P18-1255) and [this](http://arxiv.org/abs/2508.21184). There are many more, but I'll spare ya'll this time. 
