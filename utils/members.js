const { readJson, writeJson } = require('./helpers');

function getMembers() {
  return readJson('data/members.json');
}

function saveMembers(members) {
  writeJson('data/members.json', members);
}

function findMemberById(userId) {
  const members = getMembers();
  return members.find(member => member.userId === userId);
}

function addOrReactivateMember(user) {
  const members = getMembers();
  const existingMember = members.find(member => member.userId === user.id);

  if (existingMember) {
    existingMember.name = user.username;
    existingMember.active = true;
  } else {
    members.push({
      userId: user.id,
      name: user.username,
      role: 'member',
      active: true
    });
  }

  saveMembers(members);
}

function deactivateMember(userId) {
  const members = getMembers();
  const existingMember = members.find(member => member.userId === userId);

  if (existingMember) {
    existingMember.active = false;
    saveMembers(members);
  }
}

module.exports = {
  getMembers,
  saveMembers,
  findMemberById,
  addOrReactivateMember,
  deactivateMember
};