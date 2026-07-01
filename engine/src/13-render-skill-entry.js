function renderSkillEntry(skills)
{
	//按住Ctrl点击技能在控制台输出技能的对象
	function showParsedSkill(event) {
		if (event.ctrlKey) {
			//const skillId = parseInt(this.getAttribute("data-skill-id"));
			console.log(this.skill);
		}
	}
	const ul = document.createElement("ul");
	ul.className = "card-skill-list";
	skills.forEach(skill=>{
		const li = ul.appendChild(document.createElement("li"));
		li.className = skill.kind;
		li.appendChild(renderSkill(skill));
		//li.setAttribute("data-skill-id", skill.id);
		li.skill = skill;
		li.addEventListener("click", showParsedSkill);
	});

	//技能显示效果的合并，技能原始对象的合并在“function skillParser”里
	if (merge_skill)
	{
		const searchKind = [ //需要配合并的技能类型
			SkillKinds.SetOrbState,
			SkillKinds.BoardChange,
			SkillKinds.GenerateOrbs,
			SkillKinds.FixedOrbs,
			SkillKinds.BoardJammingStates,
		];
		let boardChange = skills.filter(skill=>{
			if (skill.kind == SkillKinds.ActiveTurns) {
				//如果是主动技，任一子技能属于这个范围就可以了
				return skill.skills.some(subSkill=>searchKind.includes(subSkill.kind))
			} else {
				return searchKind.includes(skill.kind);
			}
		}).flatMap(skill=>skill.kind == SkillKinds.ActiveTurns ?
			//主动技还需要再筛选一遍子技能
			skill.skills.filter(subSkill=>searchKind.includes(subSkill.kind)) :
			skill);
		if (boardChange.filter(skill=>skill.kind != SkillKinds.SetOrbState).length > 0)
		{
			const boardsBar = new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
			for (const skill of boardChange)
			{
				switch (skill.kind)
				{
					case SkillKinds.BoardChange: { //洗版
						const attrs = skill.attrs;
						boardsBar.boards.forEach(board=>board.randomFill(attrs));
						break;
					}
					case SkillKinds.GenerateOrbs: { //产生珠子
						const { orbs, exclude, count } = skill;
						boardsBar.boards.forEach(board=>board.generateOrbs(orbs, count, exclude));
						break;
					}
					case SkillKinds.FixedOrbs: { //固定位置产生珠子
						for (const generate of skill.generates)
						{
							const orbs = generate.orbs;
							if (generate.type == 'shape') {
								boardsBar.boards.forEach(board=>board.setShape(generate.positions, orbs));
							} else {
								if (generate.type == 'row')
									boardsBar.boards.forEach(board=>board.setRows(generate.positions, orbs));
								else
									boardsBar.boards.forEach(board=>board.setColumns(generate.positions, orbs));
							}
						}
						break;
					}
					case SkillKinds.BoardJammingStates: { //产生板面干扰
						const { state, posType, size, positions, count, time } = skill;
						if (state == 'roulette') { //轮盘位
							boardsBar.boards.forEach(board=>{
								if (posType == 'random')
									board.generateBlockStates('roulette', count);
								else
									board.setShape(positions, null, null, 'roulette');
							});
						}
						if (state == 'clouds') { //云
							boardsBar.boards.forEach(board=>{
								board.generateBlockStates('clouds', count, size, positions);
							});
						}
						if (state == 'immobility') { //封条
							const {colums, rows} = skill.positions;
							boardsBar.boards.forEach(board=>{
								board.setColumns(colums, null, null, 'immobility');
								board.setRows(rows, null, null, 'immobility');
							});
						}
						if (state == 'deep-dark') { //超暗暗
							const { min, max } = skill;
							boardsBar?.boards?.forEach(board=>{
								if (posType == 'random')
									board.generateBlockStates('deep-dark', min == max ? min : Math.randomInteger(max, min));
								else
									board.setShape(positions, null, null, 'deep-dark');
							});
						}
						break;
					}
					case SkillKinds.SetOrbState: { //修改珠子状态
						const { orbs, state } = skill;
						const count = skill?.arg?.count?.value ?? 99;
						boardsBar.boards.forEach(board=>{
							board.generateOrbs(orbs, count, null, state);
						});
						break;
					}
				}
			}
			const li = ul.appendChild(document.createElement("li"));
			boardsBar.boards.forEach(board=>board.refreshTable());
			li.appendChild(boardsBar.node);
			li.className = "merge-board";
		}
	}

	return ul;
}
//行列拆分成顺序和逆序的正常数字
function posSplit(pos, axis = 'row')
{
	const max = axis == 'row' ? 5 : 6;
	return [
		pos.filter(n=>n<=2).map(n=>n+1),
		pos.filter(n=>n>=3).reverse().map(n=>max-n),
	];
	//return {sequence: pos.filter(n=>n<=2).map(n=>n+1), reverse: pos.filter(n=>n>=3).reverse().map(n=>max-n)};
}

function createSkillIcon(iconType, className){
	const idoc = document.createElement("icon");
	idoc.className = `icon-skill${className ? ` ${className}` : ''}`;
	idoc.setAttribute("data-icon-type", iconType);
	return idoc;
}

