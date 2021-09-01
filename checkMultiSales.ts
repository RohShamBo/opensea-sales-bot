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
    console.log("Login to Discord Bot")
    	discordBot.login(process.env.DISCORD_BOT_TOKEN!).then().catch(reason => {
		console.log("Login failed: " + reason);
    		console.log("Token used: " + process.env.DISCORD_BOT_TOKEN!);
    	});
    discordBot.on('ready', async () => {
      console.log("Fetch channel")
      const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
      resolve(channel as TextChannel);
    });
  })
}

const buildMessage = (sale: any, buyer_name, seller_name, slug) => (
  new Discord.MessageEmbed()
	.setColor('#0099ff')
	.setTitle(sale.asset.name + ' sold for ' + `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`)
	.setURL(sale.asset.permalink)
	.setAuthor('OpenSea Bot', sale.asset.collection.image_url, 'https://opensea.io/activity/' + slug)
	.setThumbnail(sale.asset.image_url)
	.addFields(
		//{ name: 'Name', value: sale.asset.name },
		//{ name: 'Amount', value: `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`},
		//{ name: 'Buyer', value: sale?.winner_account?.user?.username, },
		//{ name: 'Seller', value: sale?.seller?.user?.username,  },
		{ name: 'Collection', value: sale.asset.collection.name, },
		{ name: 'Buyer', value: buyer_name, inline: true },
		{ name: 'Seller', value: seller_name, inline: true },
	)
  	//.setImage(sale.asset.image_url)
	.setTimestamp(Date.parse(`${sale?.created_date}Z`))
	.setFooter('Sold on OpenSea', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png')
)

async function main() {
  console.log("Discord Setup")
  const channel = await discordSetup();
  console.log("Discord Setup Complete")
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 3_600;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  const collection_slugs = [process.env.MULTI_CONTRACT_SLUG_1!, process.env.MULTI_CONTRACT_SLUG_2!,process.env.MULTI_CONTRACT_SLUG_3!]
  const collection_adds = [process.env.MULTI_CONTRACT_ADDRESS_1!, process.env.MULTI_CONTRACT_ADDRESS_2!,process.env.MULTI_CONTRACT_ADDRESS_3!]
  
  for(var i = 0; i < collection_slugs.length; i++)
  { 
    await new Promise(resolve => {
      setTimeout(resolve, 500)
    })
	  
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
      		asset_contract_address: collection_adds[i]!
  	})).then((resp) => resp.json());
	
	//console.log(openSeaResponse)
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
      		    const message = buildMessage(sale, buyer_name, seller_name, collection_slugs[i]);
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
