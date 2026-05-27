import inquirer from "inquirer";
import {MODEL_REGISTRY, DEFAULT_MODELS} from "./ai"
import { getRemotes } from "./git";
export async function configInitPrompt(){
    const remotes = getRemotes();
    const answers = await inquirer.prompt([
    
      {
        type: "list",
        name: "provider",
        message: "Choose your AI provider:",
        choices: ["openai", "anthropic"],
      },
      {
        type: "list",
        name: "openaiModel",
        message: "Choose OpenAI model:",
        choices: MODEL_REGISTRY.openai,
        when: (ans) => ans.provider === "openai",
      },
      {
        type: "list",
        name: "anthropicModel",
        message: "Choose Anthropic model:",
        choices: MODEL_REGISTRY.anthropic,
        when: (ans) => ans.provider === "anthropic",
      },
      {
        type: "input",
        name: "prompt",
        message: "Type a custom prompt here, leave blank for default."
      },
      {
        type: "number",
        name: "maxTokens",
        message: "Enter max tokens per diff: ",
        validate: (value) => {
          if (!Number.isInteger(value) || value <= 0)
            return "Enter a positive integer";
          return true;
        }
      },
      {
        type: "list",
        name: "autoCommit",
        message: "Commit without confirmation?",
        choices: [
            {name: "Auto Commit Enabled", value: true},
            {name: "Auto Commit Disabled", value: false}
        ]
      },
      {
        type: "list",
        name: "autoPush",
        message: "Push without confirmation?",
        choices: [
            {name: "Auto Push Enabled", value: true},
            {name: "Auto Push Disabled", value: false}
        ]
      },
      {
        type: "list",
        name: "askRemote",
        message: "Ask for remote on every push?",
        choices: [
          {name: "Ask for remote on every push", value: true},
          {name: "Do not ask", value: false}
        ]
      },
      {
        type: "list",
        name: "defRemote",
        message: "Select default remote to push to: ",
        choices: remotes
      }
    
    ])

    return answers;
}

export async function confirmCommit(){
    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'commitConfirm',
            message: 'Use this commit?',
            choices: [
                {name: 'Yes', value: 'y'},
                {name: 'No', value: 'n'},
                {name: 'Regenerate', value: 'r'},
            ],
        },
    ]);

    return answer;
}

export async function confirmContinue(message = "Continue?") {
    const { confirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirm",
            message,
            default: false,
        },
    ]);

    return confirm;
}

export async function typePrompt(message: string){
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "res",
      message: message,
    }

  ])
  return answer.res;
}

export async function remotePrompt(){
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "remote",
      message: "Pick a remote to push too: ",
      choices: getRemotes()
    }
  ])

  return answer.remote;
}