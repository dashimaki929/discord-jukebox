const fs = require("fs");
const { settings } = JSON.parse(
  fs.readFileSync("./config/settings.json", "utf8")
);

const ytdl = require("discord-ytdl-core");

/**
 * Call a bot to the voice channel you are on.
 *
 * @param {*} self
 * @param {*} guildID
 * @param {*} channelID
 * @param {*} voiceChannel
 */
exports.cmd_summon = async ({ self, guildID, channelID, voiceChannel }) => {
  if (!channelID) {
    console.log(
      "[ERROR]",
      "You are not connected to voice. Try joining a voice channel!"
    );

    // TODO: return; ではなく例外を投げる
    return;
  }

  await voiceChannel.join().then((connection) => {
    self.connectedVoiceChannels[guildID] = channelID;
    self.connections[guildID] = connection;
  });
};

/**
 * Disconnect bot from connected channels in the server.
 *
 * @param {*} self
 * @param {*} guildID
 */
exports.cmd_disconnect = async ({ self, guildID }) => {
  const connection = self.connections[guildID];
  if (!connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }

  await connection.disconnect();
  delete self.connectedVoiceChannels[guildID];
  delete self.connections[guildID];
  delete self.dispatchers[guildID];
};

/**
 * Play the music in the specified url.
 *
 * @param {*} self
 * @param {*} guildID
 * @param {*} url
 */
exports.cmd_play = async ({ self, guildID, url }) => {
  const connection = self.connections[guildID];
  if (!connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }

  self.isPlaying = true;
  self.dispatchers[guildID] = connection.play(
    await ytdl(url, {
      filter: "audioonly",
      opusEncoded: true,
      encoderArgs: ["-af", "bass=g=10,dynaudnorm=f=200"],
    }),
    {
      type: "opus",
      volume: settings.player.volume / 100,
    }
  );
};

/**
 * Pause the music that is playing.
 *
 * @param {*} self
 * @param {*} guildID
 */
exports.cmd_pause = async ({ self, guildID }) => {
  const connection = self.connections[guildID];
  if (!connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }
  const dispatcher = self.dispatchers[guildID];
  if (!dispatcher) {
    // TODO: 「音楽再生中じゃねーよ」って例外を投げる
    return;
  }
  if (!self.isPlaying) {
    // TODO: 「すでに一時停止中だっつーの」って例外を投げる
    return;
  }

  dispatcher.pause();
  self.isPlaying = false;
}

/**
 * Resume the paused music.
 *
 * @param {*} self
 * @param {*} guildID
 */
exports.cmd_resume = async ({ self, guildID }) => {
  const connection = self.connections[guildID];
  if (!connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }
  const dispatcher = self.dispatchers[guildID];
  if (!dispatcher) {
    // TODO: 「音楽再生中じゃねーよ」って例外を投げる
    return;
  }
  if (self.isPlaying) {
    // TODO: 「すでに再生中だっつーの」って例外を投げる
    return;
  }

  dispatcher.resume();
  self.isPlaying = true;
}