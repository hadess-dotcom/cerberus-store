require('dotenv').config()

const fs = require('fs')
const express = require('express')

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
  REST,
  Routes
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
