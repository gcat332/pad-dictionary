	const functions = [
		{name:"No Filter",otLangName:{chs:"不做筛选",cht:"不做篩選"},function:cards=>cards},
		{group:true,name:"Active Skill",otLangName:{chs:"主动技",cht:"主動技"}, functions: [
			{name:"Seamless Buff (Round ≥CD)",otLangName:{chs:"无缝 Buff (回合≥CD)",cht:"無縫 Buff (回合≥CD)"},
				function:cards=>cards.filter(card=>{
					function isLoopBuff(parsedSkill, cd) {
						return parsedSkill.some(skill=>skill.kind == SkillKinds.ActiveTurns
							&& skill.turns >= cd);
					}
					//跳过0号技能的、会变身成别人的和无技能数据的
					if (card.activeSkillId == 0 || card.henshinTo?.length>0) return false;
					const skill = Skills[card.activeSkillId];
					if (!skill) return false;

					let cd = skill.initialCooldown - (skill.maxLevel - 1); //技能最短CD
					//解析技能，如果是一般的技能，直接搜索有没有就可以了
					let parsedActiveSkill = skillParser(card.activeSkillId);
					if (isLoopBuff(parsedActiveSkill, cd)) return true;
					//对于其他的多组类技能，则需要进一步判断，但是这类技能一般只需要看第一个就行
					let parsedGroupSkill = parsedActiveSkill?.[0];
					if (parsedGroupSkill.kind == SkillKinds.RandomSkills) { //随机类技能,CD固定,需要每个技能都符合
						return parsedGroupSkill.skills.every(parsedSubSkill=>isLoopBuff(parsedSubSkill, cd));
					}
					//进化类技能，排除循环进化，并只计算最后一级
					if (parsedGroupSkill.kind == SkillKinds.EvolvedSkills) {
						const subSkills = parsedGroupSkill.params.map(id=>Skills[id]);
						if (parsedGroupSkill.loop) { //循环的
							let subCd = subSkills.reduce((p,subSkill)=>{
								p += subSkill.initialCooldown - (subSkill.maxLevel - 1);
								return p;
							}, 0);
							return parsedGroupSkill.skills.some(skill=>isLoopBuff(skill, subCd));
						} else { //不循环的
							let subSkill = subSkills.at(-1);
							let subCd = subSkill.initialCooldown - (subSkill.maxLevel - 1); //技能最短CD
							return isLoopBuff(parsedGroupSkill.skills.at(-1), subCd);
						}
					}
					return false;
				})
			},
			{group:true,name:"Voids Absorption",otLangName:{chs:"破吸类",cht:"破吸類"}, functions: [
				{name:"Voids attribute absorption",otLangName:{chs:"破属吸 buff",cht:"破屬吸 buff"},
					function:cards=>{
						const attrName = "attr-absorb";
						return cards.filter(card=>{
							const turns = voidsAbsorption_Turns(card);
							return turns[attrName] > 0;
						}).sort((a,b)=>{
							const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
							let a_pC = a_s[attrName], b_pC = b_s[attrName];
							return a_pC - b_pC;
						});
					},
					addition:voidsAbsorption_Addition
				},
				{name:"Voids combo absorption",otLangName:{chs:"破C吸 buff",cht:"破C吸 buff"},
					function:cards=>{
						const attrName = "combo-absorb";
						return cards.filter(card=>{
							const turns = voidsAbsorption_Turns(card);
							return turns[attrName] > 0;
						}).sort((a,b)=>{
							const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
							let a_pC = a_s[attrName], b_pC = b_s[attrName];
							return a_pC - b_pC;
						});
					},
					addition:voidsAbsorption_Addition
				},
				{name:"Voids damage absorption",otLangName:{chs:"破伤吸 buff",cht:"破傷吸 buff"},
					function:cards=>{
						const attrName = "damage-absorb";
						return cards.filter(card=>{
							const turns = voidsAbsorption_Turns(card);
							return turns[attrName] > 0;
						}).sort((a,b)=>{
							const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
							let a_pC = a_s[attrName], b_pC = b_s[attrName];
							return a_pC - b_pC;
						});
					},
					addition:voidsAbsorption_Addition
				},
				{name:"Pierce through damage void",otLangName:{chs:"贯穿无效盾 buff",cht:"貫穿無效盾 buff"},
					function:cards=>{
						const attrName = "damage-void";
						return cards.filter(card=>{
							const turns = voidsAbsorption_Turns(card);
							return turns[attrName] > 0;
						}).sort((a,b)=>{
							const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
							let a_pC = a_s[attrName], b_pC = b_s[attrName];
							return a_pC - b_pC;
						});
					},
					addition:voidsAbsorption_Addition
				},
				{group:true,name:"Combination",otLangName:{chs:"常用组合",cht:"常用組合"}, functions: [
					{name:"2 Voids (attr. & damage)",otLangName:{chs:"双破(属+伤)",cht:"双破(属+伤)"},
						function:cards=>{
							return cards.filter(card=>{
								const turns = voidsAbsorption_Turns(card);
								return turns["attr-absorb"] > 0 && turns["damage-absorb"] > 0;
							}).sort((a,b)=>{
								const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
								let a_pC = a_s["attr-absorb"], b_pC = b_s["attr-absorb"];
								return a_pC - b_pC;
							});
						},
						addition:voidsAbsorption_Addition
					},
					{name:"3 Voids (attr. & damage & void)",otLangName:{chs:"三破(属+伤+无)",cht:"三破(属+伤+无)"},
						function:cards=>{
							return cards.filter(card=>{
								const turns = voidsAbsorption_Turns(card);
								return turns["attr-absorb"] > 0 && turns["damage-absorb"] > 0 && turns["damage-void"] > 0;
							}).sort((a,b)=>{
								const a_s = voidsAbsorption_Turns(a), b_s = voidsAbsorption_Turns(b);
								let a_pC = a_s["attr-absorb"], b_pC = b_s["attr-absorb"];
								return a_pC - b_pC;
							});
						},
						addition:voidsAbsorption_Addition
					},
				]},
			]},
			{group:true,name:"Recovers Bind Status",otLangName:{chs:"解封类",cht:"解封類"}, functions: [
				{
					name:"Unbind menber bind",otLangName:{chs:"解封角色",cht:"解封角色"},
					function:cards=>{
						return cards.filter(card=>{
							const turns = unbind_Turns(card);
							return turns.normal > 0;
						}).sort((a,b)=>{
							const a_s = unbind_Turns(a), b_s = unbind_Turns(b);
							let a_pC = a_s.normal, b_pC = b_s.normal;
							return a_pC - b_pC;
						});
					},
					addition:unbind_Addition
				},
				{
					name:"Unbind awakenings bind",otLangName:{chs:"解觉醒",cht:"解覺醒"},
					function:cards=>{
						return cards.filter(card=>{
							const turns = unbind_Turns(card);
							return turns.awakenings > 0;
						}).sort((a,b)=>{
							const a_s = unbind_Turns(a), b_s = unbind_Turns(b);
							let a_pC = a_s.awakenings, b_pC = b_s.awakenings;
							return a_pC - b_pC;
						});
					},
					addition:unbind_Addition
				},
				{
					name:"Unbind unmatchable",otLangName:{chs:"解禁消珠",cht:"解禁消珠"},
					function:cards=>{
						return cards.filter(card=>{
							const turns = unbind_Turns(card);
							return turns.matches > 0;
						}).sort((a,b)=>{
							const a_s = unbind_Turns(a), b_s = unbind_Turns(b);
							let a_pC = a_s.matches, b_pC = b_s.matches;
							return a_pC - b_pC;
						});
					},
					addition:unbind_Addition
				},
				{group:true,name:"Combination",otLangName:{chs:"常用组合",cht:"常用組合"}, functions: [
					{
						name:"3 Unbinds",otLangName:{chs:"三解",cht:"三解"},
						function:cards=>{
							return cards.filter(card=>{
								const turns = unbind_Turns(card);
								return turns.normal > 0 && turns.awakenings > 0 && turns.matches > 0;
							}).sort((a,b)=>{
								const a_s = unbind_Turns(a), b_s = unbind_Turns(b);
								let a_pC = a_s.normal, b_pC = b_s.normal;
								return a_pC - b_pC;
							});
						},
						addition:unbind_Addition
					},
				]},
			]},
			{group:true,name:"For player team",otLangName:{chs:"对自身队伍生效类",cht:"對自身隊伍生效類"}, functions: [
				{name:"↑Increase skills charge",otLangName:{chs:"【溜】减少CD",cht:"【溜】減少CD"},
					function:cards=>{
						const searchTypeArray = [146];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [146];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('skill-boost', 'boost-incr'), sk[0]);
						if (sk[1] !== undefined && sk[0]!=sk[1]) fragment.append(`~${sk[1]}`);
						return fragment;
					}
				},
				{name:"Change Leader",otLangName:{chs:"更换队长",cht:"更換隊長"},
					function:cards=>{
						const searchTypeArray = [93, 227];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray),
								  b_s = getCardActiveSkill(b, searchTypeArray);
							return a_s.type - b_s.type;
						});
					},
					addition:card=>{
						const searchTypeArray = [93, 227];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('leader-change'));
						skill.type === 227 && fragment.append('换👉');
						return fragment;
					}
				},
				{group:true,name:"Increase Damage Cap",otLangName:{chs:"增加伤害上限",cht:"增加傷害上限"}, functions: [
					{name:"Increase Damage Cap - Any",otLangName:{chs:"增加伤害上限 - 任意",cht:"增加傷害上限 - 任意"},
						function:cards=>{
							const searchTypeArray = [241, 246, 247, 258, 263, 266];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
					{name:"Increase Damage Cap - Self",otLangName:{chs:"增加伤害上限 - 自身",cht:"增加傷害上限 - 自身"},
						function:cards=>{
							const searchTypeArray = [241, 246, 247, 258, 266];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								switch (skill?.type) {
									case 258: {
										return Boolean(skill.params[2] & 0b1);
									}
									case 266: {
										return Boolean(skill.params[2] & 0b100);
									}
									default: {
										return skill;
									}
								}
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
					{name:"Increase Damage Cap - Leader",otLangName:{chs:"增加伤害上限 - 队长",cht:"增加傷害上限 - 隊長"},
						function:cards=>{
							const searchTypeArray = [258];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[2] & 0b110);
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
					{name:"Increase Damage Cap - Sub",otLangName:{chs:"增加伤害上限 - 队员",cht:"增加傷害上限 - 隊員"},
						function:cards=>{
							const searchTypeArray = [258];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[2] & 0b1000);
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
					{name:"Increase Damage Cap - Neighbor",otLangName:{chs:"增加伤害上限 - 相邻",cht:"增加傷害上限 - 相鄰"},
						function:cards=>{
							const searchTypeArray = [266];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[2] & 0b11);
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
					{name:"Increase Damage Cap - Attr./Types",otLangName:{chs:"增加伤害上限 - 属性/类型",cht:"增加傷害上限 - 屬性/類型"},
						function:cards=>{
							const searchTypeArray = [263];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>{
								const a_ss = getCardActiveSkill(a, searchTypeArray), b_ss = getCardActiveSkill(b, searchTypeArray);
								let a_pC = getIncreaseDamageCap(a_ss), b_pC = getIncreaseDamageCap(b_ss);
								return a_pC - b_pC;
							});
						},
						addition:memberCap_Addition
					},
				]},
				{group:true,name:"Card slot ATK rate change",otLangName:{chs:"卡片位置攻击力",cht:"卡片位置攻擊力"}, functions: [
					{name:"Card slot ATK rate change - Any",otLangName:{chs:"卡片位置攻击力 - 任意",cht:"卡片位置攻擊力 - 任意"},
						function:cards=>{
							const searchTypeArray = [230, 269];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a, b, searchTypeArray, 2));
						},
						addition:memberATK_Addition
					},
					{name:"Card slot ATK rate change - Self",otLangName:{chs:"卡片位置攻击力 - 自身",cht:"卡片位置攻擊力 - 自身"},
						function:cards=>{
							const searchTypeArray = [230, 269];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								switch (skill?.type) {
									case 230: {
										return Boolean(skill.params[1] & 0b1);
									}
									case 269: {
										return Boolean(skill.params[1] & 0b100);
									}
									default: {
										return skill;
									}
								}
							}).sort((a,b)=>sortByParams(a, b, searchTypeArray, 2));
						},
						addition:memberATK_Addition
					},
					{name:"Card slot ATK rate change - Leader",otLangName:{chs:"卡片位置攻击力 - 队长",cht:"卡片位置攻擊力 - 隊長"},
						function:cards=>{
							const searchTypeArray = [230];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[1] & 0b110);
							}).sort((a,b)=>sortByParams(a, b, searchTypeArray, 2));
						},
						addition:memberATK_Addition
					},
					{name:"Card slot ATK rate change - Sub",otLangName:{chs:"卡片位置攻击力 - 队员",cht:"卡片位置攻擊力 - 隊員"},
						function:cards=>{
							const searchTypeArray = [230];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[1] & 0b1000);
							}).sort((a,b)=>sortByParams(a, b, searchTypeArray, 2));
						},
						addition:memberATK_Addition
					},
					{name:"Card slot ATK rate change - Neighbor",otLangName:{chs:"卡片位置攻击力 - 相邻",cht:"卡片位置攻擊力 - 相鄰"},
						function:cards=>{
							const searchTypeArray = [269];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill && Boolean(skill.params[1] & 0b11);
							}).sort((a,b)=>sortByParams(a, b, searchTypeArray, 2));
						},
						addition:memberATK_Addition
					},
				]},
				{name:"Change member's Attr",otLangName:{chs:"转换队员属性",cht:"轉換隊員屬性"},
					function:cards=>{
						const searchTypeArray = [142, 274];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [142, 274];
						const skills = getCardActiveSkills(card, searchTypeArray, true);
						return skills.map(skill=>{
							const [ turns, attr, target ] = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createTeamFlags(skill.type === 142 ? 1 : target, skill.type === 142 ? 1 : 0b11));
							fragment.append("→", createOrbsList(attr), `×${turns}T`);
							return fragment;
						}).nodeJoin(document.createElement("br"));

						// if (!skill) return;
						// const sk = skill.params;
	
						// const fragment = document.createDocumentFragment();
						// fragment.appendChild(document.createTextNode(`自→`));
						// fragment.appendChild(createOrbsList(sk[1]));
						// fragment.appendChild(document.createTextNode(`×${sk[0]}T`));
			
						// return fragment;
					}
				},
				{name:"↓Reduce skills charge",otLangName:{chs:"【坐】增加CD",cht:"【坐】增加CD"},
					function:cards=>{
						const searchTypeArray = [218];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [218];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('skill-boost', 'boost-decr'), sk[0]);
						if (sk[1] !== undefined && sk[0]!=sk[1]) fragment.append(`~${sk[1]}`);
						return fragment;
					}
				},
				{name:"Bind team active skill",otLangName:{chs:"自封队伍技能 debuff",cht:"自封队伍技能 debuff"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [214];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [214];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return document.createTextNode(`自封技${sk[0]}T`);
					}
				},
				{name:"Bind card self",otLangName:{chs:"角色自身被绑定",cht:"角色自身被綁定"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [267];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [267];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return document.createTextNode(`自绑定${sk[0]}T`);
					}
				},
				{name:"Remove card self's assist",otLangName:{chs:"移除卡片武器",cht:"移除卡片武器"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [250];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [250];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return renderAwakenings(sk);
					}
				},
			]},
