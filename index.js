const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./config/settings.json", "utf8"));
const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => {
  console.log("Boot completed successfully!");
});

client.on("message", async (message) => {
  /**
   * summon command
   *
   * Format: `!summon`
   */
  if (message.content === "!summon") {
  }

  /**
   * leave command
   *
   * Format: `!leave`
   */
  if (message.content === "!leave") {
  }

  /**
   * play command
   *
   * Format: `!play {URL}`
   */
  if (message.content.startsWith("!play")) {
  }
});

client.login(config.settings.bot.token);
