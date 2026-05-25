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
    .setDescription('Painel de criação de produto'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('🛒 CRIAR PRODUTO')
      .setDescription(`
📦 Configure seu produto usando os botões abaixo.

📝 Nome: Não definido
💸 Preço: Não definido
📄 Descrição: Não definida
🖼️ Banner: Não definido
📦 Estoque: 0 itens
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
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('produto_descricao')
          .setLabel('Descrição')
          .setStyle(ButtonStyle.Primary)
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
          .setStyle(ButtonStyle.Success)
      )

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true
    })

  }

}
