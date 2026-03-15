const flatTree = [
  1, 2, 3, 8,
  4, 11, 14, 6,
  5, 12, 15, 7,
  9, 13, 16, 10
];

// Build a map of position → index
function buildPositionMap(arr) {
  const map = {};
  arr.forEach((value, index) => (map[value] = index));
  return map;
}

// Fills -1 except where team members exist
function buildFilledTree(clientIds) {
  const filled = new Array(flatTree.length).fill(-1);

  clientIds.forEach(cid => {
    const pos = flatTree.indexOf(cid);
    if (pos !== -1) filled[pos] = cid;
  });

  return filled;
}

export function buildTeamTree(teamPlayers) {
    const filled = new Array(flatTree.length).fill(-1);

    teamPlayers.forEach((player, index) => {
        const teamLocalId = index + 1;       // 1st, 2nd, 3rd player in team
        const pos = flatTree.indexOf(teamLocalId); // where this slot should go in tree

        if (pos !== -1) {
            filled[pos] = player.clientId;  // store player.clietnId
        }
    });

    return { filledTree: filled };
}


