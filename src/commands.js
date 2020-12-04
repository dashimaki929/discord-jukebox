const fs = require("fs");
const { settings } = JSON.parse(
  fs.readFileSync("./config/settings.json", "utf8")
);

const ytdl = require("discord-ytdl-core");
const axios = require("axios");

/**
 * Call a bot to the voice channel you are on.
 *
 * @param {*} self
 * @param {*} guildID
 * @param {*} channelID
 * @param {*} voiceChannel
 */
exports.cmd_summon = async ({ self, channelID, voiceChannel }) => {
  if (!channelID) {
    console.log(
      "[ERROR]",
      "You are not connected to voice. Try joining a voice channel!"
    );

    // TODO: return; ではなく例外を投げる
    return;
  }

  await voiceChannel.join().then(async (connection) => {
    self.connectedVoiceChannel = channelID;
    self.connection = connection;

    if (!self.isPlaying) {
      await _playNext({ self });
    }
  });
};

/**
 * Disconnect bot from connected channels in the server.
 *
 * @param {*} self
 */
exports.cmd_disconnect = async ({ self }) => {
  if (!self.connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }

  await self.connection.disconnect();
};

/**
 * Play the music in the specified url.
 *
 * @param {*} self
 * @param {*} url
 */
exports.cmd_play = async ({ self, url }) => {
  if (!self.connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }

  self.musicQueue.unshift(url);
};

/**
 * Skip the currently playing music.
 *
 * @param {*} self
 */
exports.cmd_skip = async ({ self }) => {
  if (!self.connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }
  if (!self.dispatcher) {
    // TODO: 「音楽再生中じゃねーよ」って例外を投げる
    return;
  }

  self.dispatcher.end();
};

/**
 * Pause the music that is playing.
 *
 * @param {*} self
 */
exports.cmd_pause = async ({ self }) => {
  if (!self.connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }
  if (!self.dispatcher) {
    // TODO: 「音楽再生中じゃねーよ」って例外を投げる
    return;
  }
  if (!self.isPlaying) {
    // TODO: 「すでに一時停止中だっつーの」って例外を投げる
    return;
  }

  self.dispatcher.pause();
  self.isPlaying = false;
  self.setNowPlayingStatus(`\u275A\u275A ${self.nowPlayingMusicTitle} `);
};

/**
 * Resume the paused music.
 *
 * @param {*} self
 */
exports.cmd_resume = async ({ self }) => {
  if (!self.connection) {
    // TODO: 「このサーバーのボイスチャンネルにまだ接続してねーよ」って例外を投げる
    return;
  }
  if (!self.dispatcher) {
    // TODO: 「音楽再生中じゃねーよ」って例外を投げる
    return;
  }
  if (self.isPlaying) {
    // TODO: 「すでに再生中だっつーの」って例外を投げる
    return;
  }

  self.dispatcher.resume();
  self.isPlaying = true;
  self.setNowPlayingStatus(`${self.nowPlayingMusicTitle} `);
};

/**
 * Upadate the playlist.
 *
 * @param {*} self
 */
exports.cmd_setplaylist = async ({ self, playlistName }) => {
  _getPlaylistData(playlistName)
    .then((res) => {
      self.autoPlaylist = res.data.split(/\r?\n/);
      self.initPlaylist();
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * Setting audio filter.
 *
 * @param {*} self
 */
exports.cmd_setaudiofilter = async ({ self, audioFilter }) => {
  self.audioFilter = audioFilter;
};



// #================================
// #  Internal Functions
// #                defined below.
// #================================

/**
 * [Recursive] Continue to play the music.
 *
 * @param {*} self
 * @param {*} url
 */
async function _play({ self, url }) {
  const stream = await ytdl(url, {
    filter: "audioonly",
    opusEncoded: true,
    encoderArgs: [
      "-af",
      self.audioFilter,
      // "bass=g=10,dynaudnorm=f=200",
      // "equalizer=f=1000:width_type=h:width=200:g=-10",
      // "equalizer=f=440:width_type=o:width=2:g=5",
      // "equalizer=f=440:width_type=o:width=2:g=5,equalizer=f=1000:width_type=h:width=200:g=-10"
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
  self.dispatcher = self.connection
    .play(stream, {
      type: "opus",
      volume: settings.player.volume / 100,
    })
    .on("finish", () => {
      _playNext({ self });
    })
    .on("error", (error) => {
      console.error(error);
      _playNext({ self });
    });
}

/**
 * Play next music.
 *
 * @param {*} self
 */
async function _playNext({ self }) {
  self.isPlaying = false;
  self.setNowPlayingStatus("");

  if (!self.musicQueue.length) {
    self.initPlaylist();
  }

  const nextMusic = self.musicQueue.shift();
  if (nextMusic) {
    _play({ self, url: nextMusic });
  }
}

/**
 * GET playlist data.
 * 
 * @param {*} playlistName 
 */
async function _getPlaylistData(playlistName) {
  const url = "https://dashimaki.work/playlist/getMusicApi";
  return await axios.get(url, { params: { name: playlistName } });
}
