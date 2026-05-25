const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js')

// 📦 DADOS TEMPORÁRIOS
const produtos = {}

module.exports = {

  data: new SlashCommandBuilder()
    .setName('criar-produto')
    .setDescription('Sistema de produtos'),

  async execute(interaction) {

    produtos[interaction.user.id] = {
      nome: 'Não definido',
      preco: 'Não definido',
      descricao: 'Não definida',
      banner: 'Não definido',
      estoque: '0'
    }

    const produto = produtos[interaction.user.id]

    const embed = new EmbedBuilder()
      .setTitle('🛒 CRIAR PRODUTO')
      .setDescription(`
📝 Nome: ${produto.nome}
💸 Preço: ${produto.preco}
📄 Descrição: ${produto.descricao}
🖼️ Banner: ${produto.banner}
📦 Estoque: ${produto.estoque}
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

  },

  produtos

}
