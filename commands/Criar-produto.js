const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js')

module.exports = {

  data: new SlashCommandBuilder()
    .setName('criar-produto')
    .setDescription('Criar produto'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('🛒 CRIADOR DE PRODUTO')
      .setDescription(`
📝 Nome: Não definido
💰 Preço: Não definido
📄 Descrição: Não definida
🖼️ Banner: Não definido
📦 Estoque: 0
      `)
      .setColor('#7B2CBF')

    const row1 = new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId('produto_nome')
          .setLabel('Nome')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('produto_preco')
          .setLabel('Preço')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('produto_desc')
          .setLabel('Descrição')
          .setStyle(ButtonStyle.Secondary)

      )

    const row2 = new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId('produto_banner')
          .setLabel('Banner')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('produto_estoque')
          .setLabel('Estoque')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('produto_publicar')
          .setLabel('Publicar')
          .setStyle(ButtonStyle.Danger)

      )

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true
    })

  }

}
