function skillParser(skillId)
{
	function merge(skills)
	{
		//主动技部分的合并
		let activeTurns = skills.filter(skill=>skill.kind == SkillKinds.ActiveTurns);
		if (activeTurns.length>1)
		{ //把后面的全都合并到第一个
			//按回合数拆分组
			let diffTurnsGroup = activeTurns.groupBy((a,b)=>a.turns === b.turns);
			let diffTurnsSkills = diffTurnsGroup.flatMap(group=>{
				if (group.length>1) { //大于一个技能的可以合并
					group[0].skills = group.flatMap(s=>s.skills);
					// group.reduce((pre,cur)=>{
					// 	pre.skills.push(...cur.skills);
					// 	return pre
					// });
					let firstSkill = group.shift(); //从筛选中去除第一个
					group.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
					return [firstSkill];
				} else { //1个技能的跳过
					return group[0];
				}
			});
			//进行具体技能效果的合并
			diffTurnsSkills.forEach(turnsSkill=>{
				//破吸部分的合并
				let voidBuff = turnsSkill.skills.filter(skill=>skill.kind == SkillKinds.VoidEnemyBuff);
				if (voidBuff.length>1)
				{ //把后面的全都合并到第一个
					voidBuff[0].buffs = voidBuff.flatMap(s=>s.buffs);
					voidBuff.shift(); //从筛选中去除第一个
					voidBuff.forEach(skill=>turnsSkill.skills.splice(turnsSkill.skills.indexOf(skill),1)); //去掉所有后面的
				}
			});
		}
		//解封部分的合并
		let unbinds = skills.filter(skill=>skill.kind == SkillKinds.Unbind);
		if (unbinds.length>1)
		{ //把后面的全都合并到第一个
			unbinds.reduce((pre,cur)=>{
				pre.normal = pre.normal || cur.normal;
				pre.awakenings = pre.awakenings || cur.awakenings;
				pre.matches = pre.matches || cur.matches;
				return pre
			});
			unbinds.shift(); //从筛选中去除第一个
			unbinds.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		let fixedDamages = skills.filter(skill=>skill.kind == SkillKinds.DamageEnemy && skill.attr === 'fixed').filter((skill,idx,arr)=>skill.id==arr[0].id);
		if (fixedDamages.length>1)
		{ //把后面的全都合并到第一个
			fixedDamages[0].times = fixedDamages.length;
			fixedDamages.shift(); //从筛选中去除第一个
			fixedDamages.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		let skillPowerUp = skills.filter(skill=>skill.kind == SkillKinds.PowerUp);
		if (skillPowerUp.length > 1 || (skillPowerUp[0] && skillPowerUp[0]?.value?.kind === SkillPowerUpKind.ScaleCross))
		{
			//合并技能效果
			function combinePowerUp(target, source) {
				if (source?.additional.length)
				{
					if (!Array.isArray(target.additional)) target.additional = [];
					target.additional.push(...source.additional);
				}
				if (source.reduceDamage != undefined)
				{
					if (!target.reduceDamage)
						target.reduceDamage = source.reduceDamage;
					else if (target.reduceDamage.kind === source.reduceDamage.kind)
						target.reduceDamage.value *= source.reduceDamage.value;
				}
				if (target?.value.baseAtk != undefined && source?.value.baseAtk) target.value.baseAtk *= source.value.baseAtk;
				if (target?.value.baseRcv != undefined && source?.value.baseRcv != undefined) target.value.baseRcv *= source.value.baseRcv;

				if (target?.value.bonusAtk != undefined && source?.value.bonusAtk != undefined) target.value.bonusAtk += source.value.bonusAtk;
				if (target?.value.bonusRcv != undefined && source?.value.bonusRcv != undefined) target.value.bonusRcv += source.value.bonusRcv;

				if (target?.value.atk != undefined && source?.value.atk != undefined) target.value.atk *= source.value.atk;
				if (target?.value.hp != undefined && source?.value.hp != undefined) target.value.hp *= source.value.hp;
				if (target?.value.rcv != undefined && source?.value.rcv != undefined) target.value.rcv *= source.value.rcv;
			}

			//十字
			let scaleCross = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleCross);
			function mergeScaleCrossAttr(skill)
			{
				let crosses = skill.value.crosses;
				let atk = crosses[0].atk;
				let rcv = crosses[0].rcv;
				if (crosses.length >= 2 &&
					crosses.every(cross=>cross.atk === atk && cross.rcv === rcv)
				) {
					crosses[0].attr = Array.from(new Set(crosses.reduce((pre,cur)=>{
						pre.push(...cur.attr);
						return pre;
					}, [])));
					skill.value.crosses.splice(1);
				}
			}
			//每个十字技能，先把所有属性合并到自身
			scaleCross.forEach(mergeScaleCrossAttr);
			//筛选出所有倍率一样的子技能
			scaleCross = scaleCross.filter((skill,idx,arr)=>{
				let atk = arr[0].value.crosses[0].atk;
				let rcv = arr[0].value.crosses[0].rcv;
				let crosses = skill.value.crosses;
				return crosses.every(cross=>cross.atk === atk && cross.rcv === rcv);
			});
			//先合并属性倍率
			if (scaleCross.length >= 1)
			{ //把后面的全都合并到第一个
				scaleCross.reduce((pre,cur)=>{
					combinePowerUp(pre,cur);
					pre.value.crosses = pre.value.crosses.concat(cur.value.crosses);
					return pre
				});
				let _skill = scaleCross.shift(); //从筛选中去除第一个
				scaleCross.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
				mergeScaleCrossAttr(_skill);
			}
			//重新找出来十字，合并附加内容
			scaleCross = skills.filter(skill=>skill.kind == SkillKinds.PowerUp && skill.value.kind === SkillPowerUpKind.ScaleCross);
			scaleCross = scaleCross.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let attr0 = s0.value.crosses[0].attr.concat().sort();
				let attr1 = skill.value.crosses[0].attr.concat().sort();
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				isEqual(attr0, attr1)
				;
			});
			if (scaleCross.length > 1)
			{ //把后面的全都合并到第一个
				scaleCross.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleCross.shift(); //从筛选中去除第一个
				scaleCross.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}

			//长串匹配
			let scaleMatchLength = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleMatchLength);
			scaleMatchLength = scaleMatchLength.groupBy((a,b)=>{
				let av = a.value;
				let bv = b.value;

				return isEqual(a.condition, b.condition) &&
				isEqual(a.attrs, b.attrs) &&
				isEqual(a.types, b.types) &&
				av.min === bv.min &&
				av.max === bv.max &&
				(av.matchAll === bv.matchAll || av.attrs.length <= 1) && isEqual(av.attrs, bv.attrs)
				;
			});
			for (let group of scaleMatchLength)
			{
				if (group.length > 1)
				{ //把后面的全都合并到第一个
					group.reduce((pre,cur)=>{
						combinePowerUp(pre, cur);
						return pre
					});
					group.shift(); //从筛选中去除第一个
					group.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
				}
			}
			
			//多串匹配
			let scaleMatchAttrs = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleMatchAttrs);	
			scaleMatchAttrs = scaleMatchAttrs.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max &&
				isEqual(v0.matches, v1.matches)
				;
			});

			if (scaleMatchAttrs.length > 1)
			{ //把后面的全都合并到第一个
				scaleMatchAttrs.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleMatchAttrs.shift(); //从筛选中去除第一个
				scaleMatchAttrs.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//多色匹配
			let scaleAttributes = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleAttributes);	
			scaleAttributes = scaleAttributes.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max &&
				isEqual(v0.attrs, v1.attrs)
				;
			});

			if (scaleAttributes.length > 1)
			{ //把后面的全都合并到第一个
				scaleAttributes.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleAttributes.shift(); //从筛选中去除第一个
				scaleAttributes.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//连击数
			let scaleCombos = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleCombos);	
			scaleCombos = scaleCombos.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max
				;
			});

			if (scaleCombos.length > 1)
			{ //把后面的全都合并到第一个
				scaleCombos.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleCombos.shift(); //从筛选中去除第一个
				scaleCombos.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//普通倍率
			let multiplier = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.Multiplier
				&& skill.condition?.LShape);	
		
			multiplier = multiplier.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				return !!skill.condition && isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types)
				;
			});

			if (multiplier.length)
			{ //把后面的全都合并到第一个
				multiplier.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				multiplier.shift(); //从筛选中去除第一个
				multiplier.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
		}
		let changeOrbs = skills.filter(skill=>skill.kind == SkillKinds.ChangeOrbs);
		if (changeOrbs.length>1)
		{ //把后面的全都合并到第一个
			changeOrbs.reduce((pre,cur)=>{
				pre.changes.push(...cur.changes);
				return pre
			});
			changeOrbs.shift(); //从筛选中去除第一个
			changeOrbs.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		return skills;
	}
	const skill = Skills[skillId];
	if (!skill) return [];
	//此处用apply将这个parser传递到后面解析函数的this里，用于递归解析
	const result = skillObjectParsers?.[skill.type]?.apply({ parser: skillParser }, skill.params) 
		?? { kind: SkillKinds.Unknown }; //没有时返回未知技能
	let skills = (Array.isArray(result) ? result : [result]) //确保技能是数组
		.filter(Boolean) //去除无效技能
		.map(s => ({ id: skillId, type: skill.type, params: skill.params, ...s })); //额外增加技能id、type、原始参数

	function splitProvisoSkill(skills)
	{
		let idx = skills.findIndex(skill=>skill.kind == SkillKinds.SkillProviso); //搜索HP、层数限制技能的位置
		if (idx>=0) //如果找到，就拆分成3份
		{
			return [
				skills.slice(0,idx),
				skills.slice(idx, idx+1),
				skills.slice(idx+1),
			];
		}else
		{
			return [skills];
		}
	}
	//技能原始对象的合并，技能显示效果的合并在“function renderSkillEntry”里
	if (merge_skill)
	{
		//将技能拆分成3部分后分别合并技能
		let skillsSplit = splitProvisoSkill(skills).map(_skills=>merge(_skills));
		//再展平，重新回到一层技能
		skills = skillsSplit.flat(1);
	}
	
	return skills;
}

