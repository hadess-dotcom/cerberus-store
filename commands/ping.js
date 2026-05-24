const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js')

module.exports = {

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Veja o ping do bot'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong')
      .setDescription(`📡 Ping: ${interaction.client.ws.ping}ms`)
      .setColor('#7B2CBF')

    interaction.reply({
      embeds: [embed]
    })

  }

}
