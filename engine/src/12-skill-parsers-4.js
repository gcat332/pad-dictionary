	[245](rarity, _2, _3, hp, atk, rcv) { //全员满足某种情况，现在是全部星级不一样
 		return powerUp(Bin.unflags(_2), Bin.unflags(_3), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('team-same-rarity', rarity)); 
	},
	[246](time, combo, cap) { //限定时间内转出多少C提高伤害上限
 		return CTW(v.constant(time), c.combos(combo) , increaseDamageCapacity(cap * 1e8, ["self"]));
	},
	[247](time, attr, min, cap) { //限定时间内转出多少色提高伤害上限
 		return CTW(v.constant(time), c.attrs(Bin.unflags(attr), min) , increaseDamageCapacity(cap * 1e8, ["self"]));
	},
	[248](turns, ...ids) { //几回合后才生效的技能
		return delayActiveTurns(turns,
			...ids.flatMap(id => this.parser(id))
		);
	},
	[249](turns, attr, row1, row2, row3, row4, row5, count) {
		const options = {
			attrs: Bin.unflags(attr),
		};
		if (count) {
			options.count = count;
		} else {
			options.positions = [row1, row2, row3, row4, row5].map(Bin.unflags);
		}
		return activeTurns(turns, 
			boardJammingStates('roulette', count ? 'random' : 'shape', options)
		);
	},
	[250](...awakenings) { //去除自身辅助，如果有参数则是赋予觉醒
		const skillEffects = [removeAssist()];
		if (awakenings.length) {
			skillEffects.unshift(impartAwakenings(null, null, SkillTarget.type1[0], awakenings));
		}
		return skillEffects;
	},
	[251](turns, min, max) { //产超暗暗珠
		return activeTurns(turns,
			boardJammingStates('deep-dark', 'random', { min, max })
		);
	},
	[253](turns) { //预测掉落主动技
		return activeTurns(turns, predictionFalling());
	},
	[254](turns) { //预测掉落队长技
		return predictionFalling();
	},
	//剩余多少个属性珠才能使用技能
	[255](attr, min, max) { return skillProviso(c.remainAttrOrbs(Bin.unflags(attr), min ?? 0, max ?? 0)); },
	
	[257]() {
		return [
		  setOrbState(Attributes.orbs, 'unlocked'),
		  boardChange([0,1,2,3,4,5]),
		  autoPath(5),
		];
	},
	//按位置改变伤害上限主动技1
	[258](turns, cap, target) { //改变伤害上限主动技
		const targetTypes = SkillTarget.type1;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, typeArr)
		);
	},
	[259](percent) { return breakingShield(v.xShield(percent)); }, //破白盾
	[260](skillStage, voiceId) { return skillPlayVoice(skillStage, voiceId); },
	[261](percent) { return gravity(v.xCHP(percent), 'single'); },
	[262](count) { return setOrbState(Attributes.orbs, 'nail', {count: v.constant(count)}); },
	[263](turns, cap, attr, type) { //按属性改变伤害上限主动技
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, void 0, Bin.unflags(attr), Bin.unflags(type))
		);
	},
	[264](mul) { return rateMultiply(v.percent(mul), 'plus_point'); },
	[265](mul) { return rateMultiply(v.percent(mul), 'part_break'); },
	//按位置改变伤害上限主动技2
	[266](turns, cap, target) {
		const targetTypes = SkillTarget.type2;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, typeArr)
		);
	},
	//卡片自绑定
	[267](turns) {return activeTurns(turns, bindCard()); },
	//限制技能使用次数
	[268](turns) { return timesLimit(turns); },
	//按位置增伤主动技2
	[269](turns, target, mul) {
		const targetTypes = SkillTarget.type2;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			slotPowerUp(p.mul({ atk: mul }), typeArr)
		);
	},
	//一回合内使用几次技能才有倍率的队长技。
	[270](times, atk, rcv) { { return powerUp(Bin.unflags(31), null, p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.useSkill(times)); } },
	//同时发动觉醒时强化
	[271](awakeningsFlag, atk, reducePercent, combo, damage, rcv) {
		const awakeningsArr = Bin.unflags(awakeningsFlag).map(n => SkillTarget.enhancedAwakeningsId[n] || 0);
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		return powerUp(null, null, p.mul({ atk: atk || 100, rcv: rcv || 100}), c.awakeningActivated(awakeningsArr), v.percent(reducePercent), additional);
	},
	//破白盾-2
	[272](times) { return breakingShield(v.xShield(times * 100)); },
	//固定起手位置
	[273](turns) {return activeTurns(turns, fixedStartingPosition()); },
	//改变其他位置的队友颜色
	[274](turns, attr, target) {
		const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			changeAttr(attr, typeArr)
		);
	},
	//宝珠掉落率提高时才能使用技能
	[275](typeNum, flag) {
		const typeNames = [
			"orb-drop-increase", //掉落率提高，1
			"enhanced-orb-drop-increase", //掉落强化珠，2
			null,
			null,
			null,
			null,
			"attr-powerup", //属性强化，7
			"type-powerup" //类型强化，8
		]
		// const type = Bin.unflags(typeNum).map(n => typeNames[n] || 0)[0]; //之前以为是位运算，后来发现又不是
		const type = typeNames[typeNum-1];
		let indexes = null;
		switch (type) {
			case "orb-drop-increase": {
				indexes = Bin.unflags(flag);
				break;
			}
			case "enhanced-orb-drop-increase": {
				indexes = null;
				break;
			}
			case "attr-powerup":
			case "type-powerup": {
				indexes = flag;
				break;
			}
		}
		return skillProviso(c.stateIsActive(type, indexes));
	},
	//部位的重力
	[276](percent) { return gravity(v.xCHP(percent), void 0, true); },
	//破坏宝珠
	[277](attr) { 
		const attrs = Bin.unflags(attr);
		return destroyOrb(attrs);
	},
	//超重力无效化
	[278](turns) {return activeTurns(turns, voidFieldBuff(["super-gravity"])); },
	//宝珠掉落率提高时才能使用技能
	[279](attr) {
		const attrs = Bin.unflags(attr);
		return skillProviso(c.enemyAttr(attrs));
	},
	//每次发动觉醒时强化
	[280](awakening, atk, reducePercent, combo, damage, rcv) {
		const awakeningsArr = [awakening];
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		const eachTime = true;
		return powerUp(null, null, p.mul({ atk: atk || 100, rcv: rcv || 100}), c.awakeningActivated(awakeningsArr), v.percent(reducePercent), additional, eachTime);
	},
	//解析
	[282](percent) { return analyze(v.percent(percent)); },

	[1000](type, pos, ...ids) {
		const posType = (type=>{
			switch (type) {
				case 1: return "after-me";
				case 2: return "designated-position";
				case 3: return "before-me";
				default: return type;
			}
		})(type);
		return obstructOpponent(posType, Bin.unflags(pos), ids);
	},
};

