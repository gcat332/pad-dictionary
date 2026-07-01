function renderPowerUp(powerUp) {
	const frg = document.createDocumentFragment();
	const tsp = localTranslating.skill_parse;
	function renderStats(hp, atk, rcv, option = {}) {
		const mul = option.mul ?? true;
		option.percent = !mul;
		const frg = document.createDocumentFragment();
		const operator = mul ? ' ' : '+';
		let list = [['maxhp', hp], ['atk', atk], ['rcv', rcv]];
		//去除不改变的值
		list = list.filter(([, value]) => value !== (mul ? 1 : 0));
		//&&!(name === 'hp' && value === 0));

		if (list.length === 0) return frg;

		if (list.every(([, value]) => value === list[0][1])) {
			let value = list[0][1];
			//三个值一样
			frg.ap(list.map(([name]) => renderStat(name,name=='maxhp'?{icon:createSkillIcon("maxhp-locked")}:null)).nodeJoin(tsp.word.slight_pause()));
			frg.ap(operator);
			frg.ap(renderValue(v.percent(value * 100), option));
		} else {
			//三个值不一样
			let subDocument = list.map(([name, value]) => {
				let _frg = document.createDocumentFragment();
				_frg.ap(renderStat(name));
				_frg.ap(operator);
				_frg.ap(renderValue(v.percent(value * 100), option));
				return _frg;
			});
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
		}
		return frg;
	}

	switch (powerUp.kind) {
		case SkillPowerUpKind.Multiplier: {
			let hp = powerUp.hp, atk = powerUp.atk, rcv = powerUp.rcv;
			frg.ap(renderStats(hp, atk, rcv));
			break;
		}
		case SkillPowerUpKind.ScaleAttributes: {
			let attrs = powerUp.attrs, min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			
			let dict = {
				orbs: renderOrbs(attrs, {affix: true}),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_attributes_bonus(_dict));
			}
			frg.ap(tsp.power.scale_attributes(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleCombos: {
			let min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			let dict = {
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_combos_bonus(_dict));
			}
			frg.ap(tsp.power.scale_combos(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleMatchAttrs: {
			let { matches, min, max, baseAtk, baseRcv, bonusAtk, bonusRcv } = powerUp;
			let dict = {
				matches: matches.map(orbs=>renderOrbs(orbs)).nodeJoin(tsp.word.slight_pause()),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_match_attrs_bonus(_dict));
			}
			frg.ap(tsp.power.scale_match_attrs(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleMatchLength: {
			let attrs = powerUp.attrs, min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv, matchAll = powerUp.matchAll;
			
			let dict = {
				orbs: renderOrbs(attrs, {affix: true}),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
				in_once: matchAll && attrs.length>1 && tsp.word.in_once() || null,
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_match_length_bonus(_dict));
			}
			frg.ap(tsp.power.scale_match_length(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleCross: {
			let crosses = powerUp.crosses;
			
			/*if (crosses.length >= 2 && crosses.every(cross => cross.atk === crosses[0].atk)) {
				//所有值一样
				let cross = crosses[0];
				let dict = {
					orbs: renderOrbs(crosses.map(cross => cross.attr), {affix: true, any: true}),
					stats: renderStats(1, cross.atk, cross.rcv),
				}
				frg.ap(cross.single ? tsp.power.scale_cross_single(dict) : tsp.power.scale_cross(dict));
			} else {*/
				let subDocument = crosses.map(cross=>{
					let dict = {
						orbs: renderOrbs(cross.attr, {affix: true, any: true}),
						stats: renderStats(1, cross.atk, cross.rcv),
						each_time: cross.single ? null : tsp.word.each_time(),
					}
					return tsp.power.scale_cross(dict);
				});
				frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			//}
			break;
		}
		case SkillPowerUpKind.ScaleRemainOrbs: {
			let min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			
			let dict = {
				max: max,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					min: min,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_remain_orbs_bonus(_dict));
			}
			frg.ap(tsp.power.scale_remain_orbs(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleStateKind: {
			let awakenings = powerUp.awakenings, attrs = powerUp.attrs, types = powerUp.types, value = powerUp.value;
			let dict = {
				stats: renderStats(value.hp, value.atk, value.rcv, {mul: false, percent: true}),
				awakenings: awakenings?.length && renderAwakenings(awakenings, {affix: true}) || null,
				attrs: attrs?.length && renderAttrs(attrs, {affix: true}) || null,
				types: types?.length && renderTypes(types, {affix: true}) || null,
			}
			frg.ap(tsp.power.scale_state_kind(dict));
			break;
		}
		default:
			frg.ap(tsp.power.unknown({type: powerUp.kind}));
	}
	return frg;
}

