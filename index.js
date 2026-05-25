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
  ActionRowBuilder
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

    console.log('❌ ERRO AO REGISTRAR:')
    console.log(err)

  }

})

// ⚡ INTERAÇÕES
client.on('interactionCreate', async interaction => {

  // 📌 SLASH COMMANDS
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
          .setTitle('Configurar Nome')

        const input = new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('Digite o nome do produto')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)

        const row = new ActionRowBuilder().addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 💰 PREÇO
      if (interaction.customId === 'produto_preco') {

        const modal = new ModalBuilder()
          .setCustomId('modal_preco')
          .setTitle('Configurar Preço')

        const input = new TextInputBuilder()
          .setCustomId('preco')
          .setLabel('Digite o preço')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)

        const row = new ActionRowBuilder().addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

      // 📄 DESCRIÇÃO
      if (interaction.customId === 'produto_desc') {

        const modal = new ModalBuilder()
          .setCustomId('modal_desc')
          .setTitle('Configurar Descrição')

        const input = new TextInputBuilder()
          .setCustomId('desc')
          .setLabel('Digite a descrição')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)

        const row = new ActionRowBuilder().addComponents(input)

        modal.addComponents(row)

        await interaction.showModal(modal)

      }

    } catch (err) {

      console.error(err)

    }

  }

  // 📥 MODAIS
  if (interaction.isModalSubmit()) {

    try {

      // 📝 NOME
      if (interaction.customId === 'modal_nome') {

        const nome = interaction.fields.getTextInputValue('nome')

        await interaction.reply({
          content: `✅ Nome definido: ${nome}`,
          ephemeral: true
        })

      }

      // 💰 PREÇO
      if (interaction.customId === 'modal_preco') {

        const preco = interaction.fields.getTextInputValue('preco')

        await interaction.reply({
          content: `✅ Preço definido: ${preco}`,
          ephemeral: true
        })

      }

      // 📄 DESCRIÇÃO
      if (interaction.customId === 'modal_desc') {

        const desc = interaction.fields.getTextInputValue('desc')

        await interaction.reply({
          content: `✅ Descrição definida:\n${desc}`,
          ephemeral: true
        })

      }

    } catch (err) {

      console.error(err)

    }

  }

})

// 🔑 LOGIN
client.login(process.env.DISCORD_BOT_TOKEN)
