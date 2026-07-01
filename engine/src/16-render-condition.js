function renderCondition(cond) {
	const frg = document.createDocumentFragment();
	const tsp = localTranslating.skill_parse;
	if (cond.hp) {
		let dict = {
			hp: renderStat('chp'),
			min: renderValue(v.percent(cond.hp.min * 100), {percent: true}),
			max: renderValue(v.percent(cond.hp.max * 100), {percent: true}),
		};
		if (cond.hp.min === cond.hp.max)
			frg.ap(tsp.cond.hp_equal(dict));
		else if (cond.hp.min === 0)
			frg.ap(tsp.cond.hp_less_or_equal(dict));
		else if (cond.hp.max === 1)
			frg.ap(tsp.cond.hp_greater_or_equal(dict));
		else
			frg.ap(tsp.cond.hp_belong_to_range(dict));
	} else if (cond.useSkill) {
		frg.ap(tsp.cond.use_skill(
			cond.useSkill > 1
			? {times: tsp.cond.use_skill_times({times: cond.useSkill})}
			: null
		));
	} else if (cond.multiplayer) {
		frg.ap(tsp.cond.multi_player());
	} else if (cond.remainOrbs) {
		let dict = {
			value: renderValue(v.constant(cond.remainOrbs.count), {unit: tsp.unit.orbs}),
		};
		frg.ap(tsp.cond.remain_orbs(dict));
	} else if (cond.combos) {
		const { min } = cond.combos;
		let dict = { min };
		frg.ap(tsp.power.scale_combos(dict));
	} else if (cond.attrs) {
		const { attrs, min} = cond.attrs;
		let dict = {
			min,
			orbs: renderOrbs(attrs, {affix: true})
		};
		frg.ap(tsp.power.scale_attributes(dict));
	} else if (cond.exact) {
		const { type, attrs , value} = cond.exact;
		if (type === 'combo') {
			let dict = { value };
			frg.ap(tsp.cond.exact_combo(dict));
		} else if (type === 'match-length') {
			let dict = {
				orbs: attrs === 'enhanced' ? tsp.cond.exact_match_enhanced() : renderOrbs(attrs, {affix: true})
			};
			if (value) {
				dict.length = tsp.cond.exact_length({value:renderValue(v.constant(value), {unit: tsp.unit.orbs})});
			}

			frg.ap(tsp.cond.exact_match_length(dict));
		}
	} else if (cond.compo) {
		let dict = {};
		switch (cond.compo.type)
		{
			case 'card':{
				dict.ids = cond.compo.ids.map(mid=>{
					const dom = cardN(mid);
					//dom.monDom.onclick = changeToIdInSkillDetail;
					return dom;
				}).nodeJoin();
				frg.ap(tsp.cond.compo_type_card(dict));
				break;
			}
			case 'series':{
				//搜索并显示合作
				function searchCollab(event) {
					const collabId = parseInt(this.getAttribute('data-collabId'), 10);
					showSearchBySeriesId(collabId, "collab");
					return false;
				}
				dict.ids = cond.compo.ids.map(cid=>{
					const lnk = document.createElement("a");
					lnk.className ="series-search card-collabId";
					lnk.setAttribute("data-collabId",cid);
					lnk.onclick = searchCollab;
					lnk.textContent = cid;
					return lnk;
				}).nodeJoin(tsp.word.slight_pause());
				frg.ap(tsp.cond.compo_type_series(dict));
				break;
			}
			case 'evolution':{
				dict.ids = cond.compo.ids.map(type=>{
					const lnk = document.createElement("a");
					lnk.className ="series-search";
					switch (type)
					{
						case "pixel-evo":{ //像素进化
							lnk.appendChild(tsp.word.evo_type_pixel());
							lnk.onclick = function(){
								showSearch(Cards.filter(card=>card.evoMaterials.includes(3826)));
							};
							break;
						}
						case "reincarnation-evo":{ //转生或超转生
							lnk.appendChild(tsp.word.evo_type_reincarnation());
							lnk.onclick = function(){
								showSearch(Cards.filter(card=>isReincarnated(card)));
							};
							break;
						}
						default:{ //转生或超转生
							return tsp.word.evo_type_unknow({ type });
						}
					}
					return lnk;
				}).nodeJoin(tsp.word.slight_pause());
				frg.ap(tsp.cond.compo_type_evolution(dict));
				break;
			}
			case 'team-total-rarity':{
				dict.rarity = cond.compo.ids;
				frg.ap(tsp.cond.compo_type_team_total_rarity(dict));
				break;
			}
			case 'team-same-rarity':{
				let rarity = cond.compo.ids;
				switch (rarity) {
					case -1:
						dict.rarity = tsp.word.different();
						break;
					case -2:
						dict.rarity = tsp.word.same();
						break;
					default:
						dict.rarity = rarity;
				}
				frg.ap(tsp.cond.compo_type_team_same_rarity(dict));
				break;
			}
		}
	} else if (cond.LShape) {
		let dict = {
			orbs: renderOrbs(cond.LShape.attrs, {affix: true, any: true}),
		};
		frg.ap(tsp.cond.L_shape(dict));
	} else if (cond.heal) {
		let dict = {
			orbs: renderOrbs(5, {affix: true}),
			heal: renderValue(v.constant(cond.heal.min), {unit: tsp.unit.point}),
			stats: renderStat('hp'),
		};
		frg.ap(tsp.cond.heal(dict));
	} else if (cond.stage) {
		let dict = {
			stage: renderStat('cstage'),
			min: renderValue(v.constant(cond.stage.min)),
			max: renderValue(v.constant(cond.stage.max)),
		};
		if (cond.stage.min > 0)
			frg.ap(tsp.cond.stage_greater_or_equal(dict));
		else if (cond.stage.max > 0)
			frg.ap(tsp.cond.stage_less_or_equal(dict));
	} else if (cond.remainAttrOrbs) {
		let dict = {
			orbs: renderOrbs(cond.remainAttrOrbs.attrs, {affix: true}),
			min: renderValue(v.constant(cond.remainAttrOrbs.min)),
			max: renderValue(v.constant(cond.remainAttrOrbs.max)),
		};
		if (cond.remainAttrOrbs.min > 0)
			frg.ap(tsp.cond.orbs_greater_or_equal(dict));
		else if (cond.remainAttrOrbs.max > 0)
			frg.ap(tsp.cond.orbs_less_or_equal(dict));
	} else if (cond.awakeningActivated) {
		let dict = {
			awakenings: renderAwakenings(cond.awakeningActivated.awakenings, {affix: true}),
		};
		frg.ap(tsp.cond.awakening_activated(dict));
	} else if (cond.stateIsActive) {
		const {	type, indexes } = cond.stateIsActive;
		let state;
		switch (type) {
			case "orb-drop-increase": {
				state = tsp.buffs.orb_drop_increase({
					orbs:renderOrbs(indexes, {className: "drop", affix: true})
				});
				break;
			}
			case "enhanced-orb-drop-increase": {
				state = tsp.buffs.orb_drop_increase({
					orbs:tsp.orbs.enhanced({icon:createSkillIcon("orb-enhanced")})
				});
				
				break;
			}
			case "attr-powerup": {
				state = tsp.buffs.target_powerup({
					target:renderAttrs(indexes , {affix: true})
				});
				break;
			}
			case "type-powerup": {
				state = tsp.buffs.target_powerup({
					target:renderTypes(indexes , {affix: true})
				});
				break;
			}
		}
		const dict = {
			state: state,
		};
		frg.ap(tsp.cond.state_is_active(dict));
	} else if (cond.enemyAttr) {
		const dict = {
			attrs: renderAttrs(cond.enemyAttr.attrs, {affix: true}),
		};
		frg.ap(tsp.cond.enemy_attr(dict));
	} else {
		frg.ap(tsp.cond.unknown());
	}
	return frg;
}

