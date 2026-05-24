require('dotenv').config()

require('./deploy-commands')

const fs = require('fs')
const express = require('express')

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType
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

// 🤖 DISCORD CLIENT
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

  }

})

// 🔑 LOGIN
client.login(process.env.DISCORD_BOT_TOKEN)
