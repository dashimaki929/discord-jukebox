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

  await voiceChannel.join().then(async (connection) => {
    self.connectedVoiceChannels[guildID] = channelID;
    self.connections[guildID] = connection;

    if (!self.isPlaying) {
      await _playAuto({ self, connection, guildID });
    }
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
  self.isPlaying = false;
  delete self.connectedVoiceChannels[guildID];
  delete self.connections[guildID];
  delete self.dispatchers[guildID];
};

/**
 * Play the music in the specified url.
 *
 * @param {*} self
 * @param {*} guildID
 */
exports.cmd_play = async ({ self, guildID, url }) => {
  const connection = self.connections[guildID];
  if (!connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }

  self.musicQueue.push(url);
};

/**
 * Skip the currently playing music.
 *
 * @param {*} self
 * @param {*} guildID
 */
exports.cmd_skip = async ({ self, guildID }) => {
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

  dispatcher.end();
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
  self.setNowPlayingStatus(`\u275A\u275A ${self.nowPlayingMusicTitle} `);
};

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
  self.setNowPlayingStatus(`${self.nowPlayingMusicTitle} `);
};

// #================================
// #  Internal Functions
// #                defined below.
// #================================

/**
 * [Recursive] Continue to play the music.
 *
 * @param {*} self
 * @param {*} connection
 * @param {*} guildID
 * @param {*} url
 */
async function _play({ self, connection, guildID, url }) {
  const stream = await ytdl(url, {
    filter: "audioonly",
    opusEncoded: true,
    encoderArgs: [
      "-af",
      settings.player.filter,
      // "bass=g=10,dynaudnorm=f=200",
      // "equalizer=f=1000:width_type=h:width=200:g=-10",
      // "equalizer=f=440:width_type=o:width=2:g=5",
      // "equalizer=f=40:width_type=h:width=50:g=<gain>",
      // "bass=g=3:f=110:w=0.6",
    ],
    requestOptions: {
      headers: {
        Cookie: settings.headers.cookie,
      },
    },
  });

  stream.on("info", (info) => {
    self.nowPlayingMusicTitle = info.videoDetails.title;
    self.setNowPlayingStatus(`${info.videoDetails.title} `);
  });

  self.isPlaying = true;
  self.dispatchers[guildID] = connection
    .play(stream, {
      type: "opus",
      volume: settings.player.volume / 100,
    })
    .on("finish", () => {
      self.isPlaying = false;
      self.setNowPlayingStatus("");

      const nextMusic = self.musicQueue.shift();
      if (nextMusic) {
        _play({ self, connection, guildID, url: nextMusic });
      } else {
        _playAuto({ self, connection, guildID });
      }
    })
    .on("error", (error) => console.error(error));
}

/**
 * Manage auto playlists.
 *
 * @param {*} self
 * @param {*} connection
 * @param {*} guildID
 */
async function _playAuto({ self, connection, guildID }) {
  if (!self.autoPlaylist.length) {
    self.initPlaylist();
  }

  const nextMusic = self.autoPlaylist.shift();
  if (nextMusic) {
    _play({ self, connection, guildID, url: nextMusic });
  }
}
