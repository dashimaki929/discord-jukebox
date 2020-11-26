const fs = require("fs");
const { settings, prefix } = JSON.parse(
  fs.readFileSync("./config/settings.json", "utf8")
);
const autoPlaylist = fs
  .readFileSync("./config/autoplaylist.txt", "utf8")
  .split(/\r?\n/);

const Discord = require("discord.js");
const client = new Discord.Client();

const {
  cmd_summon,
  cmd_disconnect,
  cmd_play,
  cmd_pause,
  cmd_resume,
} = require("./src/commands");

// Bot state
const Bot = function () {
  this.isPlaying = false;

  this.connectedVoiceChannels = {};
  this.connections = {};
  this.dispatchers = {};

  this.musicQueue = [];
  this.autoPlaylist = [];
  this.initPlaylist = function () {
    const shuffle = ([...array]) => {
      for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    this.autoPlaylist = shuffle(autoPlaylist);
  };

  this.nowPlayingMusicTitle = "";
  this.setNowPlayingStatus = function (title) {
    client.user.setActivity(title, { type: "LISTENING" });
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
    });
  }

  /**
   * play command
   *
   * Format: `!play {URL}`
   */
  if (message.content.startsWith("!play")) {
    const [command, url] = message.content.split(" ");
    cmd_play({
      self,
      guildID: message.guild.id,
      url,
    });
  }

  /**
   * pause command
   *
   * Format: `!pause` or `!stop`
   */
  if (message.content === "!pause" || message.content === "!stop") {
    cmd_pause({
      self,
      guildID: message.guild.id,
    });
  }

  /**
   * resume command
   *
   * Format: `!resume` pr `!start`
   */
  if (message.content === "!resume" || message.content === "!start") {
    cmd_resume({
      self,
      guildID: message.guild.id,
    });
  }
});

client.login(settings.bot.token);
