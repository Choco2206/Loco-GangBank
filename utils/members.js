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

function syncMembersByRole(guild, roleId) {
  const members = getMembers();
  const roleMembers = guild.members.cache.filter(member => member.roles.cache.has(roleId));

  const roleMemberIds = new Set();

  roleMembers.forEach(member => {
    roleMemberIds.add(member.user.id);

    const existingMember = members.find(m => m.userId === member.user.id);

    if (existingMember) {
      existingMember.name = member.user.username;
      existingMember.active = true;
    } else {
      members.push({
        userId: member.user.id,
        name: member.user.username,
        role: 'member',
        active: true
      });
    }
  });

  members.forEach(member => {
    if (!roleMemberIds.has(member.userId)) {
      member.active = false;
    }
  });

  saveMembers(members);
}

module.exports = {
  getMembers,
  saveMembers,
  findMemberById,
  addOrReactivateMember,
  deactivateMember,
  syncMembersByRole
};