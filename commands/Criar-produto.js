const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js')

module.exports = {

  data: new SlashCommandBuilder()
    .setName('criar-produto')
    .setDescription('Crie um produto')
    .addStringOption(option =>
      option
        .setName('nome')
        .setDescription('Nome do produto')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('preco')
        .setDescription('Preço')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('descricao')
        .setDescription('Descrição')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('banner')
        .setDescription('Link da imagem')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const nome = interaction.options.getString('nome')
    const preco = interaction.options.getNumber('preco')
    const descricao = interaction.options.getString('descricao')
    const banner = interaction.options.getString('banner')

    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${nome}`)
      .setDescription(descricao)
      .addFields(
        {
          name: '💸 Preço',
          value: `R$ ${preco.toFixed(2)}`,
          inline: true
        },
        {
          name: '📦 Estoque',
          value: '∞',
          inline: true
        }
      )
      .setColor('#7B2CBF')
      .setFooter({
        text: 'CERBERUS STORE'
      })

    if(banner) embed.setImage(banner)

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('comprar')
          .setLabel('Comprar')
          .setEmoji('🛒')
          .setStyle(ButtonStyle.Success)
      )

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    })

    interaction.reply({
      content: '✅ Produto criado',
      ephemeral: true
    })

  }

}
