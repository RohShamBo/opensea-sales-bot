import 'dotenv/config';
import Discord, { TextChannel } from 'discord.js';
import fetch from 'node-fetch';
import { ethers } from "ethers";
import { parseISO } from 'date-fns'


const discordBot = new Discord.Client();
const  discordSetup = async (): Promise<TextChannel> => {
  return new Promise<TextChannel>((resolve, reject) => {
    ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'].forEach((envVar) => {
      if (!process.env[envVar]) reject(`${envVar} not set`)
    })
  
    discordBot.login(process.env.DISCORD_BOT_TOKEN);
    discordBot.on('ready', async () => {
      const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
      resolve(channel as TextChannel);
    });
  })
}

const buildMessage = (listing: any, asset_name, seller_name, message_color) => (
  new Discord.MessageEmbed()
	.setColor(message_color)
	.setTitle(asset_name + ' listed for ' + `${ethers.utils.formatEther(listing.starting_price)}${listing.constants.EtherSymbol}`)
	.setURL(listing.asset.permalink)
	.setAuthor('OpenSea Bot', listing.asset.collection.image_url, 'https://opensea.io/activity/' + process.env.COLLECTION_SLUG!)
	.setThumbnail(listing.asset.image_url)
	.addFields(
		{ name: 'Seller', value: seller_name, inline: true  },
	)
	.setTimestamp(Date.parse(`${listing?.created_date}Z`))
	.setFooter('Sold on OpenSea', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png')
)

async function main() {
  const channel = await discordSetup();
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 3_600;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  const range = (start, end) => Array.from({length: (end - start)}, (v, k) => k + start);
  const options = {
 	  method: 'GET',
 	  headers: {Accept: 'application/json', 'X-API-KEY': process.env.API_KEY!}
  };
  console.log("Checking Listings")  
const openSeaResponse = await fetch(
    "https://api.opensea.io/api/v1/events?" + new URLSearchParams({
      offset: '0',
      limit: '100',
      event_type: 'created',
      only_opensea: 'false',
      occurred_after: hoursAgo.toString(), 
      collection_slug: process.env.COLLECTION_SLUG!,
      asset_contract_address: process.env.CONTRACT_ADDRESS!
  }),options).then((resp) => resp.json());
		
    await Promise.all(
    openSeaResponse?.asset_events?.reverse().map(async (listing: any) => {
      var seller_name;
	    
      if (listing?.seller?.user?.username != null) {
	      seller_name = listing?.seller?.user?.username
      } else {
	      seller_name = listing?.seller?.address
	      seller_name = seller_name.substr(0,8);
      }
      
      const asset_name = listing.asset.name != null ? listing.asset.name : (listing.asset.collection.name + ' #' + listing.asset.token_id);
      const message_color = listing?.payment_token.id == '1' ? '#0099ff' : '#BA55D3';
	    
      const message = buildMessage(listing, asset_name, seller_name, message_color);
      return channel.send(message)
    })
  );   
}

main()
  .then((res) =>{ 
    console.warn(res)
    process.exit(0)
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
