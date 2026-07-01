	return {
		name:"All Functions",
		functions: functions
	};
})();

  function treeLabel(node) {
    return node?.name || node?.otLangName?.en || "Unnamed";
  }

  function normalizeNode(node, path = [], index = { value: 0 }) {
    const label = treeLabel(node);
    const nextPath = label === "All Functions" ? path : path.concat(label);
    if (node.group || Array.isArray(node.functions)) {
      return {
        type: "group",
        label,
        path: nextPath,
        children: (node.functions || []).map((child) => normalizeNode(child, nextPath, index)),
      };
    }
    const key = nextPath.join(" > ") || "leaf-" + index.value;
    index.value += 1;
    return {
      type: "leaf",
      key,
      label,
      path: nextPath,
      filter: (cards) => node.function(cards),
      raw: node,
    };
  }

  function flattenLeaves(node, out = []) {
    if (node.type === "leaf") out.push(node);
    else node.children.forEach((child) => flattenLeaves(child, out));
    return out;
  }

  function intersectById(left, right) {
    const rightIds = new Set(right.map((card) => card.id));
    return left.filter((card) => rightIds.has(card.id));
  }

  function unionById(groups) {
    const seen = new Set();
    const out = [];
    for (const group of groups) {
      for (const card of group) {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          out.push(card);
        }
      }
    }
    return out;
  }

  function createSpecialSearchEngine({ skills, cards }) {
    installHelpers();
    Skills = skills || [];
    Cards = cards || [];
    const root = normalizeNode(specialSearchFunctions);
    const leaves = flattenLeaves(root);
    const leafByKey = new Map(leaves.map((leaf) => [leaf.key, leaf]));
    const leafByPath = new Map(leaves.map((leaf) => [leaf.path.join(" > "), leaf]));

    function filterCardsByLeaves(baseCards, selectedKeys, mode = "and") {
      const selected = selectedKeys.map((key) => leafByKey.get(key)).filter(Boolean);
      if (!selected.length) return baseCards;
      const groups = selected.map((leaf) => leaf.filter(baseCards));
      return mode === "or" ? unionById(groups) : groups.reduce((current, group) => intersectById(current, group), baseCards);
    }

    function findLeafByPath(path) {
      return leafByPath.get(Array.isArray(path) ? path.join(" > ") : path);
    }

    return { tree: root, leaves, leafByKey, filterCardsByLeaves, findLeafByPath, globalsStubbed: engineGlobalsStubbed.slice() };
  }

  return {
    createSpecialSearchEngine,
    get specialSearchFunctions() { return specialSearchFunctions; },
    get SkillKinds() { return SkillKinds; },
    get SkillPowerUpKind() { return SkillPowerUpKind; },
    get Attributes() { return Attributes; },
    get Bin() { return Bin; },
    get globalsStubbed() { return engineGlobalsStubbed.slice(); },
  };
});
