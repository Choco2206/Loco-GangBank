const { readJson } = require('./helpers');

function calculateOverview() {
  const members = readJson('data/members.json');
  const transactions = readJson('data/transactions.json');
  const config = readJson('data/config.json');

  const activeMembers = members.filter(member => member.active);

  const totalIncome = transactions
    .filter(tx => tx.type === 'income' && tx.status === 'bezahlt')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpenses;

  const openYearlyFees = activeMembers.filter(member => {
    return !transactions.some(tx =>
      tx.userId === member.userId &&
      tx.reason === 'jahresbeitrag' &&
      tx.status === 'bezahlt'
    );
  }).length;

  const openFines = transactions.filter(tx =>
    tx.reason === 'strafe' && tx.status === 'offen'
  ).length;

  const totalFines = transactions
    .filter(tx => tx.reason === 'strafe' && tx.status === 'bezahlt')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    yearlyFee: config.yearlyFee,
    activeMembers: activeMembers.length,
    totalIncome,
    totalExpenses,
    balance,
    openYearlyFees,
    openFines,
    totalFines
  };
}

module.exports = {
  calculateOverview
};