const fs = require("fs");
const { settings, prefix } = JSON.parse(
  fs.readFileSync("./config/settings.json", "utf8")
);
const Discord = require("discord.js");
const client = new Discord.Client();

const { cmd_summon, cmd_disconnect } = require("./src/commands");

// Bot state
const Bot = function () {
  this.connectedVoiceChannels = {};
  this.connections = {};

  this.voiceClientIn = function (guildID) {
    return this.connectedVoiceChannels[guildID]
      ? this.connectedVoiceChannels[guildID]
      : null;
  };
};
const self = new Bot();

client.once("ready", () => console.log("Ready!"));
client.once("reconnecting", () => console.log("Reconnecting!"));
client.once("disconnect", () => console.log("Disconnect!"));

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  /**
   * debug command
   */
  if (message.content === "!debug") {
    console.log(self);
  }

  /**
   * summon command
   *
   * Format: `!summon`
   */
  if (message.content === "!summon") {
    cmd_summon({
      self,
      guildID: message.guild.id,
      channelID: message.member.voice.channelID,
      voiceChannel: message.member.voice.channel,
    });
  }

  /**
   * disconnect command
   *
   * Format: `!disconnect`
   */
  if (message.content === "!disconnect") {
    cmd_disconnect({
      self,
      guildID: message.guild.id,
      channelID: message.member.voice.channelID,
    })
  }

  /**
   * play command
   *
   * Format: `!play {URL}`
   */
  if (message.content.startsWith("!play")) {
  }
});

client.login(settings.bot.token);
