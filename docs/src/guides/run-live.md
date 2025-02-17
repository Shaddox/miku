---
label: Live demo
icon: container
order: 2000
---

# Live demo

![](/assets/llama-demo.png)

You can interact with bots in the [Live demo](https://bots.miku.gg) for free using our open LLaMa server. But the recommended way is to use your own endpoint.

!!!warning Only for testing
The live demo is only intended for testing purposes. The recommended way to run your own bot is to download the source code and run it locally.
[!ref Run locally](/guides/run-local.md)
!!!

## Instructions

![](/assets/live-settings.png)

You can interact with bot right away by just clicking on them, it will use our default open endpoint which is using the `Chronos-Hermes 13b` model.

If you want use a custom endpoint, you can click on the burger menu on the top right corner and select "Custom endpoint". Then, paste your endpoint URL in the text box. You can also set a custom OpenAI API key if you want to use `gpt3.5-turbo` for responses instead.

In order to set up a custom endpoint, you can follow the [How to use the endpoints](/guides/how-to-endpoints) guide.

!!! What is *Prompt Stragety*?
Prompt strategy is the method used to describe the conversation to the language model. Some models are more sentive to some strategies than others. You can try different strategies to see which one works best for your model.

* `SBF` and `W++` work well for OpenAI
* `Pygmalion style` works good for `Pygmalion 6b,7b and 13b`
* `Alpaca` and`Vicuna 1.1` generally work well for `LLaMA` instruct models like WizardLM.
!!!
