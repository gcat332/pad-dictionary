	[188](value) {
	  return damageEnemy('single', 'fixed', v.constant(value));
	},
	[189]() {
	  return [
		setOrbState(Attributes.orbs, 'unlocked'),
		boardChange([0,1,2,3]),
		autoPath(3),
	  ];
	},
	[190](attrs, count) { return setOrbState(Bin.unflags(attrs), 'combo-drop', {count: v.constant(count)}); },

	[191](turns) {
	  return activeTurns(turns, voidEnemyBuff(['damage-void']));
	},
	[192](attrs, len, mul, combo) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul || 100, 100], [0, 0], true), null, null, combo ? [addCombo(combo)] : null);
	},
	[193](attrs, atk, rcv, percent) {
		return powerUp(null, null, p.mul([atk || 100, rcv || 100]), c.LShape(Bin.unflags(attrs)), v.percent(percent));
	},
	[194](attrs, min, mul, combo) {
		return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min, [mul || 100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[195](percent) {
	  return selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1));
	},
	[196](matches) {
	  return unbind(0,0,matches);
	},
	[197]() {
	  return voidPoison();
	},
	[198](heal, atk, percent, awokenBind) {
		return powerUp(null, null, p.mul([atk || 100, 100]), c.heal(heal), percent && v.percent(percent), awokenBind && [unbind(0, awokenBind ?? 0)]);
	},
	[199](attrs, min, damage) {
		return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[200](attrs, len, damage) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[201](attrs1, attrs2, attrs3, attrs4, min, damage) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, min, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[202](id) {
		return henshin(id);
	},
	[203](evotypeid, hp, atk, rcv) {
		let evotype = (type=>{
			switch (type) {
				case 0: return "pixel-evo";
				case 2: return "reincarnation-evo";
				default: return type;
			}
		})(evotypeid);
		return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }),
		c.compo('evolution', [evotype]));
	},

	[205](attrs, turns) { return activeTurns(turns, orbDropIncrease(null, Bin.unflags(attrs == -1 ? 0b1111111111: attrs), 'locked')); },
	[206](attrs1, attrs2, attrs3, attrs4, attrs5, min, combo) {
		const attrs = [attrs1, attrs2, attrs3, attrs4, attrs5].filter(Boolean);
		return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, min, [100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[207](turns, time, row1, row2, row3, row4, row5, count) {
		/*return activeTurns(turns, count ?
			generateOrbs( ['variation'], null, count, time/100):
			fixedOrbs( { orbs: ['variation'], time: time/100, type: 'shape', positions: [row1, row2, row3, row4, row5].map(row=>Bin.unflags(row)) })
		);*/
		const options = { time: time/100};
		if (count) {
			options.count = count;
		} else {
			options.positions = [row1, row2, row3, row4, row5].map(Bin.unflags);
		}
		return activeTurns(turns, 
			boardJammingStates('roulette', count ? 'random' : 'shape', options)
		);
	},
	[208](count1, to1, exclude1, count2, to2, exclude2) {
		return [
			generateOrbs(Bin.unflags(to1), Bin.unflags(exclude1), count1),
			generateOrbs(Bin.unflags(to2), Bin.unflags(exclude2), count2),
		];
	},
	[209](combo) {
		return powerUp(null, null, p.scaleCross([{ single: true, attr: [Attributes.Heart], atk: 100, rcv: 100}]), null, null, combo ? [addCombo(combo)] : null);
	},
	[210](attrs, reduce, combo) {
		return powerUp(null, null, p.scaleCross([{ single: false, attr: Bin.unflags(attrs), atk: 100, rcv: 100}]), null, v.percent(reduce), combo ? [addCombo(combo)] : null);
	},
	[213](attrs, types, ...awakenings) { //赋予觉醒的队长技
	  return impartAwakenings(Bin.unflags(attrs), Bin.unflags(types), null, awakenings);
	},
	[214](turns) { return activeTurns(turns, bindSkill()); },
	[215](turns, attrs) { return activeTurns(turns, setOrbState(Bin.unflags(attrs), 'bound')); },

	[217](rarity, hp, atk, rcv) {
		return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }),
		c.compo('team-total-rarity', rarity));
	},
	[218](turns) { return skillBoost(v.constant(-turns)); },

	[219](attrs, len, combo) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[220](attrs, combo) {
		var skill = powerUp(null, null, p.mul([100,100]), c.LShape(Bin.unflags(attrs)), null, combo ? [addCombo(combo)] : null);
		return skill;
	},
	[221](attrs, damage) {
		return powerUp(null, null, p.mul([100,100]), c.LShape(Bin.unflags(attrs)), null, damage ? [followAttackFixed(damage)] : null);
	},

	[223](combo, damage) {
		return powerUp(null, null, p.scaleCombos(combo, combo, [100, 100], [0, 0]), null, null, damage ? [followAttackFixed(damage)] : null);
	},
	[224](turns, attr) { return activeTurns(turns, changeAttr(attr, ['enemy_all'])); },
	[225](min, max) { return skillProviso(c.hp(min ?? 0, max ?? 100)); },
	[226](turns, percent) { return activeTurns(turns, orbDropIncrease(v.percent(percent), [], 'nail')); },
	[227]() { return leaderChange(1); },
	[228](turns, attrs, types, atk, rcv) {
		return activeTurns(turns,
			powerUp(null, null, p.scaleStateKind(null, Bin.unflags(attrs), Bin.unflags(types), p.mul({atk: atk, rcv: rcv ?? 0, hp:0})))
		);
	},
	[229](attrs, types, hp, atk, rcv) {
		return powerUp(null, null, p.scaleStateKind(null, Bin.unflags(attrs), Bin.unflags(types), p.mul({hp: hp || 0, atk: atk || 0, rcv: rcv || 0})));
	},
	//按位置增伤主动技1
	[230](turns, target, mul) {
		const targetTypes = SkillTarget.type1;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			slotPowerUp(p.mul({ atk: mul }), typeArr)
		);
	},
	[231](turns, awoken1, awoken2, awoken3, awoken4, awoken5, atk, rcv) {
		return activeTurns(turns, powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3, awoken4, awoken5].filter(Boolean), null, null, p.mul({atk: atk, hp:0, rcv: rcv ?? 0}))));
	},
	[232](...ids) { return evolvedSkills(false, ids.map(id => this.parser(id))); },
	[233](...ids) { return evolvedSkills(true, ids.map(id => this.parser(id))); },
	[234](min, max) { return skillProviso(c.stage(min ?? 0, max ?? 0)); },
	[235](attrs, lenMin, lenExact, atk, reducePercent, combo, damage, rcv) {
		// const len = lenMin || lenExact; //宝珠长度
		// const ee = Boolean(lenExact); //是否为刚好等于
		//第二个参数为多少以上就算，第三个参数为多少以上才算
		//return powerUp(null, null, p.mul({ atk: atk || 100}), c.exact('match-length', lenExact, Bin.unflags(attr)), v.percent(percent), [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean), true);
		//let powerup, condition;
		let powerup = Boolean(lenMin)
			? p.scaleMatchLength(Bin.unflags(attrs), lenMin, lenMin, [atk || 100, rcv || 100], [0, 0])
			: p.mul({ atk: atk || 100});
		let condition = Boolean(lenExact)
			? c.exact('match-length', lenExact, Bin.unflags(attrs))
			: null;
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		const eachTime = true;
		return powerUp(null, null, powerup, condition, v.percent(reducePercent), additional, eachTime);
	},
	[236](...ids) { //随机变身
		return henshin(ids.distinct(), true);
	},
	[237](turns, hp) { //改变HP上限
		return activeTurns(turns,
			powerUp(null, null, p.mul({ hp: hp }))
		);
	},
	[238](turns, width, height, pos1, pos2) { //产云
		return activeTurns(turns,
			boardJammingStates('clouds', (pos1 && pos2) ? 'fixed' : 'random', { size: [width, height], positions: [pos1, pos2] })
		);
	},
	[239](colum, turns, row) { //产封条
		//const colums = Bin.unflags(colum), rows = Bin.unflags(row);
		return activeTurns(turns,
			boardJammingStates('immobility', 'fixed', { positions: {colums: Bin.unflags(colum), rows: Bin.unflags(row)} })
		);
	},
	[241](turns, cap) { //改变伤害上限主动技
		// const targetTypes = SkillTarget.type1;
		// const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, ["self"])
		);
	},
	[243](turns, attrs, hpPercent, probPercent) { //掉落荆棘珠
		return activeTurns(turns, orbDropIncrease(v.percent(probPercent), Bin.unflags(attrs), 'thorn', v.xMaxHP(hpPercent)));
	},
	[244](turns, type) { //改变板面大小主动技
		let width, height;
		switch (type) {
			case 1: {
				width = 7;
				height = 6;
				break;
			}
			case 2: {
				width = 5;
				height = 4;
				break;
			}
			case 3: {
				width = 6;
				height = 5;
				break;
			}
			default: {
				width = 6;
				height = 5;
			}
		}
		return activeTurns(turns, boardSizeChange(width, height));
	},
