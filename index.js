require('dotenv').config()

const fs = require('fs')
const express = require('express')

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js')

// 🌐 EXPRESS
const app = express()

app.get('/', (req, res) => {
  res.send('🟣 CERBERUS STORE ONLINE')
})

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 API ONLINE NA PORTA ${PORT}`)
})

// 🤖 CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
})

// 📦 COMANDOS
client.commands = new Collection()

const commandFiles = fs
  .readdirSync('./commands')
  .filter(file => file.endsWith('.js'))

for (const file of commandFiles) {

  const command = require(`./commands/${file}`)

  client.commands.set(command.data.name, command)

  console.log(`✅ Comando carregado: ${command.data.name}`)
}

// 🚀 READY
client.once('ready', async () => {

  console.log(`🟣 ${client.user.tag} ONLINE`)

  client.user.setActivity({
    name: 'CERBERUS STORE',
    type: ActivityType.Watching
  })

  try {

    console.log('🔄 Registrando comandos...')

    const commands = []

    client.commands.forEach(cmd => {

      commands.push(cmd.data.toJSON())

      console.log(`✅ Registrado: ${cmd.data.name}`)

    })

    const rest = new REST({ version: '10' })
      .setToken(process.env.DISCORD_BOT_TOKEN)

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    )

    console.log('✅ Comandos registrados')

  } catch (err) {

    console.log(err)

  }

})

// 🛒 PRODUTOS TEMPORÁRIOS
const produtos = {}

// ⚡ INTERAÇÕES
client.on('interactionCreate', async interaction => {

  // 📌 COMANDOS
  if (interaction.isChatInputCommand()) {

    const command = client.commands.get(interaction.commandName)

    if (!command) return

    try {

      await command.execute(interaction)

    } catch (err) {

      console.error(err)

    }

  }

  // 🔘 BOTÕES
  if (interaction.isButton()) {

    try {

      // 📝 NOME
      if (interaction.customId === 'produto_nome') {

        const modal = new ModalBuilder()
          .setCustomId('modal_nome')
          .setTitle('Nome do Produto')

        const input = new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('Digite o nome')
          .setStyle(TextInputStyle.Short)

        const row = new ActionRowBuilder()
          .addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 💰 PREÇO
      if (interaction.customId === 'produto_preco') {

        const modal = new ModalBuilder()
          .setCustomId('modal_preco')
          .setTitle('Preço do Produto')

        const input = new TextInputBuilder()
          .setCustomId('preco')
          .setLabel('Digite o preço')
          .setStyle(TextInputStyle.Short)

        const row = new ActionRowBuilder()
          .addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 📄 DESCRIÇÃO
      if (interaction.customId === 'produto_desc') {

        const modal = new ModalBuilder()
          .setCustomId('modal_desc')
          .setTitle('Descrição')

        const input = new TextInputBuilder()
          .setCustomId('desc')
          .setLabel('Digite a descrição')
          .setStyle(TextInputStyle.Paragraph)

        const row = new ActionRowBuilder()
          .addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 🖼️ BANNER
      if (interaction.customId === 'produto_banner') {

        const modal = new ModalBuilder()
          .setCustomId('modal_banner')
          .setTitle('Banner')

        const input = new TextInputBuilder()
          .setCustomId('banner')
          .setLabel('Link da imagem')
          .setStyle(TextInputStyle.Short)

        const row = new ActionRowBuilder()
          .addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 📦 ESTOQUE
      if (interaction.customId === 'produto_estoque') {

        const modal = new ModalBuilder()
          .setCustomId('modal_estoque')
          .setTitle('Estoque')

        const input = new TextInputBuilder()
          .setCustomId('estoque')
          .setLabel('Quantidade')
          .setStyle(TextInputStyle.Short)

        const row = new ActionRowBuilder()
          .addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 🚀 PUBLICAR
      if (interaction.customId === 'produto_publicar') {

        const produto = produtos[interaction.user.id]

        const embed = new EmbedBuilder()
          .setTitle(`🛒 ${produto.nome}`)
          .setDescription(produto.desc)
          .addFields(
            {
              name: '💰 Preço',
              value: produto.preco || 'Não definido'
            },
            {
              name: '📦 Estoque',
              value: produto.estoque || '0'
            }
          )
          .setImage(produto.banner)
          .setColor('#7B2CBF')

        await interaction.channel.send({
          embeds: [embed]
        })

        await interaction.reply({
          content: '✅ Produto publicado!',
          ephemeral: true
        })

      }

    } catch (err) {

      console.error(err)

    }

  }

  // 📥 MODAIS
  if (interaction.isModalSubmit()) {

    if (!produtos[interaction.user.id]) {

      produtos[interaction.user.id] = {}

    }

    const produto = produtos[interaction.user.id]

    // 📝 NOME
    if (interaction.customId === 'modal_nome') {

      produto.nome =
        interaction.fields.getTextInputValue('nome')

    }

    // 💰 PREÇO
    if (interaction.customId === 'modal_preco') {

      produto.preco =
        interaction.fields.getTextInputValue('preco')

    }

    // 📄 DESCRIÇÃO
    if (interaction.customId === 'modal_desc') {

      produto.desc =
        interaction.fields.getTextInputValue('desc')

    }

    // 🖼️ BANNER
    if (interaction.customId === 'modal_banner') {

      produto.banner =
        interaction.fields.getTextInputValue('banner')

    }

    // 📦 ESTOQUE
    if (interaction.customId === 'modal_estoque') {

      produto.estoque =
        interaction.fields.getTextInputValue('estoque')

    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 CRIADOR DE PRODUTO')
      .setDescription(`
📝 Nome: ${produto.nome || 'Não definido'}
💰 Preço: ${produto.preco || 'Não definido'}
📄 Descrição: ${produto.desc || 'Não definida'}
🖼️ Banner: ${produto.banner || 'Não definido'}
📦 Estoque: ${produto.estoque || '0'}
      `)
      .setColor('#7B2CBF')

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    })

  }

})

// 🔑 LOGIN
client.login(process.env.DISCORD_BOT_TOKEN)
