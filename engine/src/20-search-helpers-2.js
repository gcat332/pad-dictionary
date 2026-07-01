	function directParseSkills(skillDataArr) {
		return skillDataArr.flatMap(skill=>skillObjectParsers?.[skill.type]?.apply({ parser: skillParser }, skill.params))
	}
	function voidsAbsorption_Turns(card) {
		const outObj = {
			"attr-absorb": 0,
			"combo-absorb": 0,
			"damage-absorb": 0,
			"damage-void": 0,
			"super-gravity": 0,
		};
		const searchTypeArray = [
			173,
			191,
			278
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		skills.reduce((pre,skill)=>{
			if (skill.type === 173) {
				if(skill.params[1]) pre["attr-absorb"] ||= skill.params[0];
				if(skill.params[2]) pre["combo-absorb"] ||= skill.params[0];
				if(skill.params[3]) pre["damage-absorb"] ||= skill.params[0];
			} else if (skill.type === 191) {
				pre["damage-void"] ||= skill.params[0];
			} else if (skill.type === 278) {
				pre["super-gravity"] ||= skill.params[0];
			}
			return pre
		}, outObj);
		return outObj;
	}
	function voidsAbsorption_Addition(card)
	{
		const turnsObj = voidsAbsorption_Turns(card);
		const namesArr = ["attr-absorb", "combo-absorb", "damage-absorb", "damage-void","super-gravity"];
		const turns = namesArr.map(name=>turnsObj[name]);
		const turnsSet = new Set(turns.filter(Boolean));
		const turnsCount = turnsSet.size;

		const fragment = document.createDocumentFragment();
		for (let i = 0; i < namesArr.length; i++) {
			if (turns[i] > 0) {
				fragment.append(createSkillIcon(namesArr[i]));
				if (turnsCount > 1)
					fragment.append(`-${turns[i]>=9999 ? '全' : `${turns[i]}T` }`);
			}
		}
		if (turnsCount === 1) {
			const turn = Array.from(turnsSet)[0];
			fragment.append(`-${turn>=9999 ? '全' : `${turn}T` }`);
		}
		return fragment;
	}
	function unbind_Turns(card)
	{
		const outObj = {
			normal: 0,
			awakenings: 0,
			matches: 0
		};
		const searchTypeArray = [
			117, 179,
			196
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		const parsedSkills = directParseSkills(skills);
		
		parsedSkills.reduce((pre,cur)=>{
			pre.normal ||= cur.normal;
			pre.awakenings ||= cur.awakenings;
			pre.matches ||= cur.matches;
			return pre
		}, outObj);
		return outObj;
	}
	function unbind_Addition(card)
	{
		const turnsObj = unbind_Turns(card);
		const namesArr = ["normal", "awakenings", "matches"];
		const turns = namesArr.map(name=>turnsObj[name]);
		const turnsSet = new Set(turns.filter(Boolean));
		const turnsCount = turnsSet.size;

		const fragment = document.createDocumentFragment();
		for (let i = 0; i < namesArr.length; i++) {
			if (turns[i] > 0) {
				fragment.append(createSkillIcon(`unbind-${namesArr[i]}`));
				if (turnsCount > 1)
					fragment.append(`-${turns[i]>=9999 ? '全' : `${turns[i]}T` }`);
			}
		}
		if (turnsCount === 1) {
			const turn = Array.from(turnsSet)[0];
			fragment.append(`-${turn>=9999 ? '全' : `${turn}T` }`);
		}
		return fragment;
	}
	function boardChange_ColorTypes(skill)
	{
		if (!skill) return [];
		const sk = skill.params;
		const colors = sk.slice(0, sk.includes(-1)?sk.indexOf(-1):undefined);
		return colors;
	}
	function boardChange_Addition(card)
	{
		const searchTypeArray = [71];
		const skill = getCardActiveSkill(card, searchTypeArray);
		const colors = boardChange_ColorTypes(skill);
		return createOrbsList(colors);
	}
	function orbsChangeParse(skill)
	{
		function changes(from, to)
		{
			return {from:from,to:to};
		}
		let outArr = [];
		if (!skill) return outArr;
		const sk = skill.params;
		switch (skill.type)
		{
			case 9:{
				outArr.push(changes([sk[0] || 0], [sk[1] || 0]));
				break;
			}
			case 20:{
				if (sk.length >= 3 && sk[1] == (sk[3] || 0))
				{
					outArr.push(changes([sk[0] || 0, sk[2] || 0], [sk[1] || 0]));
				}
				else
				{
					outArr.push(changes([sk[0] || 0], [sk[1] || 0]));
					outArr.push(changes([sk[2] || 0], [sk[3] || 0]));
				}
				break;
			}
			case 154:{
				outArr.push(changes(Bin.unflags(sk[0] || 1), Bin.unflags(sk[1] || 1)));
				break;
			}
		}
		return outArr;
	}
	function changeOrbs_Addition(card)
	{
		const searchTypeArray = [9,20,154];
		const skills = getCardActiveSkills(card, searchTypeArray);
		let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
		const fragment = document.createDocumentFragment();
		parsedSkills.forEach(p=>{
			fragment.appendChild(createOrbsList(p.from));
			fragment.appendChild(document.createTextNode(`→`));
			fragment.appendChild(createOrbsList(p.to));
		});
		return fragment;
	}
	function generateOrbsParse(card)
	{
		const outArr = [];
		const searchTypeArray = [141, 208];
		const skills = getCardActiveSkills(card, searchTypeArray);
		if (!skills.length) return outArr;
		for (const skill of skills)
		{
			const sk = skill.params;
			if (skill.type == 141)
			{
				outArr.push({
					count: sk[0],
					to: sk[1] || 1,
					exclude: sk[2],
				});
			}else
			{
				outArr.push({
					count: sk[0],
					to: sk[1] || 1,
					exclude: sk[2],
				});
				outArr.push({
					count: sk[3],
					to: sk[4] || 1,
					exclude: sk[5],
				});
			}
		}
		return outArr;
	}
	function generateOrbs_Addition(card)
	{
		const gens = generateOrbsParse(card);
		if (!gens.length) return;
		const fragment = document.createDocumentFragment();
		for (const gen of gens)
		{
			fragment.appendChild(createOrbsList(Bin.unflags(gen.to)));
			fragment.appendChild(document.createTextNode(`×${gen.count}`));
		}
		return fragment;
	}
	function lock_Addition(card)
	{
		const searchTypeArray = [152, 190, 262];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		if (!skills.length) return;
		return skills.map(skill=>{
			const sk = skill.params;
			const fragment = document.createDocumentFragment();
			switch (skill.type) {
				case 152:{
					fragment.append(
						createSkillIcon('orb-locked')
					);
					if (sk[1] < 42) fragment.append(`×${sk[1]}`);
					fragment.append(
						createOrbsList(Bin.unflags(sk[0] || 1))
					);
					break;
				}
				case 190:{
					fragment.append(
						createSkillIcon('orb-combo-drop')
					);
					if (sk[1] < 42) fragment.append(`×${sk[1]}`);
					fragment.append(
						createOrbsList(Bin.unflags(sk[0] || 1))
					);
					break;
				}
				case 262:{
					fragment.append(
						createSkillIcon('orb-nail')
					);
					if (sk[0] < 42) fragment.append(`×${sk[0]}`);
					fragment.append(
						createOrbsList(Attributes.orbs)
					);
					break;
				}
			}
			return fragment;
		}).nodeJoin('');
	}
	function dropLock_Addition(card)
	{
		const searchTypeArray = [205];
		const skill = getCardActiveSkill(card, searchTypeArray, 1);
		if (!skill) return;
		const sk = skill.params;
		const fragment = document.createDocumentFragment();
		fragment.appendChild(createOrbsList(Bin.unflags(sk[0] != -1 ? sk[0] : 0b1111111111), 'locked'));
		fragment.appendChild(document.createTextNode(`×${sk[1]}T`));
		return fragment;
	}
	function dropOrb_Addition(card)
	{
		const searchTypeArray = [126];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = Bin.unflags(sk[0]);
		
		const fragment = document.createDocumentFragment();
		fragment.appendChild(createOrbsList(colors, 'drop'));
		fragment.appendChild(document.createTextNode(`${sk[3]}%×${sk[1]}${sk[1] != sk[2]?`~${sk[2]}`:""}T`));
		return fragment;
	}
	function generateColumnOrbs_Addition(card)
	{
		const searchTypeArray = [127];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = [];
		for (let ai=0;ai<sk.length;ai+=2)
		{
			colors.push(Bin.unflags(sk[ai+1]));
		}
		const fragment = document.createDocumentFragment();
		fragment.appendChild(document.createTextNode(`竖`));
		fragment.appendChild(createOrbsList(colors.flat()));
		return fragment;
	}
	function generateRowOrbs_Addition(card)
	{
		const searchTypeArray = [128];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = [];
		for (let ai=0;ai<sk.length;ai+=2)
		{
			colors.push(Bin.unflags(sk[ai+1]));
		}
		
		const fragment = document.createDocumentFragment();
		fragment.appendChild(document.createTextNode(`横`));
		fragment.appendChild(createOrbsList(colors.flat()));
		return fragment;
	}
