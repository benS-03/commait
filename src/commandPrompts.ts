import inquirer from "inquirer";
import {MODEL_REGISTRY, DEFAULT_MODELS} from "./ai"
export async function configInitPrompt(){
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