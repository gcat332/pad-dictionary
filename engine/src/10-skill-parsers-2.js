	[128](...params) { //rows1, attrs1, rows2, attrs2 ...
		const generates = [];
		for (let i = 0; i < params.length; i+=2) {
			generates.push({
				orbs: Bin.unflags(params[i+1]),
				type: 'row',
				positions: Bin.unflags(params[i])
			});
		}
		return fixedOrbs.apply(null, generates);
	},
	[129](attrs, types, hp, atk, rcv, rAttrs, rPercent) {
		return [
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent)) || null
		].filter(Boolean);
	},
	[130](percent, attrs, types, atk, rcv, rAttrs, rPercent) {
		return [
			(atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(0, percent)) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent), c.hp(0, percent)) || null
		].filter(Boolean);
	},
	[131](percent, attrs, types, atk, rcv, rAttrs, rPercent) {
		return [
			(atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(percent, 100)) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent), c.hp(percent, 100)) || null
		].filter(Boolean);
	},
	[132](turns, time, percent) { return activeTurns(turns, timeExtend(time ? v.constant(time / 10) : v.percent(percent))); },
	[133](attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.useSkill()); },
	[136](attrs1, hp1, atk1, rcv1, attrs2, hp2, atk2, rcv2) {
		return [
			powerUp(Bin.unflags(attrs1), null, p.mul({ hp: hp1 || 100, atk: atk1 || 100, rcv: rcv1 || 100 })),
			powerUp(Bin.unflags(attrs2), null, p.mul({ hp: hp2 || 100, atk: atk2 || 100, rcv: rcv2 || 100 })),
		];
	},
	[137](types1, hp1, atk1, rcv1, types2, hp2, atk2, rcv2) {
		return [
			powerUp(null, Bin.unflags(types1), p.mul({ hp: hp1 || 100, atk: atk1 || 100, rcv: rcv1 || 100 })),
			powerUp(null, Bin.unflags(types2), p.mul({ hp: hp2 || 100, atk: atk2 || 100, rcv: rcv2 || 100 })),
		];
	},
	[138](...ids) { return ids.flatMap(id => this.parser(id)); },
	[139](attrs, types, percent1, less1, mul1, percent2, less2, mul2) {
		return [
			powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: mul1 || 100 }), less1 ? c.hp(0, percent1) : c.hp(percent1, 100)),
			powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: mul2 || 100 }), less1 ?
				(less2 ? c.hp(percent1, percent2) : c.hp(percent2, 100)) :
				(less2 ? c.hp(0, percent2) : c.hp(percent2, percent1 - 1))
			),
		];
	},
	[140](attrs, mul) { return setOrbState(Bin.unflags(attrs), 'enhanced', {enhance: v.percent(mul)}); },
	[141](count, to, exclude) { return generateOrbs(Bin.unflags(to), Bin.unflags(exclude), count); },
	[142](turns, attr) { return activeTurns(turns, changeAttr(attr, ['self'])); },
  
	[143](mul, dmgAttr) { return damageEnemy('all', dmgAttr ?? 0, v.xTeamHP(mul)); },

	[144](teamAttrs, mul, single, dmgAttr) { return damageEnemy(single ? 'single' : 'all', dmgAttr ?? 0, v.xTeamATK(Bin.unflags(teamAttrs), mul)); },
	[145](mul) { return heal(v.xTeamRCV(mul)); },
	[146](turns1, turns2) { return skillBoost(v.constant(turns1), turns2 ? v.constant(turns2) : undefined); },
  
	[148](percent) { return rateMultiply(v.percent(percent), 'exp'); },
	[149](mul) { return powerUp(null, null, p.mul({ rcv: mul }), c.exact('match-length', 4, [Attributes.Heart])); },
	[150](_, mul) { return powerUp({targets: ['the-attr']}, null, p.mul({ atk: mul }), c.exact('match-length', 5, 'enhanced')); },
	[151](mul1, mul2, percent) {
		return powerUp(null, null, p.scaleCross([{ single: true, attr: [Attributes.Heart], atk: mul1 || 100, rcv: mul2 || 100 }]), null, v.percent(percent));
	},
	[152](attrs, count) { return setOrbState(Bin.unflags(attrs), 'locked', {count: v.constant(count)}); },
	[153](attr, _) { return changeAttr(attr, ['enemy_all']); },
	[154](from, to) { return changeOrbs(fromTo(Bin.unflags(from), Bin.unflags(to))); },
	[155](attrs, types, hp, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.multiplayer()); },
	[156](turns, awoken1, awoken2, awoken3, type, mul) {
		if (type == 1)
		{
			return heal(v.percentAwakenings([awoken1, awoken2, awoken3].filter(Boolean), v.xRCV(mul)));
		}else
		{
			return activeTurns(turns, type === 2 ?
				powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3].filter(Boolean), null, null, p.mul({atk: mul - 100, hp:0, rcv:0}))) :
				reduceDamage('all', v.percentAwakenings([awoken1, awoken2, awoken3].filter(Boolean), v.percent(mul)))
			);
		}
	},
	[157](attr1, mul1, attr2, mul2, attr3, mul3) {
		let crosses = [
			{ single: false, attr: [attr1], atk: mul1 },
			{ single: false, attr: [attr2], atk: mul2 },
			{ single: false, attr: [attr3], atk: mul3 }
		].filter(cross => cross.atk);
	  	return powerUp(null, null, p.scaleCross(crosses));
	},
	[158](len, attrs, types, atk, hp, rcv) {
	  return [
		minMatch(len),
		powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }))
	  ];
	},
	[159](attrs, min, base, bonus, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [base, 100], [bonus, 0])); },
	[160](turns, combo) { return activeTurns(turns, addCombo(combo)); },
	[161](percent) { return gravity(v.xMaxHP(percent)); },
	[162]() { return boardSizeChange(); },
	[163](attrs, types, hp, atk, rcv, rAttrs, rPercent) {
	  return [
		noSkyfall(),
		(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
		rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent)) || null,
	  ].filter(Boolean);
	},
	[164](attrs1, attrs2, attrs3, attrs4, min, atk, rcv, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, attrs.length, [atk, rcv], [bonus, bonus]));
	},
	[165](attrs, min, baseAtk, baseRcv, bonusAtk, bonusRcv, incr) {
		const attrsArr = Bin.unflags(attrs);
		return powerUp(null, null, p.scaleAttrs(attrsArr, min, min + (min < attrsArr.length ? (incr ?? 0) : 0), [baseAtk || 100, baseRcv || 100], [bonusAtk, bonusRcv]));
	},
	[166](min, baseAtk, baseRcv, bonusAtk, bonusRcv, max) { return powerUp(null, null, p.scaleCombos(min, max, [baseAtk, baseRcv], [bonusAtk, bonusRcv])); },
	[167](attrs, min, baseAtk, baseRcv, bonusAtk, bonusRcv, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [baseAtk, baseRcv], [bonusAtk, bonusRcv])); },
	[168](turns, awoken1, awoken2, awoken3, awoken4, awoken5, awoken6, mul) {
		return activeTurns(turns, 
			powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3, awoken4, awoken5, awoken6].filter(Boolean), null, null, p.mul({atk: mul, hp:0, rcv:0})))
		);
	},
	[169](min, base, percent, bonus, max) { return powerUp(null, null, p.scaleCombos(min, max ?? min, [base || 100, 100], [bonus, 0]), null, v.percent(percent)); },
	//stage的真实用法目前不知道，缺少样本来判断，不知道到底是直接算数(stage-1)还是算二进制个数(Bin.unflags(stage).length)。 2022年5月23日
	//按 瘦鹅 的说法，也可能是因为暗牛头限制了5色， 所以就算是3级到了6色，也只算5色。
	[170](attrs, min, base, percent, bonus, stage) {
		let attrsArr = Bin.unflags(attrs);
		return powerUp(null, null, p.scaleAttrs(attrsArr, min, Math.min(min + (stage || 0), attrsArr.length), [base, 100], [bonus ?? 0, 0]), null, v.percent(percent));
	},
	[171](attrs1, attrs2, attrs3, attrs4, min, mul, percent, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, bonus ? attrs.length : min, [mul, 100], [bonus ?? 0, 0]), null, v.percent(percent));
	},
	[172]() { return setOrbState(Attributes.orbs, 'unlocked'); },
	[173](turns, attrAbsorb, comboAbsorb, damageAbsorb) {
	  return activeTurns(turns, voidEnemyBuff(
		[
		  attrAbsorb && 'attr-absorb',
		  comboAbsorb && 'combo-absorb',
		  damageAbsorb && 'damage-absorb'
		].filter((buff) => typeof buff === 'string')
	  ));
	},
	[175](series1, series2, series3, hp, atk, rcv) { return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('series', [series1, series2, series3].filter(Boolean))); },
	[176](row1, row2, row3, row4, row5, attrs) {
		return fixedOrbs(
			{ orbs: [attrs ?? 0], type: 'shape', positions: [row1, row2, row3, row4, row5].map(Bin.unflags) }
		);
	},
	[177](attrs, types, hp, atk, rcv, remains, baseAtk, bonusAtk) {
	  return [
		noSkyfall(),
		(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
		baseAtk && powerUp(null, null, p.scaleRemainOrbs(remains, [baseAtk ?? 100, 100], [bonusAtk ?? 0, 0])) || null
	  ].filter(Boolean);
	},
	[178](time, attrs, types, hp, atk, rcv, attrs2, percent) {
		return [
			fixedTime(time),
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })),
			percent && reduceDamage(Bin.unflags(attrs2), v.percent(percent)) || null,
		].filter(Boolean);
		/*const reduceAttrs = Bin.unflags(attrs2);
		const isAllAttr = isEqual(reduceAttrs, Attributes.attr);
		return [
			fixedTime(time),
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), null, isAllAttr ? v.percent(percent) : null),
			percent && !isAllAttr && reduceDamage(reduceAttrs, v.percent(percent)) || null,
		].filter(Boolean);*/
	},
	[179](turns, value, percent, bind, awokenBind) {
		return [
			(bind || awokenBind) ? unbind(bind ?? 0, awokenBind ?? 0) : null,
			activeTurns(turns, autoHealBuff(value ? v.constant(value) : v.xMaxHP(percent)))
		].filter(Boolean);
	},
	[180](turns, percent) { return activeTurns(turns, orbDropIncrease(v.percent(percent), [], 'enhanced')); },
  
	[182](attrs, len, mul, percent) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul || 100, 100], [0, 0]), null, v.percent(percent)); },
	[183](attrs, types, percent1, atk1, reduce, percent2, atk2, rcv2) {
	  return [
		(percent1 > 0) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk1 || 100 }), c.hp(percent1, 100), v.percent(reduce)) || null,
		(atk2 || rcv2) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk2 || 100, rcv: rcv2 || 100 }), c.hp(0, percent2 || percent1)) || null
	  ].filter(Boolean);
	},
	[184](turns) { return activeTurns(turns, noSkyfall()); },
	[185](time, attrs, types, hp, atk, rcv) {
	  return [
		timeExtend(v.constant(time / 100)),
		powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })),
	  ];
	},
	[186](attrs, types, hp, atk, rcv) {
	  return [
		boardSizeChange(),
		(hp || atk ||rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
	  ].filter(Boolean);
	},

