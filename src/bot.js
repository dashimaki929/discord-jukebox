class Bot {
  static client = null;
  static dispatchingBotCount = 0;

  constructor({ autoPlaylist = [], audioFilter = "" }) {
    this.isPlaying = false;

    this.connectedVoiceChannel = null;
    this.connection = null;
    this.dispatcher = null;

    this.autoPlaylist = autoPlaylist;
    this.musicQueue = [];
    this.nowPlayingMusicTitle = "";

    this.audioFilter = audioFilter;

    this.initPlaylist();
  }

  initPlaylist = function () {
    const shuffle = ([...array]) => {
      for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    this.musicQueue = shuffle(this.autoPlaylist);
  };

  setNowPlayingStatus = function (title) {
    if (Bot.dispatchingBotCount === 1) {
      Bot.client.user.setActivity(title, { type: "LISTENING" });
    } else {
      Bot.client.user.setActivity(
        `${Bot.dispatchingBotCount}つのサーバーで音楽`,
        { type: "LISTENING" }
      );
    }
  };
}

module.exports = Bot;
