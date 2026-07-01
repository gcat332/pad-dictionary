function renderValue(_value, option = {}) {
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tsp = localTranslating.skill_parse
	const tspv = tsp.value;
	const od = option.decimalDigits, os = option.plusSign;
	let dict;
	switch (_value.kind) {
		case SkillValueKind.Percent: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_percent(dict) :
				tspv.mul_times(dict)
			);
			break;
		}
		case SkillValueKind.Constant: {
			dict = {
				value: _value.value.keepCounts(od,os),
				unit: option.unit ? option.unit() : void 0,
			};
			frg.ap(tspv.const(dict));
			break;
		}
		case SkillValueKind.ConstantTo: {
			dict = {
				value: _value.value.keepCounts(od,os)
			};
			frg.ap(tspv.const_to(dict));
			break;
		}
		case SkillValueKind.xMaxHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('maxhp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('hp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xCHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('chp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xShield: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('shield'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xATK: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('atk'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xRCV: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('rcv'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamHP: {
			let value = _value.value;
			dict = {
				value: option.percent ? (value * 100).keepCounts(od,os) : value.keepCounts(od,os),
				stats: renderStat('teamhp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamRCV: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('teamrcv'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamATK: {
			let attrs = _value.attrs, value = _value.value;
			dict = {
				value: option.percent ? (value * 100).keepCounts(od,os) : value.keepCounts(od,os),
				stats: renderStat('teamatk', {attrs: renderAttrs(attrs, {affix: true})}),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.HPScale: {
			let min = _value.min, max = _value.max;
			dict = {
				min: tspv.mul_of_times({value: min.keepCounts(od,os), stats:renderStat('atk')}),
				max: tspv.mul_of_times({value: max.keepCounts(od,os), stats:renderStat('atk')}),
				hp: renderStat('hp'),
			};
			
			frg.ap(tspv.hp_scale(dict));
			break;
		}
		case SkillValueKind.RandomATK: {
			let min = _value.min, max = _value.max;
			dict = {
				min: min.keepCounts(od,os),
				atk: renderStat('atk'),
			};
			if (max != min)
			{
				dict.max = tsp.word.range_hyphen().ap(max.keepCounts(od,os));
			}
			
			frg.ap(tspv.random_atk(dict));
			break;
		}
		case SkillValueKind.xAwakenings: {
			let value = _value.value, awakenings = _value.awakenings;
			let dict = {
				value: renderValue(value,{percent : true}),
				awakenings: renderAwakenings(awakenings, {affix: true}),
			}
			frg.ap(tsp.value.x_awakenings(dict));
			break;
		}
		default: {
			console.log("未知数值类型",_value.kind, _value);
			frg.ap(tspv.unknown({ type: _value.kind }));
		}
	}
	return frg;
  }

