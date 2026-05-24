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
GatewayIntentBits.GuildMembers
]
})

app.get('/', (req, res) => {
res.send('🟣 CERBERUS STORE ONLINE')
})

client.once('ready', () => {

console.log("🟣 ${client.user.tag} ONLINE")

client.user.setActivity({
name: 'CERBERUS STORE',
type: ActivityType.Watching
})
})

client.login(process.env.DISCORD_BOT_TOKEN)

app.listen(process.env.PORT || 3000, () => {
console.log('🌐 API ONLINE')
})
