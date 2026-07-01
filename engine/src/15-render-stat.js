function playOwnVoiceId(){
	playVoiceById(parseInt(this.dataset.voiceId,10));
}

function renderStat(stat, option) {
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tspt = localTranslating.skill_parse.stats;
	if (tspt[stat])
		frg.ap(tspt[stat](option));
	else
	{
		console.log("未知状态类型",stat);
		frg.ap(tspt.unknown({ type: stat }));
	}
	return frg;
}

function renderAttrs(attrs, option = {}) {
	if (!Array.isArray(attrs))
		attrs = [attrs ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg;
	if (isEqual(attrs, Attributes.all))
	{
		contentFrg = tsp.attrs.all();
	}
	else
	{
		contentFrg = attrs.map(attr => {
			const icon = document.createElement("icon");
			icon.className = "attr-icon";
			icon.setAttribute("data-attr-icon",attr);
			return tsp.attrs?.[attr]({icon: icon});
		})
		.nodeJoin(tsp.word.slight_pause());
	}
	if (option.affix)
		contentFrg = tsp.word.affix_attr({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderOrbs(attrs, option = {}) {
	if (!Array.isArray(attrs))
		attrs = [attrs ?? 0];
	else
		attrs = [...attrs];

	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;

	const tsp = localTranslating.skill_parse;
	let contentFrg;
	
	if (attrs.every(a=>Number.isInteger(a))) {
		let attrBin = new Bin(attrs);
		if ((attrBin.int & 0b1111111111) == 0b1111111111) { //十种珠子
			frg.ap(tsp.orbs.all());
			attrs.length = 0; //之前是引用，这里会导致数组被清空的错误
		} else if ((attrBin.int & 0b11111) == 0b11111) { //基础5色
			frg.ap(renderOrbs('_5color'));
			attrBin = new Bin(attrBin.int & 0b1111100000);
			attrs = [...attrBin];
			if (attrs.length > 0) { //如果5色以上还有剩的，就增加一个加号
				frg.ap(' + ');
			}
		}
	}
	contentFrg = attrs.map(attr => {
		const icon = document.createElement("icon");
		icon.className = "orb";
		if (option.className) icon.className += " " + option.className;
		icon.setAttribute("data-orb-icon",attr);
		let dict = {
			icon: icon,
		}
		return tsp.orbs?.[attr](dict);
	})
	.nodeJoin(tsp.word.slight_pause());
	frg.ap(contentFrg);
		
	if (option.affix)
		contentFrg = tsp.word.affix_orb({cotent: contentFrg});
	if (option.any && attrs.length >= 2)
		contentFrg = tsp.orbs.any({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderTypes(types, option = {}) {
	if (!Array.isArray(types))
		types = [types ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg = types.map(type => {
		const icon = document.createElement("icon");
		icon.className = "type-icon";
		icon.setAttribute("data-type-icon",type);
		return tsp.types?.[type]({icon: icon});
	})
	.nodeJoin(tsp.word.slight_pause());
	if (option.affix)
		contentFrg = tsp.word.affix_type({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderAwakenings(awakenings, option = {}) {
	if (!Array.isArray(awakenings))
		awakenings = [awakenings ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg = awakenings.map(awoken => {
		const icon = document.createElement("icon");
		icon.className = "awoken-icon";
		icon.setAttribute("data-awoken-icon",awoken);
		return tsp.awokens?.[awoken]({icon: icon});
	})
	.nodeJoin(tsp.word.slight_pause());
	if (option.affix)
		contentFrg = tsp.word.affix_awakening({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

