require('dotenv').config)

const fs = require('fs')

const express = require('express')

const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType
} = require('discord.js')

const app = express()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
})

client.commands = new Collection()

// 📂 CARREGAR COMANDOS
const commandFiles = fs
  .readdirSync('./commands')
  .filter(file => file.endsWith('.js'))

for(const file of commandFiles) {

  const command = require(`./commands/${file}`)

  client.commands.set(command.data.name, command)

  console.log(`✅ Comando carregado: ${command.data.name}`)
}

// 🌐 API
app.use(express.json())

app.get('/', (req, res) => {
  res.send('🟣 CERBERUS STORE ONLINE')
})

// 🤖 BOT ONLINE
const {
  REST,
  Routes
} = require('discord.js')

client.once('clientReady', async () => {

  console.log(`🟣 ${client.user.tag} ONLINE`)

  client.user.setActivity({
    name: 'CERBERUS STORE',
    type: ActivityType.Watching
  })

  // 🔥 REGISTRAR COMANDOS AUTOMÁTICO
  const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_BOT_TOKEN)

  try {

    console.log('🔄 Registrando comandos...')

    const commands = []

    client.commands.forEach(cmd => {
      commands.push(cmd.data.toJSON())
    })

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    )

    console.log('✅ Comandos registrados')

  } catch(err) {

    console.log(err)

  }

})

  console.log(`🟣 ${client.user.tag} ONLINE`)

  client.user.setActivity({
    name: 'CERBERUS STORE',
    type: ActivityType.Watching
  })

})

// ⚡ INTERAÇÕES
client.on('interactionCreate', async interaction => {

  if(!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)

  if(!command) return

  try {

    await command.execute(interaction)

  } catch(err) {

    console.log(err)

  }

})

// 🔑 LOGIN
client.login(process.env.DISCORD_BOT_TOKEN)

// 🚀 API ONLINE
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 API ONLINE')
})
