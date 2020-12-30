const fs = require("fs");

const log4js = require("log4js");
log4js.configure("./config/log4js-config.json");
const logger = log4js.getLogger("system");

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
  init,
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

client.once("ready", () => {
  init({ _logger: logger, _settings: settings });
  console.log("Ready!");
  logger.info(">>>>>>>> MusicBot起動完了 >>>>>>>>");
});

/* ================================================
    The functions that are fired
                        from user connections.
================================================ */
client.on("voiceStateUpdate", async (oldState, newState) => {
  if (oldState.channel) {
    if (newState.channel) {
      logger.info(`${oldState.guild.name} - ${oldState.member.id}(${oldState.member.displayName}): ${oldState.channel.name} から ${newState.channel.name} へ移動しました。`);
    } else {
      logger.info(`${oldState.guild.name} - ${oldState.member.id}(${oldState.member.displayName}): ${oldState.channel.name} から切断しました。`);
    }
  } else {
    logger.info(`${newState.guild.name} - ${newState.member.id}(${newState.member.displayName}): ${newState.channel.name} へ接続しました。`);
  }

  if (oldState.channel) {
    // oldStateがある = サーバー内移動, または切断
    const bot = dispatchingBots[oldState.guild.id];
    if (!bot) {
      // botが存在しない = このサーバーにはbotがdispatchされていない
      return;
    }

    const channel = bot.connectedVoiceChannel;
    if (!channel) {
      return;
    }

    const isLeftChannel = !newState.channel || channel.id === oldState.channel.id;
    const isJoinChannel = newState.channel && channel.id === newState.channel.id;

    const members = channel.members.map(member => member.id);
    const isBotOnly = members.length === 1 && members.includes(settings.bot.id);
    if (isBotOnly) {
      if (!bot.isAutoPause && isLeftChannel) {
        logger.info(`${oldState.guild.name} - ユーザーが全員退場したため音楽の再生を一時停止します。`);
        await bot.dispatcher.pause();
        bot.isAutoPause = true;
        bot.setNowPlayingStatus(`\u275A\u275A ${bot.nowPlayingMusic.title} `);
        Bot.dispatchingBotCount--;
      }
    } else {
      if (bot.isAutoPause && isJoinChannel) {
        logger.info(`${oldState.guild.name} - ユーザーが入場したため一時停止していた音楽を再開します。`);
        await bot.dispatcher.resume();
        bot.isAutoPause = false;
        Bot.dispatchingBotCount++;
        bot.setNowPlayingStatus(`${bot.nowPlayingMusic.title} `);
      }
    }
  } else if (newState.channel) {
    // oldStateはないがnewStateはある = 新規接続
    const bot = dispatchingBots[newState.guild.id];
    if (!bot) {
      // botが存在しない = このサーバーにはbotがdispatchされていない
      return;
    }

    const channel = bot.connectedVoiceChannel;
    if (!channel) {
      return;
    }

    const isJoinChannel = channel.id === newState.channel.id;
    if (bot.isAutoPause && isJoinChannel) {
      logger.info(`${newState.guild.name} - ユーザーが入場したため一時停止していた音楽を再開します。`);
      await bot.dispatcher.resume();
      bot.isAutoPause = false;
      Bot.dispatchingBotCount++;
      bot.setNowPlayingStatus(`${bot.nowPlayingMusic.title} `);
    }
  }

  // 再生中のチャンネルが一つの場合曲名を再設定
  if (Bot.dispatchingBotCount === 1) {
    Object.keys(dispatchingBots).map((channelID) => {
      const bot = dispatchingBots[channelID];
      if (!bot.connectedVoiceChannel || bot.isAutoPause) {
        return;
      }
      bot.setNowPlayingStatus(`${bot.isPlaying ? "" : "\u275A\u275A "}${bot.nowPlayingMusic.title} `);
    });
  }
});

/* ================================================
    The functions that are fired
            from the message are defined below.
================================================ */
client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  logger.info(`${message.guild.name} - ${message.member.id}(${message.member.displayName}): ${message.content}`);

  const guildID = message.guild.id;
  let self = dispatchingBots[guildID];

  /**
   * debug command
   */
  if (message.content === "!debug") {
    console.log(dispatchingBots);
  }

  /**
   * summon command
   *
   * Format: `!summon`
   */
  if (message.content === "!summon") {
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

    cmd_summon({
      self,
      channelID: message.member.voice.channelID,
      voiceChannel: message.member.voice.channel,
    }).catch(msg => logger.warn(msg));
  }

  /**
   * disconnect command
   *
   * Format: `!disconnect`
   */
  if (message.content === "!disconnect") {
    cmd_disconnect({ self }).catch(msg => logger.warn(msg));
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
    cmd_play({ self, url }).catch(msg => logger.warn(msg));
  }

  /**
   * skip command
   *
   * Format: `!skip`
   */
  if (message.content === "!skip") {
    cmd_skip({ self }).catch(msg => logger.warn(msg));
  }

  /**
   * pause command
   *
   * Format: `!pause` or `!stop`
   */
  if (message.content === "!pause" || message.content === "!stop") {
    cmd_pause({ self }).catch(msg => logger.warn(msg));
  }

  /**
   * resume command
   *
   * Format: `!resume` or `!start`
   */
  if (message.content === "!resume" || message.content === "!start") {
    cmd_resume({ self }).catch(msg => logger.warn(msg));
  }

  /**
   * setplaylist command
   *
   * Format: `!setplaylist {PlaylistName}`
   */
  if (message.content.startsWith("!setplaylist")) {
    const [command, playlistName] = message.content.split(" ");
    cmd_setplaylist({ self, playlistName }).catch(msg => logger.warn(msg));
  }

  /**
   * setaudiofilter command
   *
   * Format: `!setaudiofilter {AudioFilter}`
   */
  if (message.content.startsWith("!setaudiofilter")) {
    const [command, audioFilter] = message.content.split(" ");
    cmd_setaudiofilter({ self, audioFilter }).catch(msg => logger.warn(msg));
  }
});

client.login(settings.bot.token);
