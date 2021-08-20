import 'dotenv/config';
import Discord, { TextChannel } from 'discord.js';

const discordBot = new Discord.Client();
console.log("Enable restart")
discordBot.destroy().then(discordBot.login(process.env.DISCORD_BOT_TOKEN));
console.log("Restart complete")

