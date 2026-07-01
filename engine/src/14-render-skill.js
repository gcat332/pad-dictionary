function renderSkill(skill, option = {})
{
	function renderSkillTitle(skillId, { showTurns } = {}) {
		const skill = Skills[skillId];
		const div = document.createElement("summary");
		div.className = "evolved-skill-title";
		const name = div.appendChild(document.createElement("span"));
		name.className = "skill-name";
		name.textContent = skill.name;
		name.setAttribute("data-skillid", skillId);
		//name.onclick = fastShowSkill;
		if (showTurns) {
			const cd = div.appendChild(document.createElement("span"));
			cd.className = "skill-cd";
			cd.textContent = skill.initialCooldown - skill.maxLevel + 1;
			if (skill.maxLevel > 1) {
				const level = div.appendChild(document.createElement("span"));
				level.className = "skill-level-label";
				level.textContent = skill.maxLevel;
			}
		}
		const originalSkill = document.createElement("div");
		originalSkill.className = "skill-datail-original";
		originalSkill.append(parseSkillDescription(skill));

		return [div, originalSkill].nodeJoin();
	}

	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tsp = localTranslating.skill_parse;
	const createIcon = createSkillIcon;
	
	if (Array.isArray(skill))
	{
		frg.ap(skill.map(_skill=>renderSkill(_skill)));
		return frg;
	}
	switch (skill.kind) {
		case SkillKinds.Error: {
			let dict = { type: skill.kind };
			frg.ap(tsp.skill.error(dict));
			break;
		}
		case SkillKinds.Unknown: {
			console.log(skill);
			let dict = {
				type: skill.kind
			};
			frg.ap(tsp.skill.unknown(dict));
			break;
		}
		case SkillKinds.ActiveTurns: { //有回合的行动
			let { turns, skills } = skill;
			let dict = {
				turns: Array.isArray(turns) ? turns.join(tsp.word.range_hyphen().textContent) : turns,
				skills: skills?.map(renderSkill)?.nodeJoin(tsp.word.semicolon()),
			};
			frg.ap(tsp.skill.active_turns(dict));
			break;
		}
		case SkillKinds.DelayActiveTurns: { //有推迟回合的行动
			let { turns, skills } = skill;
			let dict = {
				turns: Array.isArray(turns) ? turns.join(tsp.word.range_hyphen().textContent) : turns,
				icon: createIcon(SkillKinds.Delay),
				skills: renderSkillEntry(skills),
			};
			
			frg.ap(tsp.skill.delay_active_turns(dict));
			//独立出来
			//frg.ap();
			break;
		}
		case SkillKinds.RandomSkills: { //随机技能
			let skills = skill.skills;
			const ul = document.createElement("ul");
			ul.className = "random-active-skill";
			skills.forEach((subSkill, idx)=>{
				const li = ul.appendChild(document.createElement("li"));
				const details = li.appendChild(document.createElement("details"));
				details.open = false; //随机类技能默认关闭
				details.className = "skill-details";
				details.appendChild(renderSkillTitle(skill.params[idx]));
				details.appendChild(renderSkillEntry(subSkill));
			});
			let dict = {
				skills: ul,
			};
			frg.ap(tsp.skill.random_skills(dict));
			break;
		}
		case SkillKinds.EvolvedSkills: { //技能进化
			let {skills, loop} = skill;
			const ul = document.createElement("ul");
			ul.className = "evolved-active-skill";
			skills.forEach((subSkill, idx)=>{
				const li = ul.appendChild(document.createElement("li"));
				const details = li.appendChild(document.createElement("details"));
				details.open = true; //进化类技能默认打开
				details.className = "skill-details";
				details.appendChild(renderSkillTitle(skill.params[idx], { showTurns:true }));
				details.appendChild(renderSkillEntry(subSkill));
			});
			let dict = {
				skills: ul,
			};
			frg.ap(tsp.skill.evolved_skills(dict));
			if (loop) frg.ap(tsp.skill.evolved_skills_loop({icon: createIcon("evolved-skill-loop")}));
			break;
		}
		case SkillKinds.Delay: { //威吓
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.delay(dict));
			break;
		}
		case SkillKinds.MassAttack: { //全体攻击
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.mass_attack(dict));
			break;
		}
		case SkillKinds.LeaderChange: { //切换队长
			let type = skill.type;
			let dict = {
				icon: createIcon(skill.kind),
				target: type ? tsp.target.team_last() : tsp.target.self(),
			};
			frg.ap(tsp.skill.leader_change(dict));
			break;
		}
		case SkillKinds.NoSkyfall: { //无天降
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.no_skyfall(dict));
			break;
		}
		case SkillKinds.SelfHarm: { //主动自残
			let value = skill.value;
			let dict = {
				icon: createIcon("heal", "hp-decr"),
				value: renderValue(value, {percent: true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.self_harm(dict));
			break;
		}
		case SkillKinds.Heal: { //主动回血buff
			let value = skill.value;
			let dict = {
				icon: createIcon("heal", "hp-incr"),
				//icon: createIcon("auto-heal"),
				value: renderValue(value, {unit: tsp.unit.point, percent: value.kind == SkillValueKind.xRCV ? false : true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.heal(dict));
			break;
		}
		case SkillKinds.AutoHealBuff: { //自动回血buff
			let dict = {
				icon: createIcon("auto-heal"),
				value: renderValue(skill.value, {unit: tsp.unit.point, percent: true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.auto_heal_buff(dict));
			break;
		}
		case SkillKinds.DefenseBreak: { //破防
			let dict = {
				icon: createIcon(skill.kind),
				value: renderValue(skill.value, {percent: true}),
			};
			frg.ap(tsp.skill.defense_break(dict));
			break;
		}
		case SkillKinds.Analyze: { //分析

			const dict = {
				icon: createIcon(skill.kind),
				defBreak: renderSkill(defBreak(skill.value)),
			};
			frg.ap(tsp.skill.analyze(dict));
			break;
		}
		case SkillKinds.Poison: { //毒
			let dict = {
				icon: createIcon(skill.kind),
				belong_to: tsp.target.self(),
				target: tsp.target.enemy_all(),
				stats: tsp.stats.hp(),
				value: renderValue(skill.value),
			};
			frg.ap(tsp.skill.poison(dict));
			break;
		}
		case SkillKinds.TimeExtend: { //时间变化buff
			let value = skill.value;
			let dict = {
				icon: createIcon("status-time", SkillValue.isLess(value) ? "time-decr" : "time-incr"),
				value: renderValue(value, { unit:tsp.unit.seconds, plusSign: value.kind != SkillValueKind.Percent, percent: SkillValue.isLess(value) }),
				
			};
			frg.ap(tsp.skill.time_extend(dict));
			break;
		}
		case SkillKinds.FollowAttack: { //队长技倍率追打
			let dict = {
				//icon: createIcon("follow_attack"),
				belong_to: tsp.target.self(),
				target: tsp.target.enemy(),
				value: renderValue(skill.value),
			};
			frg.ap(tsp.skill.follow_attack(dict));
			break;
		}
		case SkillKinds.FollowAttackFixed: { //队长技固伤追打
			let damage = skill.value;
			let dict = {
				damage: renderValue(damage, {unit: tsp.unit.point}),
				attr: renderAttrs('fixed'),
			};
			frg.ap(tsp.skill.follow_attack_fixed(dict));
			break;
		}
		case SkillKinds.AutoHeal: { //队长技自动回血
			let dict = {
				icon: createIcon(skill.kind),
				belong_to: tsp.target.self(),
				value: renderValue(skill.value),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.auto_heal(dict));
			break;
		}
		case SkillKinds.CTW: { //时间暂停
			let {time, cond, skill: subSkill} = skill;
			let dict = {
				icon: createIcon(skill.kind),
				time: renderValue(time, { unit: tsp.unit.seconds }),
			};
			if (cond) {
				let dict2 = {
					cond: renderCondition(cond),
					skill: renderSkill(subSkill)
				}
				dict.addition = tsp.skill.ctw_addition(dict2);
			}
			frg.ap(tsp.skill.ctw(dict));
			break;
		}
		case SkillKinds.Gravity: { //重力
			let {value, target} = skill;
			let dict = {
				icon: createIcon(skill.kind),
				target: target === 'all' ? tsp.target.enemy_all() : tsp.target.enemy_one(),
				value: renderValue(value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.PartGravity: { //部位重力
			let {value, target} = skill;
			let dict = {
				icon: createIcon("rate-mul-part_break"), //直接用重力的
				part: tsp.target.enemy_part(),
				target: target === 'all' ? tsp.target.enemy_all() : tsp.target.enemy_one(),
				value: renderValue(value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.Resolve: { //根性
			let prob = skill.prob;
			let dict = {
				icon: createIcon(skill.kind),
				stats: renderStat('chp'),
				min: renderValue(skill.min, { percent:true }),
				max: renderValue(skill.max, { percent:true }),
			};
			frg.ap(tsp.skill.resolve(dict));
			break;
		}
		
		case SkillKinds.DamageEnemy: { //大炮和固伤
			let attr = skill.attr, target = skill.target, damage = skill.damage, times = skill.times;
			if (attr == null) break; //没有属性时，编号为0的空技能
			let dict = {
				target: target === 'all' ? tsp.target.enemy_all() : target === 'single' ? tsp.target.enemy_one() : tsp.target.enemy_attr({attr: renderAttrs(target, {affix: true})}),
				damage: renderValue(damage, {unit: tsp.unit.point}),
				attr: renderAttrs(attr, {affix: (attr === 'self' || attr === 'fixed') ? false : true}),
			};
			if (times)
			{
				dict.times = tsp.skill.damage_enemy_times({
					times: renderValue(v.constant(times), {unit: tsp.unit.times})
				});
				dict.totalDamage = tsp.skill.damage_enemy_count({
					damage: renderValue(v.constant(damage.value * times), {unit: tsp.unit.point})
				});
			}
			frg.ap(tsp.skill.damage_enemy(dict));
			break;
		}
		case SkillKinds.Unbind: { //解封
			let normal = skill.normal, awakenings = skill.awakenings, matches = skill.matches;
			let effects = [];
			let enabledStats = [normal, awakenings, matches].filter(Boolean);
			if (merge_skill && enabledStats.length >= 2 && enabledStats.every((s,i,arr)=>s==arr[0]))
			{
				if (normal)
				{
					effects.push(tsp.skill.unbind_normal({icon: createIcon("unbind-normal")}));
				}
				if (awakenings)
				{
					effects.push(tsp.skill.unbind_awakenings({icon: createIcon("unbind-awakenings")}));
				}
				if (matches)
				{
					effects.push(tsp.skill.unbind_matches({icon: createIcon("unbind-matches")}));
				}
				let dict = {
					turns: enabledStats[0],
					stats: effects.nodeJoin(tsp.word.slight_pause()),
				}
				frg.ap(tsp.skill.unbind(dict));
			}
			else
			{
				if (normal)
				{
					let dict = {
						turns: normal,
						stats: tsp.skill.unbind_normal({icon: createIcon("unbind-normal")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				if (awakenings)
				{
					let dict = {
						turns: awakenings,
						stats: tsp.skill.unbind_awakenings({icon: createIcon("unbind-awakenings")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				if (matches)
				{
					let dict = {
						turns: matches,
						stats: tsp.skill.unbind_matches({icon: createIcon("unbind-matches")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				frg.ap(effects.nodeJoin(tsp.word.comma()));
			}
			break;
		}
		case SkillKinds.BindSkill: {
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.bind_skill(dict));
			break;
		}
		case SkillKinds.BindCard: {
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.bind_card(dict));
			break;
		}
		case SkillKinds.BoardChange: { //洗版
			const attrs = skill.attrs;
			let dict = {
				orbs: renderOrbs(attrs),
			};
			frg.ap(tsp.skill.board_change(dict));
			if (!merge_skill)
			{
				const boardsBar = new BoardSet(new Board(attrs), new Board(attrs,7,6), new Board(attrs,5,4));
				boardsBar.boards.forEach(board=>{
					board.refreshTable();
				});
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.SkillBoost: { //溜
			const min = skill.min, max = skill.max;
			let dict = {
				icon: createIcon(skill.kind, SkillValue.isLess(min) ? "boost-decr" : "boost-incr"),
				turns_min: renderValue(min, { unit:tsp.unit.turns, plusSign:true }),
			};
			if (max.value !== min.value) {
				dict.turns_max = tsp.skill.skill_boost_range(
					{turns: renderValue(max, { unit:tsp.unit.turns, plusSign:true })}
				);
			}
			frg.ap(tsp.skill.skill_boost(dict));
			break;
		}
		case SkillKinds.AddCombo: { //+C
			const value = skill.value;
			let icon = createIcon(skill.kind);
			icon.setAttribute("data-add-combo", value);
			let dict = {
				icon: icon,
				value: value,
			};
			frg.ap(tsp.skill.add_combo(dict));
			break;
		}
		case SkillKinds.FixedTime: { //固定手指
			const value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				value: renderValue(value, { unit: tsp.unit.seconds }),
			};
			frg.ap(tsp.skill.fixed_time(dict));
			break;
		}
		case SkillKinds.MinMatchLength: { //最低匹配长度
			const value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				unmatchable: value - 1,
				matchable: value,
			};
			frg.ap(tsp.skill.min_match_length(dict));
			break;
		}
		case SkillKinds.DropRefresh: { //刷版
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.drop_refresh(dict));
			break;
		}
		case SkillKinds.Drum: { //太鼓达人音效
			frg.ap(tsp.skill.drum());
			break;
		}
		case SkillKinds.AutoPath: { //自动路径，小龙的萌新技能
			const {matchesNumber} = skill;
			frg.ap(tsp.skill.auto_path({
				icon: createIcon(skill.kind),
				matchesNumber: renderValue(matchesNumber),
			}));
			break;
		}
		case SkillKinds.Vampire: { //吸血
			let attr = skill.attr, damage = skill.damage, heal = skill.heal;
			let _dict = {
				target: tsp.target.enemy_one(),
				damage: renderValue(damage),
				attr: renderAttrs(attr, {affix: (attr === 'self' || attr === 'fixed') ? false : true}),
			};
			let dict = {
				icon: createIcon("heal", "hp-incr"),
				damage_enemy: tsp.skill.damage_enemy(_dict),
				heal: renderValue(heal, {percent: true}),
			};
			frg.ap(tsp.skill.vampire(dict));
			break;
		}
		case SkillKinds.CounterAttack: { //反击
			let attr = skill.attr, prob = skill.prob, value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				target: tsp.target.enemy(),
				chance: prob.value < 1 ? tsp.value.prob({value: renderValue(prob, { percent:true })}) : null,
				value: renderValue(value),
				attr: renderAttrs(attr, {affix: true}),
			};
			frg.ap(tsp.skill.counter_attack(dict));
			break;
		}
		case SkillKinds.ChangeOrbs: { //珠子变换
			let changes = skill.changes;
			let subDocument = [];
			for (const change of changes)
			{
				let dict = {
					from: renderOrbs(change.from),
					to: renderOrbs(change.to),
				};
				subDocument.push(tsp.skill.change_orbs(dict));
			}
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			break;
		}
		case SkillKinds.GenerateOrbs: { //产生珠子
			let orbs = skill.orbs, exclude = skill.exclude, count = skill.count;
			let dict = {
				exclude: exclude?.length ? tsp.word.affix_exclude({cotent: renderOrbs(exclude)}) : void 0,
				orbs: renderOrbs(orbs),
				value: count,
			};
			frg.ap(tsp.skill.generate_orbs(dict));
			if (!merge_skill)
			{
				const boardsBar = new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
				boardsBar.boards.forEach(board=>{
					board.generateOrbs(orbs, count, exclude);
					board.refreshTable();
				});
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.FixedOrbs: { //固定位置产生珠子
			let generates = skill.generates;
			let slight_pause = tsp.word.slight_pause().textContent;
			let subDocument = [];
			const boardsBar = merge_skill ? null : new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));

			for (const generate of generates)
			{
				const orbs = generate.orbs;
				const dict = {
					orbs: renderOrbs(orbs),
				};
				if (generate.type == 'shape')
				{
					dict.position = tsp.position.shape();
					boardsBar?.boards?.forEach(board=>board.setShape(generate.positions, orbs));
				}else
				{
					let posFrgs = [];
					if (generate.positions.length == 0) continue;
					if (generate.type == 'row')
					{
						const [sequence, reverse] = posSplit(generate.positions, 'row');
						if (sequence.length) posFrgs.push(tsp.position.top({pos: sequence.join(slight_pause)}));
						if (reverse.length) posFrgs.push(tsp.position.bottom({pos: reverse.join(slight_pause)}));
						boardsBar?.boards?.forEach(board=>board.setRows(generate.positions, orbs));
					}else
					{
						const [sequence, reverse] = posSplit(generate.positions, 'colum');
						if (sequence.length) posFrgs.push(tsp.position.left({pos: sequence.join(slight_pause)}));
						if (reverse.length) posFrgs.push(tsp.position.right({pos: reverse.join(slight_pause)}));
						boardsBar?.boards?.forEach(board=>board.setColumns(generate.positions, orbs));
					}
					dict.position = posFrgs.nodeJoin(tsp.word.slight_pause());
				}
				subDocument.push(tsp.skill.fixed_orbs(dict));
			}
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			if (boardsBar) {
				boardsBar.boards.forEach(board=>board.refreshTable());
				frg.ap(boardsBar.node);
			}
			
			break;
		}
		case SkillKinds.OrbDropIncrease: { //增加天降
			let {prob, attrs, flag, value} = skill;
			prob = prob || v.percent(100);
			let dict = {
				prob: renderValue(prob, {percent: true}),
				orbs: renderOrbs(attrs, {className: "drop", affix: true}),
				flag: flag && tsp.orbs[flag]({icon: createIcon("orb-" + flag)}) || null,
			};
			if (value?.kind == SkillValueKind.xMaxHP) {
				dict.value = tsp.skill.orb_thorn({value: renderValue(value, {percent: true})})
			}
			frg.ap(flag ? tsp.skill.orb_drop_increase_flag(dict) : tsp.skill.orb_drop_increase(dict));
			break;
		}
		case SkillKinds.VoidEnemyBuff:
		case SkillKinds.VoidFieldBuff:
		{
			const { buffs } = skill;
			let subDocument = [];
			for (const buff of buffs)
			{
				let dict = {
					icon: createIcon(buff),
				};
				let skillFunc = tsp.skill[buff.replace(/\-/g,'_')];
				if (skillFunc) {
					subDocument.push(skillFunc(dict));
				} else {
					subDocument.push(document.createTextNode(buff));
				}
			}
			let dict = {
				buff: subDocument.nodeJoin(tsp.word.slight_pause()),
			};
			
			frg.ap(tsp.skill[skill.kind.replace(/\-/g,'_')](dict));
			break;
		}
		case SkillKinds.ChangeAttribute: {
			const { attr, targets } = skill;
			let dict = {
				attr: renderAttrs(attr, {affix: true}),
				target: document.createDocumentFragment(),
			};
			
			const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
			let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
			if (atkUpTarget.length) {
				dict.target.appendChild(createTeamFlags(atkUpTarget));
			}
			
			dict.target.appendChild(targets.map(target=>
				tsp?.target[target.replaceAll("-","_")]?.())
				.nodeJoin(tsp.word.slight_pause()));

			frg.ap(tsp.skill.change_attribute(dict));
			break;
		}
		case SkillKinds.SetOrbState: {
			const {orbs, state, arg} = skill;
			let dict = {
				orbs: renderOrbs(orbs, {
					//有的时候附加效果限制个数，这个附加图标加到文字里面的图标上面的去不好看也不准确，应该只加到面板里。
					//className: state,
					affix: true
				}),
				icon: createIcon('orb-' + state),
			};
			switch (state)
			{
				case "enhanced":{
					dict.value = renderValue(arg.enhance, {percent: true});
					frg.ap(tsp.skill.set_orb_state_enhanced(dict));
					break;
				}
				case "locked":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_locked(dict));
					break;
				}
				case "unlocked":{
					frg.ap(tsp.skill.set_orb_state_unlocked(dict));
					break;
				}
				case "bound":{
					frg.ap(tsp.skill.set_orb_state_bound(dict));
					break;
				}
				case "combo-drop":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_combo_drop(dict));
					break;
				}
				case "nail":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_nail(dict));
					break;
				}
			}
			break;
		}
		case SkillKinds.RateMultiply: {
			let rate = skill.rate, value = skill.value;
			let dict = {
				rate: tsp.skill["rate_multiply_" + rate]({icon: createIcon(skill.kind + "-" + rate)}),
				value: renderValue(value),
			};
			frg.ap(tsp.skill.rate_multiply(dict));
			break;
		}
		case SkillKinds.ReduceDamage: {
			let attrs = skill.attrs, percent = skill.percent, condition = skill.condition, prob = skill.prob;
			let dict = {
				icon: createIcon(skill.kind),
				attrs: renderAttrs(attrs, {affix: true}),
				value: renderValue(percent, {percent: true}),
				condition: condition ? renderCondition(condition) : null,
				chance: prob.value < 1 ? tsp.value.prob({value: renderValue(prob, { percent:true })}) : null,
			};
			frg.ap(tsp.skill.reduce_damage(dict));
			break;
		}
		case SkillKinds.PowerUp: {
			let { attrs, types, targets, condition, value, reduceDamage, additional, eachTime } = skill;
			let dict = {
				icon: createIcon(skill.kind),
			};
			let comma = tsp.word.comma;
			if (condition) dict.condition = renderCondition(condition);
			
			let targetDict = {}, attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				targetDict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(targetDict.attrs);
			}
			if (types?.length)
			{
				targetDict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(targetDict.types);
			}
			if (targets != undefined)
			{
				targetDict.target = document.createDocumentFragment();

				//增加队员伤害的技能的目标，删选出来，其他的目标则不显示
				const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
				let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
				if (atkUpTarget.length) {
					targetDict.target.appendChild(createTeamFlags(atkUpTarget));
				}
				
				targetDict.target.appendChild(targets.map(target=>
					tsp?.target[target.replaceAll("-","_")]?.())
					.nodeJoin(tsp.word.slight_pause()));

				attrs_types.push(targetDict.target);
			}
			if (attrs_types.length)
			{
				targetDict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
				dict.targets = tsp.skill.power_up_targets(targetDict);
			}

			if (value){
				/*if (attrs?.includes(5) && value.kind == SkillPowerUpKind.Multiplier)
				{ //如果属性有5，则是回复力
					let _value = Object.assign({}, value);
					_value.rcv = value.atk;
					_value.atk = value.rcv;
					value = _value;
				}*/
				if (value.kind == SkillPowerUpKind.Multiplier && Boolean(value.hp || value.atk || value.rcv) == false)
				{
					//不显示 value
				}else
				{
					dict.value = renderPowerUp(value);
				}
			}
			if (reduceDamage && reduceDamage.value > 0) {
				let reduceDamageNode = tsp.skill.reduce_damage({
					value: renderValue(reduceDamage, {percent: true}),
					icon: createIcon("reduce-damage"),
				});
				dict.reduceDamage = [comma(), reduceDamageNode].nodeJoin();
			}
			if (additional?.length) {
				let additionalNode = additional.filter(Boolean).map(subSkill=>renderSkill(subSkill, option));
				dict.additional = [comma(), additionalNode.nodeJoin(comma())].nodeJoin();
			}
			if (eachTime) {
				dict.each_time = tsp.word.each_time();
			}
			frg.ap(tsp.skill.power_up(dict));
			break;
		}
		case SkillKinds.SlotPowerUp: { //增加卡槽伤害倍率
			const {value, targets} = skill;
			
			let dict = {
				icon: createIcon(skill.kind, value.atk > 1 ? "atk-incr" : "atk-decr"),
				targets: document.createDocumentFragment(),
				value: renderPowerUp(value),
			};
			
			dict.targets.append(createTeamFlags(targets));
			dict.targets.append(targets.map(target=>
				tsp?.target[target.replaceAll("-","_")]?.())
				.nodeJoin(tsp.word.slight_pause()));

			frg.ap(tsp.skill.slot_power_up(dict));
			break;
		}
		case SkillKinds.Henshin: { //变身
			let ids = skill.ids, random = skill.random;
			let doms = ids.map(id=>{
				let dom = cardN(id);
				//dom.monDom.onclick = changeToIdInSkillDetail;
				return dom;	})
			let dict = {
				cards: doms.nodeJoin(),
			}
			frg.ap(random ? 
				tsp.skill.random_henshin(dict) :
				tsp.skill.henshin(dict)
				);
			break;
		}
		case SkillKinds.VoidPoison: { //毒无效
			let dict = {
				poison: renderOrbs([7,8], {affix: true})
			}
			frg.ap(tsp.skill.void_poison(dict));
			break;
		}
		case SkillKinds.SkillProviso: { //条件限制才能用技能
			let cond = skill.cond;
			let dict = {
				condition: renderCondition(cond)
			}
			frg.ap(tsp.skill.skill_proviso(dict));
			break;
		}
		case SkillKinds.ImpartAwakenings: { //赋予队员觉醒
			let {attrs, types, target, awakenings} = skill;
			let dict = {
				awakenings: renderAwakenings(awakenings, {affix: true}),
			}
			
			let attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				dict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(dict.attrs);
			}
			if (types?.length)
			{
				dict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(dict.types);
			}
			if (target)
			{
				dict.target = tsp?.target[target.replaceAll("-","_")]?.();
				attrs_types.push(dict.target);
			}
			if (attrs_types.length)
			{
				dict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
			}

			frg.ap(tsp.skill.impart_awoken(dict));
			break;
		}
		case SkillKinds.ObstructOpponent: { //条件限制才能用技能
			let type = skill.type, pos = skill.pos, enemy_skills = skill.enemy_skills;
			let slight_pause = tsp.word.slight_pause().textContent;
			let dict = {
				skills: enemy_skills.join(slight_pause)
			}
			let targetDict = { positions: pos?.map(p=>p+1).join(slight_pause)}
			switch (type)
			{
				case "after-me": {
					dict.target = tsp.skill.obstruct_opponent_after_me(targetDict);
					break;
				}
				case "designated-position": {
					dict.target = tsp.skill.obstruct_opponent_designated_position(targetDict);
					break;
				}
				case "before-me": {
					dict.target = tsp.skill.obstruct_opponent_before_me(targetDict);
					break;
				}
				default: {
					dict.target = tsp.cond.unknown();
					break;
				}
			}
			frg.ap(tsp.skill.obstruct_opponent(dict));
			break;
		}
		case SkillKinds.IncreaseDamageCapacity: { //增加伤害上限
			const {cap, targets, attrs, types} = skill;
			let dict = {
				icon: createIcon(skill.kind, cap > 0x7FFFFFFF ? "cap-incr" : "cap-decr"),
				targets: document.createDocumentFragment(),
				cap: cap.bigNumberToString(),
			};

			let targetDict = {}, attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				targetDict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(targetDict.attrs);
			}
			if (types?.length)
			{
				targetDict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(targetDict.types);
			}
			if (targets != undefined)
			{
				targetDict.target = document.createDocumentFragment();

				//增加队员伤害的技能的目标，删选出来，其他的目标则不显示
				// const targetTypes = SkillTarget.type1;
				// let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
				// if (atkUpTarget.length) {
					targetDict.target.appendChild(createTeamFlags(targets));
				// }
				
				targetDict.target.appendChild(targets.map(target=>
					tsp?.target[target.replaceAll("-","_")]?.())
					.nodeJoin(tsp.word.slight_pause()));

				attrs_types.push(targetDict.target);
			}
			if (attrs_types.length)
			{
				targetDict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
				dict.targets = tsp.skill.power_up_targets(targetDict);
			}

			frg.ap(tsp.skill.increase_damage_cap(dict));
			break;
		}
		case SkillKinds.BoardJammingStates: { //板面产生干扰状态
			const { state, posType, positions, count, time, attrs } = skill;
			const boardsBar = merge_skill ? null : new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
			const slight_pause = tsp.word.slight_pause().textContent;

			let dict = {
				icon: createIcon('board-' + state),
				state: tsp.board[state.replaceAll("-","_")](),
				position: posType == 'random' ? tsp.position.random() : tsp.position.shape(),
			};
			if (state == 'roulette') { //轮盘位
				const commentContent = [];
				time && commentContent.push(tsp.board.roulette_time({duration: renderValue(v.constant(time), {unit: tsp.unit.seconds})}));
				Array.isArray(attrs) && attrs.length && commentContent.push(tsp.board.roulette_attrs({orbs: renderOrbs(attrs)}));
				dict.comment = tsp.word.comment({content: commentContent.nodeJoin(tsp.word.slight_pause())});
				
				dict.count = renderValue(v.constant(count || positions.flat().length), {unit: tsp.unit.orbs});
				boardsBar?.boards?.forEach(board=>{
					if (posType == 'random')
						board.generateBlockStates('roulette', count);
					else
						board.setShape(positions, null, null, 'roulette');
				});
			}
			if (state == 'clouds') { //云
				const [width, height] = skill.size;
				dict.size = tsp.value.size({ width, height});
				boardsBar?.boards?.forEach(board=>{
					board.generateBlockStates('clouds', count, [width, height], positions);
				});
			}
			if (state == 'immobility') { //封条
				const {colums, rows} = skill.positions;

				let posFrgs = [];
				const [sequenceCols, reverseCols] = posSplit(colums, 'colum');
				if (sequenceCols.length) posFrgs.push(tsp.position.left({pos: sequenceCols.join(slight_pause)}));
				if (reverseCols.length) posFrgs.push(tsp.position.right({pos: reverseCols.join(slight_pause)}));

				const [sequenceRows, reverseRows] = posSplit(rows, 'row');
				if (sequenceRows.length) posFrgs.push(tsp.position.top({pos: sequenceRows.join(slight_pause)}));
				if (reverseRows.length) posFrgs.push(tsp.position.bottom({pos: reverseRows.join(slight_pause)}));
				
				boardsBar?.boards?.forEach(board=>{
					board.setColumns(colums, null, null, 'immobility');
					board.setRows(rows, null, null, 'immobility');
				});

				dict.position = posFrgs.nodeJoin(tsp.word.slight_pause());
			}
			if (state == 'deep-dark') { //超暗暗
				const { min, max } = skill;

				dict.count = renderValue(v.constant(min), {unit: tsp.unit.orbs});
				if (min !== max) {
					dict.count.append(tsp.word.range_hyphen(),renderValue(v.constant(max), {unit: tsp.unit.orbs}));
				}
				boardsBar?.boards?.forEach(board=>{
					if (posType == 'random')
						board.generateBlockStates('deep-dark', min == max ? min : Math.randomInteger(max, min));
					else
						board.setShape(positions, null, null, 'deep-dark');
				});
			}
			frg.ap(tsp.skill.board_jamming_state(dict));

			if (boardsBar) {
				boardsBar.boards.forEach(board=>board.refreshTable());
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.BoardSizeChange: { //改变板面大小
			const { width, height } = skill;

			let dict = {
				icon: createIcon(skill.kind),
				size: tsp.value.size({ width, height}),
			};
			frg.ap(tsp.skill.board_size_change(dict));
			break;
		}
		case SkillKinds.RemoveAssist: { //去除武器
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.remove_assist(dict));
			break;
		}
		case SkillKinds.PredictionFalling: { //预知掉落
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.prediction_falling(dict));
			break;
		}
		case SkillKinds.BreakingShield: { //破白盾
			let dict = {
				icon: createIcon(skill.kind),
				target: tsp.target.enemy(),
				value: renderValue(skill.value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.PlayVoice: { //播放技能语音
			const { stage, id } = skill;
			const icon = document.createElement("icon");
			icon.className = "awoken-icon";
			icon.setAttribute("data-awoken-icon", 63);
			icon.dataset.voiceId = id || Cards[editBox.mid].voiceId;
			icon.onclick = playOwnVoiceId;

			let dict = {
				stage,
				id,
				icon,
			};
			frg.ap(tsp.skill.play_voice(dict));
			break;
		}
		case SkillKinds.TimesLimit: { //使用次数限制
			const { turns } = skill;
			let dict = {
				turns
			};
			frg.ap(tsp.skill.times_limit(dict));
			break;
		}
		case SkillKinds.FixedStartingPosition: { //固定起手位置
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.fixed_starting_position(dict));
			break;
		}
		case SkillKinds.DestroyOrb: { //固定起手位置
			const { attrs } = skill;
			let dict = {
				orbs: renderOrbs(attrs, { affix: true}),
			};
			frg.ap(tsp.skill.destroy_orb(dict));
			break;
		}
		
		default: {
			console.log("未处理的技能类型",skill.kind, skill);
			frg.ap(skill.kind);
		}
	}
	return frg;
};
