const { EmbedBuilder, WebhookClient } = require('discord.js');
const { webhook_url } = require('./config.json');

const webhookClient = new WebhookClient({ url: webhook_url });

const embed = new EmbedBuilder()
	.setTitle('Test Embed Title')
	.setColor(0x00FFFF);

webhookClient.send({
	content: 'Webhook test',
	username: 'test',
	avatarURL: 'https://i.imgur.com/AfFp7pu.png',
	embeds: [embed],
});
