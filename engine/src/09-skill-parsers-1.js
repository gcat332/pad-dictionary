const skillObjectParsers = {
	//parser: (() => []), //这个用来解决代码提示的报错问题，不起实际作用
  
	[0](attr, mul) { return damageEnemy('all', attr, v.xATK(mul)); },
	[1](attr, value) { return damageEnemy('all', attr, v.constant(value)); },
	[2](mul, _) { return damageEnemy('single', 'self', v.xATK(mul)); },
	[3](turns, percent) { return activeTurns(turns, reduceDamage('all', v.percent(percent))); },
	[4](mul) { return poison(v.xATK(mul)); },
	[5](time) { return CTW(v.constant(time)); },
	[6](percent) { return gravity(v.xCHP(percent)); },
	[7](mul) { return heal(v.xRCV(mul)); },
	[8](value) { return heal(v.constant(value)); },
	[9](from, to) { return changeOrbs(fromTo([from ?? 0], [to ?? 0])); },
	[10]() { return dropRefresh(); },
	[11](attr, mul) { return powerUp([attr], null, p.mul({ atk: mul })); },
	[12](mul) { return followAttack(v.xATK(mul)); },
	[13](mul) { return autoHeal(v.xRCV(mul)); },
	[14](min, max) { return resolve(v.percent(min), v.percent(max ?? 100)); },
	[15](time) { return timeExtend(v.constant(time / 100)); },
	[16](percent) { return reduceDamage('all', v.percent(percent)); },
	[17](attr, percent) { return reduceDamage([attr], v.percent(percent)); },
	[18](turns) { return activeTurns(turns, delay()); },
	//破防
	[19](turns, percent) { return activeTurns(turns, defBreak(v.percent(percent))); },
	[20](from1, to1, from2, to2) { 
		if ((to1 ?? 0) == (to2 ?? 0))
			return changeOrbs(fromTo([from1 ?? 0, from2 ?? 0], [to1 ?? 0]));
		else
			return changeOrbs(
				fromTo([from1 ?? 0], [to1 ?? 0]),
				fromTo([from2 ?? 0], [to2 ?? 0])
			);
	},
	[21](turns, attr, percent) { return activeTurns(turns, reduceDamage([attr], v.percent(percent))); },
	[22](type, mul) { return powerUp(null, [type], p.mul({ atk: mul })); },
	[23](type, mul) { return powerUp(null, [type], p.mul({ hp: mul })); },
	[24](type, mul) { return powerUp(null, [type], p.mul({ rcv: mul })); },
  
	[26](mul) { return powerUp(null, null, p.mul({ atk: mul })); },
  
	[28](attr, mul) { return powerUp([attr], null, p.mul({ atk: mul, rcv: mul })); },
	[29](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[30](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ hp: mul })); },
	[31](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ atk: mul })); },
  
	[33]() { return drum(); },
  
	[35](mul, percent) { return vampire('self', v.xATK(mul), v.percent(percent)); },
	[36](attr1, attr2, percent) { return reduceDamage([attr1, attr2], v.percent(percent)); },
	[37](attr, mul) { return damageEnemy('single', attr, v.xATK(mul)); },
	[38](max, prob, percent) { return reduceDamage('all', v.percent(percent), max === 100 ? c.hp(max, max) : c.hp(0, max), v.percent(prob)); },
	[39](percent, stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[40](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ atk: mul })); },
	[41](prob, mul, attr) { return counterAttack(attr ?? 0, v.percent(prob), v.percent(mul)); },
	[42](targetAttr, dmgAttr, value) { return damageEnemy(targetAttr, dmgAttr, v.constant(value)); },
	[43](min, prob, percent) { return reduceDamage('all', v.percent(percent), c.hp(min, 100), v.percent(prob)); },
	[44](percent, stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[45](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, atk: mul })); },
	[46](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul })); },
  
	[48](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul })); },
	[49](attr, mul) { return powerUp([attr], null, p.mul({ rcv: mul })); },
	[50](turns, attr, mul) { return activeTurns(turns, powerUp([attr], null, p.mul({ atk: mul ?? 0  }))); },
	[51](turns) { return activeTurns(turns, massAttack()); },
	[52](attr, mul) { return setOrbState([attr], 'enhanced', {enhance: v.percent(mul)}); },
	[53](mul) { return rateMultiply(v.percent(mul), 'drop'); },
	[54](mul) { return rateMultiply(v.percent(mul), 'coin'); },
	[55](value) { return damageEnemy('single', 'fixed', v.constant(value)); },
	[56](value) { return damageEnemy('all', 'fixed', v.constant(value)); },
  
	[58](attr, min, max) { return damageEnemy('all', attr, v.randomATK(min, max)); },
	[59](attr, min, max) { return damageEnemy('single', attr, v.randomATK(min, max)); },
	[60](turns, mul, attr) { return activeTurns(turns, counterAttack(attr, v.percent(100), v.percent(mul))); },
	[61](attrs, min, base, bonus, stage) { return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min + (stage ?? 0), [base, 100], [bonus, 0])); },
	[62](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, atk: mul })); },
	[63](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, rcv: mul })); },
	[64](type, mul) { return powerUp(null, [type], p.mul({ atk: mul, rcv: mul })); },
	[65](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[66](combo, mul) { return powerUp(null, null, p.scaleCombos(combo, combo, [mul, 100], [0, 0])); },
	[67](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, rcv: mul })); },
  
	[69](attr, type, mul) { return powerUp([attr], [type], p.mul({ atk: mul })); },
  
	[71](...attrs) { return boardChange(attrs.filter(attr => attr >= 0)); },
	//据说是破除敌人的守护盾，但是因为重来没有实装过，所以不知道实际效果
	[72](turns) { return activeTurns(turns, voidEnemyBuff(['guard'])); },
	[73](attr, type, mul) { return powerUp([attr], [type], p.mul({ hp: mul, atk: mul })); },
  
	[75](attr, type, mul) { return powerUp([attr], [type], p.mul({ atk: mul, rcv: mul })); },
	[76](attr, type, mul) { return powerUp([attr], [type], p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[77](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ hp: mul, atk: mul })); },
  
	[79](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ atk: mul, rcv: mul })); },
  
	[84](attr, min, max, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('single', attr, v.randomATK(min, max))
		];
	},
	[85](attr, min, max, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('all', attr, v.randomATK(min, max))
		];
	},
	[86](attr, value, _, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('single', attr, v.constant(value))
		];
	},
	[87](attr, value, _, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('all', attr, v.constant(value))
		];
	},
	[88](turns, type, mul) { return activeTurns(turns, powerUp(null, [type], p.mul({ atk: mul }))); },
  
	[90](turns, attr1, attr2, mul) { return activeTurns(turns, powerUp([attr1, attr2], null, p.mul({ atk: mul }))); },
	[91](attr1, attr2, mul) { return setOrbState([attr1, attr2], 'enhanced', {enhance: v.percent(mul)}); },
	[92](turns, type1, type2, mul) { return activeTurns(turns, powerUp(null, [type1, type2], p.mul({ atk: mul }))); },
	[93]() { return leaderChange(); },
	[94](percent, attr, stats1, stats2, mul) { return powerUp([attr], null, p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[95](percent, type, stats1, stats2, mul) { return powerUp(null, [type], p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[96](percent, attr, stats1, stats2, mul) { return powerUp([attr], null, p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[97](percent, type, stats1, stats2, mul) { return powerUp(null, [type], p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[98](min, base, bonus, max) { return powerUp(null, null, p.scaleCombos(min, max, [base, 100], [bonus, 0])); },
  
	[100](stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.useSkill()); },
	[101](combo, mul) { return powerUp(null, null, p.mul({ atk: mul }), c.exact('combo', combo)); },
  
	[103](combo, stats1, stats2, mul) { return powerUp(null, null, p.scaleCombos(combo, combo, p.stats(mul, stats1, stats2), [0, 0])); },
	[104](combo, attrs, stats1, stats2, mul) { return powerUp(Bin.unflags(attrs), null, p.scaleCombos(combo, combo, p.stats(mul, stats1, stats2), [0, 0])); },
	[105](rcv, atk) { return powerUp(null, null, p.mul({ rcv, atk })); },
	[106](hp, atk) { return powerUp(null, null, p.mul({ hp, atk })); },
	[107](hp, attrs, atk) {
		return [
			powerUp(null, null, p.mul({ hp })),
			attrs && powerUp(Bin.unflags(attrs), null, p.mul({ atk: atk ?? 100 })) || null,
		].filter(Boolean);
	},
	[108](hp, type, atk) { return [powerUp(null, null, p.mul({ hp })), powerUp(null, [type], p.mul({ atk }))]; },
	[109](attrs, len, mul) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul, 100], [0, 0])); },
	[110](single, attr, min, max, scale) { return damageEnemy(single ? 'single' : 'all', attr, v.hpScale(min, max, scale)); },
	[111](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul, atk: mul })); },
  
	[114](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[115](attr, mul, percent) { return vampire(attr, v.xATK(mul), v.percent(percent)); },
	[116](...ids) { return ids.flatMap(id => this.parser(id)); },
	[117](bind, rcv, constant, hp, awokenBind) {
	  return [
		rcv ? heal(v.xRCV(rcv)) : hp ? heal(v.xMaxHP(hp)) : constant ? heal(v.constant(constant)) : null,
		(bind || awokenBind) ? unbind(bind ?? 0, awokenBind ?? 0) : null,
	  ].filter(Boolean);
	},
	[118](...ids) { return randomSkills(ids.map(id => this.parser(id))); },
	[119](attrs, min, base, bonus, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [base || 100, 100], [bonus, 0])); },
  
	[121](attrs, types, hp, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })); },
	[122](percent, attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(0, percent)); },
	[123](percent, attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(percent, 100)); },
	[124](attrs1, attrs2, attrs3, attrs4, attrs5, min, mul, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4, attrs5].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, bonus ? attrs.length : min, [mul, 100], [bonus, 0]));
	},
	[125](mon1, mon2, mon3, mon4, mon5, hp, atk, rcv) { return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('card', [mon1, mon2, mon3, mon4, mon5].filter(Boolean))); },
	[126](attrs, turns, turns2, percent) { return activeTurns(turns === turns2 ? turns : [turns, turns2], orbDropIncrease(v.percent(percent), Bin.unflags(attrs))); },
	[127](...params) { //cols1, attrs1, cols2, attrs2 ...
		const generates = [];
		for (let i = 0; i < params.length; i+=2) {
			generates.push({
				orbs: Bin.unflags(params[i+1]),
				type: 'col',
				positions: Bin.unflags(params[i])
			});
		}
		return fixedOrbs.apply(null, generates);
	},
