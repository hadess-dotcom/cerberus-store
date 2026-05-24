require('dotenv').config()

const fs = require('fs')
const express = require('express')

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType
} = require('discord.js')

const app = express()

// 🤖 CLIENTE DISCORD
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
})

// 📦 COLLECTION DE COMANDOS
client.commands = new Collection()

// 📂 CARREGAR COMANDOS
const commandFiles = fs
  .readdirSync('./commands')
  .filter(file => file.endsWith('.js'))

for (const file of commandFiles) {

  const command = require(`./commands/${file}`)

  client.commands.set(command.data.name, command)

  console.log(`✅ Comando carregado: ${command.data.name}`)
}

// 🌐 API EXPRESS
app.use(express.json())

app.get('/', (req, res) => {
  res.send('🟣 CERBERUS STORE ONLINE')
})

// 🚀 BOT ONLINE
client.once('ready', async () => {
  console.log(`🟣 ${client.user.tag} ONLINE`)

  client.user.setActivity({
    name: 'CERBERUS STORE',
    type: ActivityType.Watching
  })

  try {

    console.log('🔄 Registrando comandos...')

    const commands = client.commands.map(cmd =>
      cmd.data.toJSON()
    )

    // 🔥 REGISTRAR COMANDOS GLOBALMENTE
    await client.application.commands.set(commands)

    console.log('✅ Comandos registrados globalmente')

  } catch (err) {

    console.error('❌ ERRO AO REGISTRAR:', err)

  }

})

// ⚡ INTERAÇÕES
client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)

  if (!command) return

  try {

    await command.execute(interaction)

  } catch (err) {

    console.error(err)

    if (interaction.replied || interaction.deferred) {

      await interaction.followUp({
        content: '❌ Ocorreu um erro.',
        ephemeral: true
      })

    } else {

      await interaction.reply({
        content: '❌ Ocorreu um erro.',
        ephemeral: true
      })

    }

  }

})

// 🔑 LOGIN
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => {
    console.log('✅ LOGIN REALIZADO')
  })
  .catch(err => {
    console.error('❌ ERRO LOGIN:', err)
  })

// 🌐 SERVIDOR ONLINE
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 API ONLINE')
})
