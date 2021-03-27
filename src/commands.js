const fs = require("fs");
const ytdl = require("discord-ytdl-core");
const axios = require("axios");

let logger = null;
let settings = null;

exports.init = ({ _logger, _settings }) => {
  logger = _logger;
  settings = _settings;
}

/**
 * Call a bot to the voice channel you are on.
 *
 * @param {*} self
 * @param {*} guildID
 * @param {*} channelID
 * @param {*} voiceChannel
 */
exports.cmd_summon = async ({ self = {}, channelID, voiceChannel }) => {
  if (!channelID || !voiceChannel) {
    throw "ユーザーがチャンネルに未接続状態のためこのコマンドは実行できません。";
  }

  await voiceChannel.join().then(async (connection) => {
    self.connectedVoiceChannel = voiceChannel;
    self.connection = connection;

    if (!self.intervalId) {
      // 時報タイマー設定
      self.intervalId = setInterval(() => {
        _timeSignal({ self });
      }, 1000);
    }

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
exports.cmd_disconnect = async ({ self = {} }) => {
  if (!self.connection) {
    throw "このサーバーのボイスチャンネルにはまだ接続していないためこのコマンドは実行できません。";
  }

  clearInterval(self.intervalId);
  self.intervalId = null;
  await self.connection.disconnect();
};

/**
 * Play the music in the specified url.
 *
 * @param {*} self
 * @param {*} url
 */
exports.cmd_play = async ({ self = {}, url }) => {
  if (!self.connection) {
    throw "このサーバーのボイスチャンネルにはまだ接続していないためこのコマンドは実行できません。";
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
    throw "このサーバーのボイスチャンネルにはまだ接続していないためこのコマンドは実行できません。";
  }
  if (!self.dispatcher) {
    throw "音楽を再生中ではないためこのコマンドは実行できません。";
  }

  await self.dispatcher.end();
};

/**
 * Pause the music that is playing.
 *
 * @param {*} self
 */
exports.cmd_pause = async ({ self = {} }) => {
  if (!self.connection) {
    throw "このサーバーのボイスチャンネルにはまだ接続していないためこのコマンドは実行できません。";
  }
  if (!self.dispatcher) {
    throw "音楽を再生中ではないためこのコマンドは実行できません。";
  }
  if (!self.isPlaying) {
    throw "すでに音楽を停止中のためこのコマンドは実行できません。";
  }

  await self.dispatcher.pause();
  clearInterval(self.intervalId);
  self.intervalId = null;

  self.isPlaying = false;
  self.setNowPlayingStatus(`\u275A\u275A ${self.nowPlayingMusic.title} `);
};

/**
 * Resume the paused music.
 *
 * @param {*} self
 */
exports.cmd_resume = async ({ self = {} }) => {
  if (!self.connection) {
    throw "このサーバーのボイスチャンネルにはまだ接続していないためこのコマンドは実行できません。";
  }
  if (!self.dispatcher) {
    throw "音楽を再生中ではないためこのコマンドは実行できません。";
  }
  if (self.isPlaying) {
    throw "すでに音楽を再生中のためこのコマンドは実行できません。";
  }

  await self.dispatcher.resume();
  if (!self.intervalId) {
    // 時報タイマー設定
    self.intervalId = setInterval(() => {
      _timeSignal({ self });
    }, 1000);
  }

  self.isPlaying = true;
  self.setNowPlayingStatus(`${self.nowPlayingMusic.title} `);
};

/**
 * Upadate the playlist.
 *
 * @param {*} self
 */
exports.cmd_setplaylist = async ({ self = {}, playlistName }) => {
  _getPlaylistData(playlistName)
    .then((res) => {
      self.autoPlaylist = res.data.split(/\r?\n/);
      self.initPlaylist();
      logger.info(`プレイリストを「${playlistName}」へ更新しました。`);
    })
    .catch((err) => {
      logger.error(err);
      logger.error(`プレイリストの更新に失敗しました。プレイリスト名が間違えているか、時間をおいて再度試してみてください。`);
    });
};

/**
 * Setting audio filter.
 *
 * @param {*} self
 */
exports.cmd_setaudiofilter = async ({ self = {}, audioFilter }) => {
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
async function _play({ self, url, volume = self.volume, progress = 0 }) {
  if (!progress) {
    const seekQuery = url.match(/t=[0-9]+/);
    if (seekQuery) {
      const [key, value] = seekQuery[0].split("=");
      progress = value;
    }
  }

  const stream = await ytdl(url, {
    filter: "audioonly",
    opusEncoded: true,
    seek: progress,
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
    const _info = {
      title: info.videoDetails.title,
      lengthSeconds: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author,
      media: info.videoDetails.media,
      video_url: info.videoDetails.video_url,
      thumbnails: info.videoDetails.thumbnails,
    }

    logger.info(`次の音楽 >>>> ${_info.title}`);
    logger.debug(_info);

    self.nowPlayingMusic.title = _info.title;
    self.setNowPlayingStatus(`${_info.title} `);
  });

  self.isPlaying = true;
  self.dispatcher = self.connection
    .play(stream, {
      type: "opus",
      volume,
    })
    .on("start", () => {
      self.nowPlayingMusic.progress = progress;
    })
    .on("finish", () => {
      _playNext({ self });
    })
    .on("error", (error) => {
      logger.error(`音楽の再生に失敗しました。`);
      logger.error(error);
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
  self.nowPlayingMusic.url = nextMusic;
  if (nextMusic) {
    _play({ self, url: nextMusic });
  }
}

/**
 * Sound the Timesignal(alerm) every hour.
 *
 * @param {*} self
 */
async function _timeSignal({ self }) {
  const now = new Date();
  if (now.getMinutes() === 59 && now.getSeconds() === 55 && self.isPlaying && !self.isAutoPause) {
    _fadeOut({
      self,
      callback: async () => {
        await self.dispatcher.pause();
        await self.connection
          .play(fs.createReadStream("./mp3/jihou.mp3"), {
            volume: self.volume * 1.5,
          })
          .on("finish", async () => {
            self.nowPlayingMusic.progress -= 5;
            await _play({
              self,
              url: self.nowPlayingMusic.url,
              volume: 0,
              progress: self.nowPlayingMusic.progress,
            });
            await _fadeIn({ self });
          });
      },
    });
  } else {
    self.nowPlayingMusic.progress++;
  }
}

async function _fadeOut({ self, duration = 2000, x = 0, callback = () => { } }) {
  if (x <= 1) {
    setTimeout(() => {
      const y = Math.round(x * x * 100) / 100;
      self.dispatcher.setVolume(
        (self.volume * Math.round((1 - y) * 100)) / 100
      );
      _fadeOut({ self, duration, x: (x += 0.1), callback });
    }, duration / 10);
  } else {
    callback();
    return Promise.resolve();
  }
}

async function _fadeIn({ self, duration = 2000, x = 0, callback = () => { } }) {
  if (x <= 1) {
    setTimeout(() => {
      const y = Math.round(x * x * 100) / 100;
      self.dispatcher.setVolume((self.volume * Math.round(y * 100)) / 100);
      _fadeIn({ self, duration, x: (x += 0.1), callback });
    }, duration / 10);
  } else {
    callback();
    return Promise.resolve();
  }
}

/**
 * GET playlist data.
 *
 * @param {*} playlistName
 */
async function _getPlaylistData(playlistName) {
  const url = "https://dashimaki.work/playlist/getMusicApi";
  logger.info(`FETCH: ${url}, { params: {name: ${playlistName}} }`);
  return await axios.get(url, { params: { name: playlistName } });
}

exports.timeSignal = _timeSignal;
