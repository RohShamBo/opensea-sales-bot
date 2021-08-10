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

const buildMessage = (sale: any, buyer_name, seller_name) => (
  new Discord.MessageEmbed()
	.setColor('#0099ff')
	.setTitle(sale.asset.name + ' sold for ' + `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`)
	.setURL(sale.asset.permalink)
	.setAuthor('OpenSea Bot', sale.asset.collection.image_url, 'https://opensea.io/activity/' + process.env.COLLECTION_SLUG!)
	.setThumbnail(sale.asset.image_url)
	.addFields(
		//{ name: 'Name', value: sale.asset.name },
		//{ name: 'Amount', value: `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`},
		//{ name: 'Buyer', value: sale?.winner_account?.user?.username, },
		//{ name: 'Seller', value: sale?.seller?.user?.username,  },
		{ name: 'Buyer', value: buyer_name, },
		{ name: 'Seller', value: seller_name,  },
	)
  	//.setImage(sale.asset.image_url)
	.setTimestamp(Date.parse(`${sale?.created_date}Z`))
	.setFooter('Sold on OpenSea', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png')
)

async function main() {
  const channel = await discordSetup();
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 3_600;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  const collection_slugs = [process.env.MULTI_CONTRACT_SLUG_1!, process.env.MULTI_CONTRACT_SLUG_2!,process.env.MULTI_CONTRACT_SLUG_3!]
  const collection_adds = [process.env.MULTI_CONTRACT_ADDRESS_1!, process.env.MULTI_CONTRACT_ADDRESS_2!,process.env.MULTI_CONTRACT_ADDRESS_3!]
  
  for(var i = 0; i < collection_slugs.length; i++)
  { 
    console.log(collection_slugs[i]); 
    console.log(collection_adds[i]); 
    if(collection_slugs[i] != '') {                    
  	const openSeaResponse = await fetch(
    		"https://api.opensea.io/api/v1/events?" + new URLSearchParams({
     		 offset: '0',
      		limit: '100',
      		event_type: 'successful',
      		only_opensea: 'false',
      		occurred_after: hoursAgo.toString(), 
      		collection_slug: collection_slugs[i],
      		contract_address: collection_adds[i]!
  	})).then((resp) => resp.json());

  	await Promise.all(
    		openSeaResponse?.asset_events?.reverse().map(async (sale: any) => {
      			const buyer_name = sale?.winner_account?.user?.username != null ? sale?.winner_account?.user?.username : sale?.winner_account?.address;
      			const seller_name = sale?.seller?.user?.username != null ? sale?.seller?.user?.username : sale?.seller?.address;
      			const message = buildMessage(sale, buyer_name, seller_name);
      			return channel.send(message)
    		})
  	); 
    } else {
	console.log("no entry")
    }
  }
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
