			{group:true,name:"Damage Enemy - Numerical damage",otLangName:{chs:"对敌直接伤害类-大炮",cht:"對敵直接傷害類-大炮"}, functions: [
				{group:true,name:"Target",otLangName:{chs:"对象",cht:"對象"}, functions: [
					{name:"Target - Single",otLangName:{chs:"对象-敌方单体",cht:"對象-敵方單體"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [2,35,37,59,84,86,110,115,144];
							function isSingle(skill)
							{
								if (skill.type == 110)
									return Boolean(skill.params[0]);
								else if (skill.type == 144)
									return Boolean(skill.params[2]);
								else
									return true;
							}
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && isSingle(skill);
						}),
						addition: numericalATK_Addition
					},
					{name:"Target - Mass",otLangName:{chs:"对象-敌方全体",cht:"對象-敵方全體"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [0,1,58,85,87,110,143,144];
							function isAll(skill)
							{
								if (skill.type == 110)
									return !Boolean(skill.params[0]);
								else if (skill.type == 144)
									return !Boolean(skill.params[2]);
								else
									return true;
							}
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && skill.id!=0 && isAll(skill);
						}),
						addition: numericalATK_Addition
					},
					{name:"Target - Designate Attr",otLangName:{chs:"对象-指定属性敌人",cht:"對象-指定屬性敵人"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [42];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						})
					},
				]},
				{group:true,name:"Attribute",otLangName:{chs:"属性",cht:"屬性"}, functions: [
					{name:"Actors self attr.",otLangName:{chs:"释放者自身属性",cht:"釋放者自身屬性"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [2,35];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						})
					},
				]},
				{group:true,name:"Damage",otLangName:{chs:"伤害",cht:"傷害"}, functions: [
					{name:"Damage - Rate by Actors self ATK",otLangName:{chs:"伤害-自身攻击倍率",cht:"傷害-自身攻擊倍率"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [0,2,35,37,58,59,84,85,115];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && skill.id!=0;
						}).sort((a,b)=>{
							const searchTypeArray = [0,2,35,37,58,59,84,85,115];
							const a_s = getCardActiveSkill(a, searchTypeArray), b_s = getCardActiveSkill(b, searchTypeArray);
							function getNumber(skill)
							{
								const sk = skill.params;
								switch(skill.type)
								{
									case 0:
									case 37:
									case 58:
									case 59:
									case 84:
									case 85:
									case 115:
										return sk[1];
									case 2:
									case 35:
										return sk[0];
									default:
										return 0;
								}
							}
							let a_pC = getNumber(a_s),b_pC = getNumber(b_s);
							return a_pC - b_pC;
						}),
						addition: numericalATK_Addition
					},
					{name:"Damage - Fixed Attr Number",otLangName:{chs:"伤害-指定属性数值",cht:"傷害-指定屬性數值"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [1,42,86,87];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const searchTypeArray = [1,42,86,87];
							const a_s = getCardActiveSkill(a, searchTypeArray), b_s = getCardActiveSkill(b, searchTypeArray);
							function getNumber(skill)
							{
								const sk = skill.params;
								switch(skill.type)
								{
									case 1:
									case 86:
									case 87:
										return sk[1];
									case 42:
										return sk[2];
									default:
										return 0;
								}
							}
							let a_pC = getNumber(a_s),b_pC = getNumber(b_s);
							return a_pC - b_pC;
						}),
						addition: numericalATK_Addition
					},
					{name:"Damage - By remaining HP",otLangName:{chs:"伤害-根据剩余血量",cht:"傷害-根據剩餘血量"},
						function:cards=>{
							const searchTypeArray = [110];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a,b,searchTypeArray,3));
						},
						addition: numericalATK_Addition
					},
					{name:"Damage - Team total HP",otLangName:{chs:"伤害-队伍总 HP",cht:"傷害-隊伍總 HP"},
						function:cards=>{
							const searchTypeArray = [143];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition: numericalATK_Addition
					},
					{name:"Damage - Team attrs ATK",otLangName:{chs:"伤害-队伍某属性总攻击",cht:"傷害-隊伍某屬性總攻擊"},
						function:cards=>{
							const searchTypeArray = [144];
							return cards.filter(card=>{
								const skill = getCardActiveSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
						},
						addition: numericalATK_Addition
					},
					{name:"Numerical ATK - Special - Vampire",otLangName:{chs:"大炮-特殊-吸血",cht:"大炮-特殊-吸血"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [35,115];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						})
					},
				]},
		
			]},
			{name:"1 CD",otLangName:{chs:"1 CD",cht:"1 CD"},
				function:cards=>cards.filter(card=>{
					if (card.activeSkillId == 0) return false;
					let skill = Skills[card.activeSkillId];
					//单向进化技能，采用最后一个子技能
					if (skill.type == 232) skill = Skills[skill.params.at(-1)];
					return getSkillMinCD(skill) <= 1;
				})
			},
			{name:"Skill Loop less than 4 card",otLangName:{chs:"4 个队员能循环开",cht:"4 個隊員能循環開"},
				function:cards=>cards.filter(card=>{
					if (card.activeSkillId == 0) return false;
					let skill = Skills[card.activeSkillId];
					//单向进化技能，采用最后一个子技能
					if (skill.type === 232) skill = Skills[skill.params.at(-1)];

					/*
					 * 202,变身，只能用一次
					 * 214,自封技能
					 * 218,坐CD，永远都无法循环
					 * 250,移除武器，作为基底时直接无法使用
					 * 268,使用次数限制
					 */
					const cantLoopSkill = getActuallySkills(skill, [202, 214, 218, 250, 268]);
					if (cantLoopSkill.length) return false;

					const minCD = getSkillMinCD(skill); //主动技最小的CD
					let realCD = minCD;
					const skillBoost = getActuallySkills(skill, [146], false); //溜
					if (skillBoost.length) {
						realCD = skillBoost.reduce((cd,subSkill)=>{
							return cd - subSkill.params[0] * 3; //第一个参数是溜几回合，3个角色就是×3
						}, realCD);
					}
					return minCD > 1 && realCD <= 4;
				})
			},
			{name:"Time pause",otLangName:{chs:"时间暂停",cht:"時間暫停"},
				function:cards=>{
					const searchTypeArray = [5, 246, 247];
					return cards.filter(card=>{
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
				},
				addition:card=>{
					const searchTypeArray = [5, 246, 247];
					const skill = getCardActiveSkill(card, searchTypeArray);
					if (!skill) return;
					const value = skill.params[0];
					return `时停${value}s`;
				}
			},
			{name:"Random effect active",otLangName:{chs:"随机效果技能",cht:"隨機效果技能"},
				function:cards=>cards.filter(card=>{
					const searchTypeArray = [118];
					const skill = getCardActiveSkill(card, searchTypeArray);
					return skill;
				})
			},
			{name:"Evolved active",otLangName:{chs:"进化类技能",cht:"進化類技能"},
				function:cards=>cards.filter(card=>{
					const searchTypeArray = [232, 233];
					const skill = getCardActiveSkill(card, searchTypeArray);
					return skill;
				}),
				addition:card=>{
					const searchTypeArray = [232, 233];
					const skill = getCardActiveSkill(card, searchTypeArray);
					if (!skill) return;
					const value = skill.params[0];
					return `${skill.type == 232 ? "单向进化" : "🔁循环变化"}`;
				}
			},
			{name:"Not Evolved active",otLangName:{chs:"非进化类技能",cht:"非進化類技能"},
				function:cards=>cards.filter(card=>{
					const searchTypeArray = [232, 233];
					const skill = getCardActiveSkill(card, searchTypeArray);
					return !skill;
				})
			},
			{group:true,name:"Skill use is conditional",otLangName:{chs:"技能使用具有限制",cht:"技能使用具有限制"}, functions: [
				{name:"Enable require HP range",otLangName:{chs:"技能使用要求血线",cht:"技能使用要求血線"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [225];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [225];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						let strArr = [];
						if (sk[0]) strArr.push(`≥${sk[0]}%`);
						if (sk[1]) strArr.push(`≤${sk[1]}%`);
						return `HP ${strArr.join(" ")}`;
					}
				},
				{name:"Enable require Dungeon Stage",otLangName:{chs:"技能使用要求地下城层数",cht:"技能使用要求地下城層數"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [234];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [234];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						let strArr = [];
						if (sk[0]) strArr.push(`≥${sk[0]}`);
						if (sk[1]) strArr.push(`≤${sk[1]}`);
						return `层 ${strArr.join(" ")}`;
					}
				},
				{name:"Delay active after skill use",otLangName:{chs:"技能使用后延迟生效",cht:"技能使用后延迟生效"},
					function:cards=>{
						const searchTypeArray = [248];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray))
					},
					addition:card=>{
						const searchTypeArray = [248];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `延迟${sk[0]}T`;
					}
				},
				{name:"Enable require number of Orbs",otLangName:{chs:"技能使用要求宝珠数量",cht:"技能使用要求寶珠数量"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [255];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [255];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createOrbsList(Bin.unflags(sk[0])), sk[2] ? `≤${sk[2]}` : `≥${sk[1]}`);
						return fragment;
					}
				},
				{name:"Has limit of times a skill can be used",otLangName:{chs:"技能使用有次数限制",cht:"技能使用有次數限制"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [268];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [268];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `限${sk[0]}次`;
					}
				},
				{name:"Enable require BUFF state",otLangName:{chs:"技能使用要求buff状态",cht:"技能使用要求buff狀態"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [275];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [275];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const [typeNum, flag] = skill.params;
						const fragment = document.createDocumentFragment();
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
						const type = typeNames[typeNum-1];
						switch (type) {
							case "orb-drop-increase": {
								fragment.append(createOrbsList(Bin.unflags(flag), "drop"));
								break;
							}
							case "enhanced-orb-drop-increase": {
								fragment.append(createSkillIcon("orb-enhanced"));
								break;
							}
							case "attr-powerup": {
								fragment.append(createOrbsList(flag, "powerup"));
								break;
							}
							case "type-powerup": {
								fragment.append(createTypesList(flag, "powerup"));
								break;
							}
						}
						return fragment;
					}
				},
			]},
		]},
		
