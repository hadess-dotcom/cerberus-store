const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js')

module.exports = {

  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Veja seu avatar'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Avatar de ${interaction.user.username}`)
      .setImage(interaction.user.displayAvatarURL({ size: 1024 }))
      .setColor('#7B2CBF')

    await interaction.reply({
      embeds: [embed]
    })

  }

}
