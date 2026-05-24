require('dotenv').config()

const express = require('express')

const {
  Client,
  GatewayIntentBits,
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

app.use(express.json())

// 🌐 Rota principal
app.get('/', (req, res) => {
  res.send('🟣 CERBERUS STORE ONLINE')
})

// 🤖 Bot pronto
client.once('clientReady', () => {

  console.log(`🟣 ${client.user.tag} ONLINE`)

  client.user.setActivity({
    name: 'CERBERUS STORE',
    type: ActivityType.Watching
  })

})

// 🔑 Login bot
client.login(process.env.DISCORD_BOT_TOKEN)

// 🚀 API online
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 API ONLINE')
})
