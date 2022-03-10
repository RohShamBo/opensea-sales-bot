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
      console.log(`Logged in as ${client.user.tag}!`);
	const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
        resolve(channel as TextChannel);
    });
    discordBot.on("error", (error) => {
    	console.log(error)
	throw new Error('Discord login error');
    });
    discordBot.on('debug', (e) => {
    	console.info(e);
    });
  })
}

const buildMessage = (sale: any, asset_name, buyer_name, seller_name, message_color) => (
  new Discord.MessageEmbed()
	.setColor(message_color)
	.setTitle(asset_name + ' sold for ' + `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`)
	.setURL(sale.asset.permalink)
	.setAuthor('OpenSea Bot', sale.asset.collection.image_url, 'https://opensea.io/activity/' + process.env.COLLECTION_SLUG!)
	.setThumbnail(sale.asset.image_url)
	.addFields(
		//{ name: 'Name', value: sale.asset.name },
		//{ name: 'Amount', value: `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`},
		//{ name: 'Buyer', value: sale?.winner_account?.user?.username, },
		//{ name: 'Seller', value: sale?.seller?.user?.username,  },
		{ name: 'Buyer', value: buyer_name, inline: true },
		{ name: 'Seller', value: seller_name, inline: true  },
	)
  	//.setImage(sale.asset.image_url)
	.setTimestamp(Date.parse(`${sale?.created_date}Z`))
	.setFooter('Sold on OpenSea', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png')
)

async function main() {
  const channel = await discordSetup();
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 3_600;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  const options = {
 	method: 'GET',
 	headers: {Accept: 'application/json', 'X-API-KEY': process.env.API_KEY!}
  };
  const openSeaResponse = await fetch(
    "https://api.opensea.io/api/v1/events?" + new URLSearchParams({
      offset: '0',
      limit: '100',
      event_type: 'successful',
      only_opensea: 'false',
      occurred_after: hoursAgo.toString(), 
      collection_slug: process.env.COLLECTION_SLUG!,
      asset_contract_address: process.env.CONTRACT_ADDRESS!
  }),options).then((resp) => resp.json());
	
  console.log(openSeaResponse)
	
  await Promise.all(
    openSeaResponse?.asset_events?.reverse().map(async (sale: any) => {
      var buyer_name;
      var seller_name;
	    
      if (sale?.winner_account?.user?.username != null) {
	      buyer_name = sale?.winner_account?.user?.username
      } else {
	      buyer_name = sale?.winner_account?.address
	      buyer_name = buyer_name.substr(0,8);
      }
	    
      if (sale?.seller?.user?.username != null) {
	      seller_name = sale?.seller?.user?.username
      } else {
	      seller_name = sale?.seller?.address
	      seller_name = seller_name.substr(0,8);
      }
      
      const asset_name = sale.asset.name != null ? sale.asset.name : (sale.asset.collection.name + ' #' + sale.asset.token_id);
      const message_color = sale?.payment_token.id == '1' ? '#0099ff' : '#BA55D3';
	    
      const message = buildMessage(sale, asset_name, buyer_name, seller_name, message_color);
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
