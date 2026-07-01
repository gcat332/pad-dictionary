	function numericalATK_Addition(card)
	{
		const searchTypeArray = [0,1,2,35,37,42,58,59,84,85,86,87,110,115,143,144];
		const typeArray_Rate = [0,2,35,37,58,59,84,85,115];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		//const sk = skill.params;

		const colors = [getCannonAttr(skill)];
		
		const fragment = document.createDocumentFragment();
		fragment.append(`射`);
		fragment.append(createOrbsList(colors));

		if (typeArray_Rate.includes(skill.type)) {
			function getNumber(skill){
				const sk = skill.params;
				switch(skill.type)
				{
					case 0:
					case 37:
					case 58:
					case 59:
					case 84:
					case 85:
					case 115:
						return sk[1];
					case 2:
					case 35:
						return sk[0];
					default:
						return 0;
				}
			}
			fragment.append(`×${(getNumber(skill)/100).bigNumberToString()}倍`);
			
		}
		return fragment;
	}
	function memberATK_Addition(card)
	{
		const searchTypeArray = [230, 269];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		return skills.map(skill=>{
			const sk = skill.params;
			const fragment = document.createDocumentFragment();
			fragment.appendChild(createTeamFlags(sk[1], skill.type == 269 ? 2 : 1));
			fragment.append(`${sk[2] / 100}倍×${sk[0]}T`);
			return fragment;
		}).nodeJoin(document.createElement("br"));
	}
	function getIncreaseDamageCap(skill)
	{
		let cap = 0;
		switch (skill.type) {
			case 241:case 258:case 263:case 266:
				cap = skill.params[1];
				break;
			case 246:
				cap = skill.params[2];
				break;
			case 247:
				cap = skill.params[3];
				break;
		}
		return cap;
	}
	function memberCap_Addition(card)
	{
		const searchTypeArray = [241, 246, 247, 258, 263, 266];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		return skills.map(skill=>{
			const sk = skill.params;
			let cap = getIncreaseDamageCap(skill);
			const fragment = document.createDocumentFragment();
			switch (skill.type) {
				case 258:
				case 266: {
					fragment.appendChild(createTeamFlags(sk[2], skill.type == 266 ? 2 : 1));
					break;
				}
				case 241:
				case 246:
				case 247: {
					fragment.appendChild(createTeamFlags(1));
					break;
				}
				case 263: {
					const attrs = Bin.unflags(sk[2]);
					if (attrs?.length)
					{
						fragment.appendChild(createOrbsList(attrs));
					}
					const types = Bin.unflags(sk[3]);
					if (types?.length)
					{
						fragment.appendChild(createTypesList(types));
					}
					break;
				}
			}
			//fragment.append(createSkillIcon(SkillKinds.IncreaseDamageCapacity, cap > 21 ? "cap-incr" : "cap-decr"));
			switch (skill.type) {
				case 258:
				case 241:
				case 263:
				case 266: {
					fragment.append(`${(cap*1e8).bigNumberToString()}×${sk[0]}T`);
					break;
				}
				case 246: {
					fragment.append(`${(cap*1e8).bigNumberToString()}←${sk[1]}C in ${sk[0]}S`);
					break;
				}
				case 247: {
					fragment.append(`${(cap*1e8).bigNumberToString()}←${sk[2]} of `, createOrbsList(Bin.unflags(sk[1])), ` in ${sk[0]}S`);
					break;
				}
			}
			return fragment;
		}).nodeJoin(document.createElement("br"));
	}
	function dixedDamage_Addition(card)
	{
		const searchTypeArray = [55, 188, 56];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		if (!skills.length) return;
		const skill = skills[0];
		const sk = skill.params;
		return `${skill.type==56?"全体":"单体"}${sk[0].bigNumberToString()}点${skills.length>1?`×${skills.length}`:''}`;
	}
	function gravity_Addition(card)
	{
		const searchTypeArray = [6, 161, 261];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const denominator = skill.type === 161 ? 
			localTranslating.skill_parse.stats.maxhp() : 
			localTranslating.skill_parse.stats.chp();
		const percent = `${sk[0]}%`;
		const target = skill.type === 261 ? 
			localTranslating.skill_parse.target.enemy_one() : 
			localTranslating.skill_parse.target.enemy_all();
		
		const fragment = document.createDocumentFragment();
		//fragment.append(target, denominator, percent);
		return [target, denominator, percent].nodeJoin(" ");
	}
	
	function healImmediately_Rate(card)
	{
		const searchTypeArray = [7, //自身回复力
			8, //固定点数
			35,115, //吸血
			117
		];
		const skills = getCardActiveSkills(card, searchTypeArray);

		const outObj = {
			vampire: 0,
			selfRcv: 0,
			const: 0,
			scale: 0,
		};
		if (!skills.length) return outObj;
		skills.forEach(skill=>{
			const sk = skill.params;
			if (skill.type == 7)
			{
				outObj.selfRcv += sk[0];
			}
			else if(skill.type == 8)
			{
				outObj.const += sk[0];
			}
			else if(skill.type == 35)
			{
				outObj.vampire += sk[1];
			}
			else if(skill.type == 115)
			{
				outObj.vampire += sk[2];
			}
			else if(skill.type == 117)
			{
				outObj.selfRcv += sk[1] || 0;
				outObj.const += sk[2] || 0;
				outObj.scale += sk[3] || 0;
			}
		});
		return outObj;
	}
