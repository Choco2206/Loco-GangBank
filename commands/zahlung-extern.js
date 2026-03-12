const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');
const { getCurrentYear, getTransactionYear } = require('../utils/year');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zahlung-extern')
    .setDescription('Markiert eine Zahlung als extern beglichen, ohne die Kasse zu verändern')
    .addUserOption(option =>
      option
        .setName('spieler')
        .setDescription('Spieler, für den die externe Zahlung eingetragen wird')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Art der externen Zahlung')
        .setRequired(true)
        .addChoices(
          { name: 'Jahresbeitrag', value: 'jahresbeitrag' },
          { name: 'Strafe', value: 'strafe' }
        )
    )
    .addStringOption(option =>
      option
        .setName('notiz')
        .setDescription('Warum extern bezahlt wurde')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    try {
      const user = interaction.options.getUser('spieler');
      const grund = interaction.options.getString('grund');
      const notiz = interaction.options.getString('notiz');

      const transactions = readJson('data/transactions.json', []);
      const currentYear = getCurrentYear();

      const transaktionenChannel = await client.channels.fetch(
        process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID
      );

      const bereitsErfuellt = transactions.some(
        tx =>
          tx.userId === user.id &&
          tx.reason === grund &&
          ['bezahlt', 'extern_bezahlt'].includes(tx.status) &&
          getTransactionYear(tx, currentYear) === currentYear
      );

      if (bereitsErfuellt) {
        return interaction.reply({
          content: `❌ ${user.username} hat ${grund} für ${currentYear} bereits als erledigt eingetragen.`,
          ephemeral: true
        });
      }

      const neueTransaktion = {
        id: generateId('txn'),
        userId: user.id,
        name: user.username,
        type: 'income',
        amount: 0,
        reason: grund,
        note: `Extern beglichen | ${notiz}`,
        status: 'extern_bezahlt',
        year: currentYear
      };

      transactions.push(neueTransaktion);
      writeJson('data/transactions.json', transactions);

      if (transaktionenChannel) {
        await transaktionenChannel.send(
          `📒 **Externe Zahlung eingetragen**\n\n` +
          `Spieler: <@${user.id}>\n` +
          `Typ: ${grund}\n` +
          `Jahr: ${currentYear}\n` +
          `Betrag für Kasse: 0 €\n` +
          `Status: extern bezahlt\n` +
          `Notiz: ${notiz}`
        );
      }

      await updateOverview(client);

      return interaction.reply({
        content: `✅ ${grund} für ${user.username} wurde als extern bezahlt markiert.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Fehler bei /zahlung-extern:', error);

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: '❌ Beim Eintragen der externen Zahlung ist ein Fehler aufgetreten.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content: '❌ Beim Eintragen der externen Zahlung ist ein Fehler aufgetreten.',
        ephemeral: true
      });
    }
  }
};