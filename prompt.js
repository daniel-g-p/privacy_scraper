import readline from "readline";

const rl = readline.createInterface(process.stdin, process.stdout);

export default async (message) => {
  return new Promise((resolve) => {
    rl.question(message.trim() + " ", (input) => {
      resolve(input);
    });
  });
};
