class Bot {
  static client = null;
  static dispatchingBotCount = 0;

  constructor({ autoPlaylist = [], volume = 20, audioFilter = "" }) {
    this.isPlaying = false;
    this.isAutoPause = false;

    this.connectedVoiceChannel = null;
    this.connection = null;
    this.dispatcher = null;

    this.autoPlaylist = autoPlaylist;
    this.musicQueue = [];
    this.nowPlayingMusic = {
      title: "",
      url: "",
      progress: 0,
    };

    this.volume = volume / 100;
    this.audioFilter = audioFilter;

    this.intervalId = null;

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
    if (Bot.dispatchingBotCount < 1) {
      Bot.client.user.setActivity(`\u275A\u275A ${title}`, { type: "LISTENING" });
    } else if (Bot.dispatchingBotCount === 1) {
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
