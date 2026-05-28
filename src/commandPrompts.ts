import inquirer from "inquirer";
import {MODEL_REGISTRY, DEFAULT_MODELS} from "./ai"
import { CONFIG_OPTIONS, loadConfig } from "./config";
import { getRemotes } from "./git";
import { commitMessagePrompt } from "./aiPrompt";
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

export async function configKeysPrompt(){
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "configKey",
      message: "Which config woulf you like to set?",
      choices: Object.keys(CONFIG_OPTIONS)
    }
  ])

  return answer.configKey;
}

export async function configValuePrompt(key: string){
  let res;
  if (key == "max_diff_tokens"){
      res = await inquirer.prompt([
        {
          type: "number",
          name: "maxTokens",
          message: "Enter max tokens per diff: ",
          validate: (value) => {
          if (!Number.isInteger(value) || value <= 0)
            return "Enter a positive integer";
          return true;
        }
        }
      ])
      return res.maxTokens;
  }
  else if (key == "prompt") {
    res = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: "Type a custom prompt here, leave blank for default."
      }
    ])
    res = res.prompt
    if (res == "")
      res = commitMessagePrompt;
    return res; 
  }
  else if (key == "default_origin") {
    res = await inquirer.prompt([
      {
        type: "list",
        name: "defaultOrigin",
        message: "Select default origin",
        choices: await getRemotes()
      }
    ])

    return res.defaultOrigin
  }
  else if (key == "model"){
    const config = loadConfig();
    const models = MODEL_REGISTRY[config.provider as keyof typeof MODEL_REGISTRY];
    res = await inquirer.prompt([{
      type: "list",
      name: "res",
      message: "Select model:",
      choices: models
    }]);
    return res.res;
  }
  
  const options = CONFIG_OPTIONS[key].options;
  if (!options) {
      console.log(`No handler for config key: ${key}`);
      throw new Error(`No handler for config key: ${key}`);
  }
  res = await inquirer.prompt([
    {
      type: "list",
      name: "res",
      message: `Option: ${key}`,
      choices: options
    }
  ]);

  return res.res
}

export async function ynListPrompt(message: string) {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "yn",
      message: message,
      choices: [
        {
          name: "Yes",
          value: true
        },
        {
          name: "No",
          value: false
        }
      ]
    }
  ])

  return answer.yn;
}
