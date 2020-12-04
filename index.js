const fs = require("fs");
const { settings, prefix } = JSON.parse(
  fs.readFileSync("./config/settings.json", "utf8")
);
const autoPlaylist = fs
  .readFileSync("./config/autoplaylist.txt", "utf8")
  .split(/\r?\n/);

const Discord = require("discord.js");
const client = new Discord.Client();

const Bot = require("./src/bot");
Bot.client = client;

const {
  cmd_summon,
  cmd_disconnect,
  cmd_play,
  cmd_skip,
  cmd_pause,
  cmd_resume,
  cmd_setplaylist,
  cmd_setaudiofilter,
} = require("./src/commands");

// key: guildId, value: {Bot}
const dispatchingBots = {};

client.once("ready", () => console.log("Ready!"));
client.once("reconnecting", () => console.log("Reconnecting!"));
client.once("disconnect", () => console.log("Disconnect!"));

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const guildID = message.guild.id;
  let self = dispatchingBots[guildID];
  if (!self) {
    // サーバーに呼び出し前の場合
    dispatchingBots[guildID] = new Bot({
      autoPlaylist,
      volume: settings.player.volume,
      audioFilter: settings.player.filter,
    });
    self = dispatchingBots[guildID];
    Bot.dispatchingBotCount++;
  }

  /**
   * debug command
   */
  if (message.content === "!debug") {
    console.log(self.nowPlayingMusic);
  }

  /**
   * summon command
   *
   * Format: `!summon`
   */
  if (message.content === "!summon") {
    cmd_summon({
      self,
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
    cmd_disconnect({ self });
    delete dispatchingBots[guildID];
    Bot.dispatchingBotCount--;
  }

  /**
   * play command
   *
   * Format: `!play {URL}`
   */
  if (message.content.startsWith("!play")) {
    const [command, url] = message.content.split(" ");
    cmd_play({ self, url });
  }

  /**
   * skip command
   *
   * Format: `!skip`
   */
  if (message.content === "!skip") {
    cmd_skip({ self });
  }

  /**
   * pause command
   *
   * Format: `!pause` or `!stop`
   */
  if (message.content === "!pause" || message.content === "!stop") {
    cmd_pause({ self });
  }

  /**
   * resume command
   *
   * Format: `!resume` or `!start`
   */
  if (message.content === "!resume" || message.content === "!start") {
    cmd_resume({ self });
  }

  /**
   * setplaylist command
   *
   * Format: `!setplaylist {PlaylistName}`
   */
  if (message.content.startsWith("!setplaylist")) {
    const [command, playlistName] = message.content.split(" ");
    cmd_setplaylist({ self, playlistName });
  }

  /**
   * setaudiofilter command
   *
   * Format: `!setaudiofilter {AudioFilter}`
   */
  if (message.content.startsWith("!setaudiofilter")) {
    const [command, audioFilter] = message.content.split(" ");
    cmd_setaudiofilter({ self, audioFilter });
  }
});

client.login(settings.bot.token);
