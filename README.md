# Commait
```AI-generated commit messages, built to save on tokens and time.```


![commait demo](https://raw.githubusercontent.com/benS-03/commait/main/demo/demo.gif)

[![npm version](https://img.shields.io/npm/v/commait-cli)](https://www.npmjs.com/package/commait-cli)
[![downloads](https://img.shields.io/npm/dw/commait-cli)](https://www.npmjs.com/package/commait-cli)
[![license](https://img.shields.io/npm/l/commait-cli)](https://github.com/benS-03/commait/blob/main/LICENSE)
[![node version](https://img.shields.io/node/v/commait-cli)](https://www.npmjs.com/package/commait)

> Writing good commit messages is not hard, but why do it if AI can do it faster and better. Commait reads a staged diff and writes one for you in seconds. Includes a compression algorithm to reduce diff tokens. 

## Install 

```
$npm install commait-cli
```

## Quick Start

Ensure you have an API key for either OpenAI or Anthropic in your .env file. Use standard naming conventions (ex. ANTHROPIC_API_KEY)

Then run 

```
$commait config init
```

to initialize the configurations to your preferences. 

Note: initializing config is not necessary as it will be done automatically if no config file exists.

## Usage

To commit staged changes, run: 

```
$commait commit
```

This will generate a message, commit, and push to remote all in one command. It will either prompt you with options or skip prompts based on config.

## Features
- **One-command workflow** — Generate, commit, and push changes with a single command.
- **Multi-provider support** — Generate messages using OpenAI or Anthropic with a simple config change.
- **Fully configurable automation** — Dial in exactly how hands-off you want it: auto-stage changes, auto-commit the generated message, auto-push to your remote, or keep every step interactive with prompts.
- **Token budget control** — Cap the max diff tokens sent per request, so generation cost stays predictable even on large diffs.
- **Diff compression pipeline** — If token budget exceeded by raw diff, a custom staged compression pipeline runs, checking the tokens against the budget at each stage to reduce information loss as much as possible while still getting below budget. See compression section for more details.
- **Custom prompts** — Override the default prompt template to match your team's commit conventions or personal style.
- **Optional Context**: Prompt can be prefixed with custom context line using -c flag with committing.
- **Interactive model picker** — Browse and select models within your chosen provider without needing to memorize exact model name strings.

- **Configurable remotes** — Set a default push target, or get prompted for which remote to use on every commit.

## Configuration 

To run through edit all config options one by one run: 

```
$commait config init
```

Or to edit a single option run: 

```
$commait config set [option]
```

A full list of options can be seen below or gotten by running: 

```
$commait config options
```

## Config Options

- **provider**: Which AI provider to use for generation.
- **model**: which model to use within selected provider.
- **prompt**: What to prompt provider with, a default prompt is provided.
- **auto_stage**: whether or not you want commit to automatically stage all files without prompting.
- **auto_commit**: whether or not you want to automatically commit after generation without prompting.
- **auto_push**: whether or not you want to automatically push after commit without prompting.
- **max_diff_tokens**: the maximum amount of tokens sent to AI.
- **default_origin**: the default remote to push to.
- **ask_origin**: whether or not you want to be asked what remote to push to upon commit.

## Diff Compression 

The compression pipeline works in stages, each one being increasingly more aggressive. After each stage runs, the new token count is checked against the budget so that unnecessary information loss does not occur. The 4 stages are as follows: 

1. **Strip Noise Files**: This removes any non user generated files, like package-lock, gemfiles, dist files, etc...

2. **Strip Headers**: This will strip the header off of each file in the diff, and replace them with just the file name, and an indicator for the AI to convey if the file was deleted or renamed.

3. **Strip Context**: This removes the 3 unchanged context lines before and after every hunk.

4. **Strip Lines**: This is the final stage and most aggressive. This works by keeping a certain number of lines at the beginning and end of every hunk and stripping the rest. If this does not reduce the token count below the budget, it will loop this action, reducing the number of lines kept each iteration. This can run a max of 6 times, before it gives up. 

## Default Prompt

> You are an expert software engineer writing a Git commit message.
>
>Analyze the provided diff and write a commit message following these rules:
>
>FORMAT:
>- First line: conventional commit >format — <type>(<scope>): <short >summary>
>- Types: feat, fix, refactor, chore, >docs, test, style, perf, ci
>- Scope: the module, file, or feature >area affected (omit if unclear)
>- Summary: imperative mood, lowercase, >no period, max 72 chars
>- If needed, add a blank line then a >short body (2–4 sentences max) >explaining WHY, not what
>
>RULES:
>- Never describe what the diff looks >like — describe what the change does
>- Prefer specificity over vagueness >("add retry logic to OAuth token refresh" not "improve auth")
>>- If multiple concerns are changed, pick the dominant one for the subject; list others briefly in the body
>- Do not mention file names unless they are the meaningful unit (e.g. a config file)
>- Do not wrap in backticks or add any explanation — output the commit message only
>
>DIFF:
>{diff}