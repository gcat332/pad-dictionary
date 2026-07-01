const v = {
	percent: function(value) {
		return { kind: SkillValueKind.Percent, value: (value / 100) ?? 1 };
	},
	constant: function(value) {
		return { kind: SkillValueKind.Constant, value: value ?? 0 };
	},
	constantTo: function(value) {
		return { kind: SkillValueKind.ConstantTo, value: value ?? 1 };
	},
	xMaxHP: function(value) {
		return { kind: SkillValueKind.xMaxHP, value: (value / 100) ?? 1 };
	},
	xHP: function(value) {
		return { kind: SkillValueKind.xHP, value: (value / 100) ?? 1 };
	},
	xCHP: function(value) {
		return { kind: SkillValueKind.xCHP, value: (value / 100) ?? 1 };
	},
	xShield: function(value) {
		return { kind: SkillValueKind.xShield, value: (value / 100) ?? 1 };
	},
	xATK: function(value) {
		return { kind: SkillValueKind.xATK, value: (value / 100) ?? 1 };
	},
	xRCV: function(value) {
		return { kind: SkillValueKind.xRCV, value: (value / 100) ?? 1 };
	},
	randomATK: function(min, max) {
		return { kind: SkillValueKind.RandomATK, min: (min / 100) ?? 1, max: (max / 100) ?? 1, scale: 1 };
	},
	hpScale: function(min, max, scale) {
		return { kind: SkillValueKind.HPScale, min: (min / 100) ?? 1, max: (max / 100) ?? 1, scale: (scale / 100) ?? 1 };
	},
	xTeamHP: function(value) {
		return { kind: SkillValueKind.xTeamHP, value: (value / 100) ?? 1 };
	},
	xTeamATK: function(attrs, value) {
		return { kind: SkillValueKind.xTeamATK, attrs: attrs, value: (value / 100) ?? 1 };
	},
	xTeamRCV: function(value) {
		return { kind: SkillValueKind.xTeamRCV, value: (value / 100) ?? 1 };
	},
	percentAwakenings: function(awakenings, value) {
		return { kind: SkillValueKind.xAwakenings, awakenings: awakenings, value: value };
	},
};

const c = {
	hp: function (min, max) {
		return { hp: { min: min / 100, max: max / 100 } };
	},
	exact: function (type, value, attrs, multiple = false) {
		if (attrs === void 0) { attrs = Attributes.all; }
		return { exact: { type: type, value: value, attrs: attrs, multiple: multiple} };
	},
	combos: function (min) {
		return { combos: { min } };
	},
	attrs: function (attrs, min) {
		return { attrs: { attrs, min} };
	},
	compo: function (type, ids) {
		return { compo: { type: type, ids: ids } };
	},
	remainOrbs: function (count) { return { remainOrbs: { count: count } }; },
	useSkill: function (times = 1) { return { useSkill: times }; },
	multiplayer: function () { return { multiplayer: true }; },
	prob: function (percent) { return { prob: percent }; },
	LShape: function (attrs) { return { LShape: { attrs } }; },
	heal: function (min) { return { heal: { min } }; },
	stage: function (min=0, max=0) {
		return { stage: { min, max } };
	},
	remainAttrOrbs: function (attrs, min, max) {
		return { remainAttrOrbs: { attrs, min, max} };
	},
	awakeningActivated: function (awakenings) { return { awakeningActivated: { awakenings } }; },
	stateIsActive: function (type, indexes) {
		return { stateIsActive: { type, indexes } };
	},
	enemyAttr: function (attrs) { return { enemyAttr: { attrs } }; },
}

const p = {
	mul: function (values) {
		if (Array.isArray(values)) {
			return {
				kind: SkillPowerUpKind.Multiplier,
				hp: 1,
				atk: values[0] / 100,
				rcv: values[1] / 100
			};
		}
		else {
			return {
				kind: SkillPowerUpKind.Multiplier,
				hp: (values.hp ?? 100) / 100,
				atk: (values.atk ?? 100) / 100,
				rcv: (values.rcv ?? 100) / 100
			};
		}
	},
	stats: function (value) {
		let statTypes = Array.from(arguments).slice(1);
		return [
			statTypes.indexOf(1) >= 0 ? value : 100,
			statTypes.indexOf(2) >= 0 ? value : 100
		];
	},
	scale: function (min, max, baseMul, bonusMul) {
		return {
			min: min,
			max: max ?? min,
			baseAtk: (baseMul[0] / 100) ?? 1,
			baseRcv: (baseMul[1] / 100) ?? 1,
			bonusAtk: (bonusMul[0] / 100) ?? 0,
			bonusRcv: (bonusMul[1] / 100) ?? 0
		};
	},
	scaleAttrs: function (attrs, min, max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleAttributes, attrs: attrs ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleCombos: function (min, max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleCombos ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleMatchLength: function (attrs, min, max, baseMul, bonusMul, matchAll = false) {
		return { kind: SkillPowerUpKind.ScaleMatchLength, attrs, matchAll,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleMatchAttrs: function (matches, min, max, baseMul, bonusMul) {
		const flatMatches = matches.flat(); //当匹配的全是不同颜色时，切换成匹配颜色的技能
		if (new Set(flatMatches).size === flatMatches.length)
			return this.scaleAttrs(matches, min, max, baseMul, bonusMul);
		else
			return { kind: SkillPowerUpKind.ScaleMatchAttrs, matches: matches ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleCross: function (crosses) {
		return { kind: SkillPowerUpKind.ScaleCross, crosses: crosses.map(cross => ({ ...cross, atk: ((cross.atk ?? 100) / 100), rcv: ((cross.rcv ?? 100) / 100)})) };
	},
	scaleRemainOrbs: function (max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleRemainOrbs ,...this.scale(bonusMul ? 0 : max, max, baseMul, bonusMul) };
	},
	scaleStateKind: function (awakenings, attrs, types, value) {
		return { kind: SkillPowerUpKind.ScaleStateKind, awakenings: awakenings, attrs: attrs, types: types, value: value };
	},
	scaleMatchLengthTimes: function (attrs, min, exact, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleMatchLengthTimes, attrs, min, exact, bonusMul };
	},
}

