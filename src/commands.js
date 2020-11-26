exports.cmd_summon = async ({ self, guildID, channelID, voiceChannel }) => {
  if (!channelID) {
    console.log(
      "[ERROR]",
      "You are not connected to voice. Try joining a voice channel!"
    );

    // TODO: return; ではなく例外を投げる
    return;
  }

  // すでに接続しているサーバー内の異なるチャンネルへ呼び出された場合、コネクションが残留する可能性
  await voiceChannel.join().then((connection) => {
    self.connectedVoiceChannels[guildID] = channelID;
    self.connections[channelID] = connection;
  });
};

exports.cmd_disconnect = async ({ self, guildID, channelID }) => {
  const connection = self.connections[channelID];
  if (!connection) {
    // TODO: 「指定した channelID には接続してねーよ」って例外を投げる
    return;
  }

  await connection.disconnect();
  delete self.connectedVoiceChannels[guildID];
  delete self.connections[channelID];
};
