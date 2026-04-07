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
    const usedSlots = new Set(); // track which teamLocalId slots are claimed

    // First pass: place players with a preferredPosition
    teamPlayers.forEach((player) => {
        const pref = player.preferredPosition;
        if (pref && pref >= 1 && pref <= 16) {
            const pos = flatTree.indexOf(pref);
            if (pos !== -1 && filled[pos] === -1) {
                filled[pos] = player.clientId;
                usedSlots.add(pref);
            }
        }
    });

    // Second pass: place remaining players (no preference or conflict) into unclaimed slots
    let nextSlot = 1;
    teamPlayers.forEach((player) => {
        const pref = player.preferredPosition;
        if (pref && usedSlots.has(pref)) {
            // Already placed in first pass — check it's actually this player
            const pos = flatTree.indexOf(pref);
            if (pos !== -1 && filled[pos] === player.clientId) return;
        }
        // Find next available slot
        while (usedSlots.has(nextSlot) && nextSlot <= 16) nextSlot++;
        if (nextSlot <= 16) {
            const pos = flatTree.indexOf(nextSlot);
            if (pos !== -1) {
                filled[pos] = player.clientId;
                usedSlots.add(nextSlot);
            }
            nextSlot++;
        }
    });

    return { filledTree: filled };
}


