const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./config/settings.json", "utf8"));
const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core-discord");
const joiningVoiceChannels = {};

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
    if (message.member.voice.channel) {
      setVCConnection(message.member.voice.channel, message.guild.id);
    }
  }

  /**
   * leave command
   *
   * Format: `!leave`
   */
  if (message.content === "!leave") {
    const connection = await getVCConnection(
      message.member.voice.channel,
      message.guild.id
    );
    connection.channel.leave();
  }

  /**
   * play command
   *
   * Format: `!play {URL}`
   */
  if (message.content.startsWith("!play")) {
    const [command, url] = message.content.split(" ");

    const connection = await getVCConnection(
      message.member.voice.channel,
      message.guild.id
    );

    // TODO: ytdl-core-discord ではなく ytdl-core ライブラリへ変更, localから読み込み後再生へ変更
    connection.play(await ytdl(url), { type: "opus" });
  }
});

client.login(config.settings.bot.token);

/**
 * 接続中のボイスチャットコネクションを取得
 * 
 * @param {*} channel 
 * @param {*} guildId 
 */
async function getVCConnection(channel, guildId) {
  if (!joiningVoiceChannels[guildId]) {
    await setVCConnection(channel, guildId);
  }

  return joiningVoiceChannels[guildId];
}
function setVCConnection(channel, guildId) {
  channel.join().then((connection) => {
    joiningVoiceChannels[guildId] = connection;
  });
}
