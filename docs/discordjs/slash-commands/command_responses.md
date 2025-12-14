Command Responses

The most common way of sending a response is by using the ChatInputCommandInteraction#reply() method, as you have done in earlier examples. This method acknowledges the interaction and sends a new message in response.
commands/utility/ping.js

module.exports = {
 data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
 async execute(interaction) {
  await interaction.reply('Pong!'); 
 },
};

Initially an interaction token is only valid for three seconds, so that's the timeframe in which you are able to use the ChatInputCommandInteraction#reply() method. Responses that require more time ("Deferred Responses") are explained later on this page.
Ephemeral responses

You may not always want everyone who has access to the channel to see a slash command's response. Previously, you would have had to DM the user to achieve this, potentially encountering the high rate limits associated with DM messages, or simply being unable to do so, if the user's DMs were disabled.

Thankfully, Discord provides a way to hide response messages from everyone but the executor of the slash command. This is called an ephemeral message and can be set by providing flags: MessageFlags.Ephemeral in the InteractionReplyOptions, as follows:

client.on(Events.InteractionCreate, async (interaction) => {
 if (!interaction.isChatInputCommand()) return;

 if (interaction.commandName === 'ping') {
  await interaction.reply('Pong!'); 
  await interaction.reply({ content: 'Secret Pong!', flags: MessageFlags.Ephemeral }); 
 }
});

Ephemeral responses are only available for interaction responses; another great reason to use the new and improved slash command user interface.
Editing responses

After you've sent an initial response, you may want to edit that response for various reasons. This can be achieved with the ChatInputCommandInteraction#editReply() method:

After the initial response, an interaction token is valid for 15 minutes, so this is the timeframe in which you can edit the response and send follow-up messages. You also cannot edit the ephemeral state of a message, so make sure that your first response sets this correctly.

client.on(Events.InteractionCreate, async (interaction) => {
 if (!interaction.isChatInputCommand()) return;

 if (interaction.commandName === 'ping') {
  await interaction.reply('Pong!');
  // do something that requires time (database queries, api requests, ...)
  await interaction.editReply('Pong again!'); 
 }
});

In fact, editing your interaction response is necessary to calculate the ping properly for this command.
Deferred responses

As previously mentioned, Discord requires an acknowledgement from your bot within three seconds that the interaction was received. Otherwise, Discord considers the interaction to have failed and the token becomes invalid. But what if you have a command that performs a task which takes longer than three seconds before being able to reply?

In this case, you can make use of the ChatInputCommandInteraction#deferReply() method, which triggers the <application> is thinking... message. This also acts as the initial response, to confirm to Discord that the interaction was received successfully and gives you a 15-minute timeframe to complete your tasks before responding.

client.on(Events.InteractionCreate, async (interaction) => {
 if (!interaction.isChatInputCommand()) return;

 if (interaction.commandName === 'ping') {
  await interaction.deferReply(); 
  // you can do things that take time here (database queries, api requests, ...) that you need for the initial response
  // you can take up to 15 minutes, then the interaction token becomes invalid!
  await interaction.editReply('Pong!'); 
 }
});

If you have a command that performs longer tasks, be sure to call deferReply() as early as possible.

Note that if you want your response to be ephemeral, utilize flags from InteractionDeferReplyOptions here:

await interaction.deferReply({ flags: MessageFlags.Ephemeral });

It is not possible to edit a reply to change its ephemeral state once sent.

If you want to make a proper ping command, one is available in our FAQ.
Follow-ups

The reply() and deferReply() methods are both initial responses, which tell Discord that your bot successfully received the interaction, but cannot be used to send additional messages. This is where follow-up messages come in. After having initially responded to an interaction, you can use ChatInputCommandInteraction#followUp() to send additional messages:

After the initial response, an interaction token is valid for 15 minutes, so this is the timeframe in which you can edit the response and send follow-up messages.

client.on(Events.InteractionCreate, async (interaction) => {
 if (!interaction.isChatInputCommand()) return;

 if (interaction.commandName === 'ping') {
  await interaction.reply('Pong!');
  await interaction.followUp('Pong again!');
 }
});

You can also pass the ephemeral flag to the InteractionReplyOptions:

await interaction.followUp({ content: 'Pong again!', flags: MessageFlags.Ephemeral });

Note that if you use followUp() after a deferReply(), the first follow-up will edit the <application> is thinking message rather than sending a new one.

That's all, now you know everything there is to know on how to reply to slash commands!
Interaction responses can use masked links (e.g. [text](http://site.com)) in the message content.
Fetching and deleting responses

In addition to replying to a slash command, you may also want to delete the initial reply. You can use ChatInputCommandInteraction#deleteReply() for this:

await interaction.reply('Pong!');
await interaction.deleteReply();

Lastly, you may require the Message object of a reply for various reasons, such as adding reactions. Pass withResponse: true to obtain the InteractionCallbackResponse. You can then access the Message object like so:

const response = await interaction.reply({ content: 'Pong!', withResponse: true });
console.log(response.resource.message);

You can also use the ChatInputCommandInteraction#fetchReply() method to fetch the Message instance. Do note that this incurs an extra API call in comparison to withResponse: true:

await interaction.reply('Pong!');
const message = await interaction.fetchReply();
console.log(message);

Localized responses

In addition to the ability to provide localized command definitions, you can also localize your responses. To do this, get the locale of the user with ChatInputCommandInteraction#locale and respond accordingly:

client.on(Events.InteractionCreate, (interaction) => {
 const locales = {
  pl: 'Witaj Świecie!',
  de: 'Hallo Welt!',
 };
 interaction.reply(locales[interaction.locale] ?? 'Hello World (default is english)');
});