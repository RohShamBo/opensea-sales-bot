import 'dotenv/config';
import Discord, { TextChannel } from 'discord.js';

const discordBot = new Discord.Client();
console.log("Enable restart")

discordBot.on('ready', async () => {
      const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
      resolve(channel as TextChannel);
    });

channel.send('Resetting...')
    .then(msg => discordBot.destroy())
    .then(() => discordBot.login(process.env.DISCORD_BOT_TOKEN));

console.log("Restart complete")

