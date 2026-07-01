		{group:true,name:"Leader Skills",otLangName:{chs:"队长技",cht:"隊長技"}, functions: [
		
			{group:true,name:"Matching Style",otLangName:{chs:"匹配模式",cht:"匹配模式"}, functions: [
				{name:"Multiple Att.",otLangName:{chs:"杂色",cht:"雜色"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.matchMode.multipleAttr)
				},
				{name:"Orb Matching",otLangName:{chs:"长串消除",cht:"長串消除"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.matchMode.rowMatch)
				},
				{name:"Combo Matching",otLangName:{chs:"连击",cht:"連擊"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.matchMode.combo)
				},
				{name:"Same Attribute Combo Matching",otLangName:{chs:"同色多串",cht:"同色多串"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.matchMode.sameColor)
				},
				{name:"L Shape Matching",otLangName:{chs:"L消除",cht:"L消除"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.matchMode.LShape)
				},
				{name:"5 Orbs including enhanced Matching",otLangName:{chs:"5珠含强化消除",cht:"5珠含強化消除"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [150];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Cross(十) of Heal Orbs",otLangName:{chs:"十字心",cht:"十字心"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [151,209];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Stacked Magnifications of Cross(十)",otLangName:{chs:"十字叠加倍率",cht:"十字疊加倍率"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [157];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Less remain on the board",otLangName:{chs:"剩珠倍率",cht:"剩珠倍率"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [177];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill?.params[5];
					})
				},
				{name:"Stacking multiplier of Matching",otLangName:{chs:"指定长度消除叠加倍率",cht:"指定長度消除疊加倍率"},
					function:cards=>{
						const searchTypeArray = [235];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return false;
							const sk = skill.params;
							if (!sk[3] || sk[3] === 100) return false;
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,2));
					},
					addition:card=>{
						const searchTypeArray = [235];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						if (!sk[3] || sk[3] === 100) return;
						const fragment = document.createDocumentFragment();
						const sup = document.createElement("sup");
						sup.textContent = "N";
						const orbs = createOrbsList(Bin.unflags(sk[0]));
						fragment.append(`ATK×${sk[3]/100}`,sup,"/",orbs);
						if (sk[1]) {
							fragment.append(`×≥${sk[1]}`);
						} else {
							fragment.append(`×${sk[2]}`);
						}
						return fragment;
					}
				},
				{name:"Awakening active",otLangName:{chs:"激活觉醒",cht:""},
					function:cards=>{
						const searchTypeArray = [271];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						});
					},
					addition:card=>{
						const searchTypeArray = [271];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const parsedSkills = skillParser(skill.id);
						const parsedSkill = parsedSkills.find(subSkil=>
							subSkil
							?.condition
							?.awakeningActivated
							?.awakenings?.length);
						const fragment = document.createDocumentFragment();
						fragment.append(creatAwokenList(parsedSkill.condition.awakeningActivated.awakenings));
						const skArr = [];
						if (sk[1] && sk[1]!==100) {
							skArr.push(`ATK×${sk[1]/100}`);
						}
						if (sk[5] && sk[5]!==100) {
							skArr.push(`RCV×${sk[5]/100}`);
						}
						if (sk[2] > 0) {
							skArr.push(`伤-${sk[2]}%`);
						}
						if (skArr.length) {
							fragment.append(`${ skArr.join(", ") }`);
						}
						return fragment;
					}
				},
				{name:"Stacking multiplier of Awakening active",otLangName:{chs:"激活觉醒叠加倍率",cht:"激活覺醒疊加倍率"},
					function:cards=>{
						const searchTypeArray = [280];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						});
					},
					addition:card=>{
						const searchTypeArray = [280];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const parsedSkills = skillParser(skill.id);
						const parsedSkill = parsedSkills.find(subSkil=>
							subSkil
							?.condition
							?.awakeningActivated
							?.awakenings?.length);
						const fragment = document.createDocumentFragment();
						fragment.append("每次",creatAwokenList(parsedSkill.condition.awakeningActivated.awakenings));
						const skArr = [];
						if (sk[1] && sk[1]!==100) {
							skArr.push(`ATK×${sk[1]/100}`);
						}
						if (sk[5] && sk[5]!==100) {
							skArr.push(`RCV×${sk[5]/100}`);
						}
						if (sk[2] > 0) {
							skArr.push(`伤-${sk[2]}%`);
						}
						if (skArr.length) {
							fragment.append(`${ skArr.join(", ") }`);
						}
						return fragment;
					}
				},
			]},
			{group:true,name:"Restriction/Bind",otLangName:{chs:"限制",cht:"限制"}, functions: [
				{name:"Attribute Enchantment",otLangName:{chs:"属性增强",cht:"屬性增强"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.restriction.attrEnhance)
				},
				{name:"Type Enchantment",otLangName:{chs:"类型增强",cht:"類型增强"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.restriction.typeEnhance)
				},
				{name:"[7×6 board]",otLangName:{chs:"【7×6 板面】",cht:"【7×6 板面】"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [162,186];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"[No skyfall]",otLangName:{chs:"【无天降板面】",cht:"【無天降板面】"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [163,177];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"HP Percentage Activation",otLangName:{chs:"HP 比例激活",cht:"HP 比例激活"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.restriction.HpRange)
				},
				{name:"Skill Use Activation",otLangName:{chs:"使用技能激活",cht:"使用技能激活"},
					function:cards=>cards.filter(card=>card.leaderSkillTypes.restriction.useSkill)
				},
				{name:"Unable to less match",otLangName:{chs:"要求长串消除",cht:"要求長串消除"},
					function:cards=>{
						const searchTypeArray = [158];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [158];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						const value = skill.params[0];
						return `≥${value}珠`;
					}
				},
				{name:"Designate member ID",otLangName:{chs:"指定队伍队员编号",cht:"指定隊伍隊員編號"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [125];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [125];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						
						return `队员:${sk.slice(0,5).filter(Boolean).join('\n')}`;
					}
				},
				{name:"Designate collab ID",otLangName:{chs:"指定队伍队员合作编号",cht:"指定隊伍隊員合作編號"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [175];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [175];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `合作:${sk[0]}`;
					}
				},
				{name:"Designate Evo type",otLangName:{chs:"指定队伍队员进化类型",cht:"指定隊伍隊員進化類型"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [203];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Floating rate based on the number of attrs/types",otLangName:{chs:"根据属性/类型个数浮动倍率",cht:"根據屬性/類型個數浮動倍率"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [229];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [229];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const attrs = Bin.unflags(sk[0]), types = Bin.unflags(sk[1]);
						const fragment = document.createDocumentFragment();
						if (attrs.length)
							fragment.appendChild(createOrbsList(attrs));
						if (types.length)
							fragment.appendChild(createTypesList(types));
						return fragment;
					}
				},
				{name:"Limit the total rarity of the team",otLangName:{chs:"限制队伍总稀有度",cht:"限制隊伍總稀有度"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [217];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [217];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `★≤${sk[0]}`;
					}
				},
				{name:"Team's rarity required different",otLangName:{chs:"要求队员稀有度相同/各不相同",cht:"要求隊員稀有度相同/各不相同"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [245];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [245];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						switch (sk[0]) {
							case -1:
								return `★各不相同`;
							case -2:
								return `★全部相同`;
							default:
								return `★全为${sk[0]}`;
						}
					}
				},
			]},
			{group:true,name:"Extra Effects",otLangName:{chs:"附加效果",cht:"附加效果"}, functions: [
				{name:"Fixed damage inflicts",otLangName:{chs:"队长技固伤追击",cht:"隊長技固傷追擊"},
					function:cards=>{
						return cards.filter(card=>{
							return getSkillFixedDamage(card) > 0;
						}).sort((a,b)=>{
							let a_pC = getSkillFixedDamage(a),b_pC = getSkillFixedDamage(b);
							return a_pC - b_pC;
						});
					},
					addition:card=>{
						const value = getSkillFixedDamage(card);
						if (value <= 0 ) return;
						const fragment = document.createDocumentFragment();
						
						const icon = document.createElement("icon");
						icon.className = "attr-icon";
						icon.setAttribute("data-attr-icon", "fixed");

						fragment.append(icon, value.bigNumberToString());
						let skill = getCardLeaderSkill(card, [235]);
						if (skill) {
							fragment.append("/",
								createOrbsList(Bin.unflags(skill.params[0])),
								`×${skill.params[2]}`);
						}
						return fragment;
					}
				},
				{name:"Adds combo",otLangName:{chs:"队长技+C",cht:"隊長技+C"},
					function:cards=>{
						return cards.filter(card=>{
							return getSkillAddCombo(card) > 0;
						}).sort((a,b)=>{
							let a_pC = getSkillAddCombo(a),b_pC = getSkillAddCombo(b);
							return a_pC - b_pC;
						});
					},
					addition:card=>{
						const value = getSkillAddCombo(card);
						if (value <= 0 ) return;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('add-combo'), value.bigNumberToString());
						let skill;
						if (skill = getCardLeaderSkill(card, [210])) {
							fragment.append("/十字");
						} else if (skill = getCardLeaderSkill(card, [235])) {
							if (skill?.params?.[5]) {
								fragment.append("/",
									createOrbsList(Bin.unflags(skill.params[0])),
									`×${skill.params[2]}`);
							}
						}
						return fragment;
					}
				},
				{name:"Move time changes",otLangName:{chs:"队长技加/减秒",cht:"隊長技加/減秒"},
					function:cards=>{
						const searchTypeArray = [15,185];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [15,185];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const value = skill.params[0];
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon("status-time", value < 0 ? "time-decr" : "time-incr"),
							value > 0 ? "+" : "-",
							Math.abs(value/100),
							"s");
						return fragment;
					}
				},
				{name:"Fixed move time",otLangName:{chs:"固定操作时间",cht:"固定操作時間"},
					function:cards=>{
						const searchTypeArray = [178];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [178];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const value = skill.params[0];
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon("fixed-time"),
							Math.abs(value),
							"s");
						return fragment;
					}
				},
				{name:"Impart Awakenings",otLangName:{chs:"赋予觉醒",cht:"賦予覺醒"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [213];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [213];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						let attrs = Bin.unflags(sk[0]), types = Bin.unflags(sk[1]), awakenings = sk.slice(2);
						const fragment = document.createDocumentFragment();
						if (attrs.length)
							fragment.appendChild(createOrbsList(attrs));
						if (types.length)
							fragment.appendChild(createTypesList(types));
						fragment.appendChild(document.createTextNode(`:+`));
						if (awakenings.length)
							fragment.appendChild(creatAwokenList(awakenings));
						return fragment;
					}
				},
				{name:"Bonus attack when matching Orbs",otLangName:{chs:"消除宝珠时计算防御的追打",cht:"消除寶珠時計算防禦的追打"},
					function:cards=>{
						const searchTypeArray = [12];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [12];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const value = skill.params[0];
						return `攻击×${(value/100).bigNumberToString()}倍`;
					}
				},
				{name:"Recovers HP when matching Orbs",otLangName:{chs:"消除宝珠时回血",cht:"消除寶珠時回血"},
					function:cards=>{
						const searchTypeArray = [13];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [13];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const value = skill.params[0];
						return `回复×${(value/100).bigNumberToString()}倍`;
					}
				},
				{name:"Reduce damage when rcv",otLangName:{chs:"回血加盾",cht:"回血加盾"},
					function:cards=>{
					const searchTypeArray = [198];
					return cards.filter(card=>{
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill && skill.params[2];
					}).sort((a,b)=>sortByParams(a,b,searchTypeArray,2));
					},
					addition:card=>{
						const searchTypeArray = [198];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `回复${sk[0].bigNumberToString()}，减伤${sk[2]}%`;
					}
				},
				{name:"Recover Awkn Skill bind when rcv",otLangName:{chs:"回血解觉",cht:"回血解覺"},
					function:cards=>{
					const searchTypeArray = [198];
					return cards.filter(card=>{
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill && skill.params[3];
					}).sort((a,b)=>sortByParams(a,b,searchTypeArray,3));
					},
					addition:card=>{
						const searchTypeArray = [198];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `回复${sk[0].bigNumberToString()}，解觉${sk[3]}T`;
					}
				},
				{name:"Counterattack",otLangName:{chs:"队长技受伤反击",cht:"隊長技受傷反擊"},
					function:cards=>{
						const searchTypeArray = [41];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:card=>{
						const searchTypeArray = [41];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createOrbsList(sk[2] || 0));
						fragment.appendChild(document.createTextNode(`×${(sk[1]/100).bigNumberToString()}倍`));
						if (sk[0] < 100) fragment.appendChild(document.createTextNode(`(${sk[0]}%)`));
						return fragment;
					}
				},
				{name:"Voids Poison dmg",otLangName:{chs:"毒无效",cht:"毒無效"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [197];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Resolve",otLangName:{chs:"根性",cht:"根性"},
					function:cards=>{
						const searchTypeArray = [14];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [14];
						const skill = getCardLeaderSkill(card, searchTypeArray);
						if (!skill) return;
						const value = skill.params[0];
						return `HP≥${value}%`;
					}
				},
				{name:"Prediction of falling (LS)",otLangName:{chs:"预测掉落 队长技",cht:"預測掉落 队长技"},
					function:cards=>{
						const searchTypeArray = [254];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					}
				},
				{group:true,name:"Increased drop rewards",otLangName:{chs:"增加掉落奖励",cht:"增加掉落獎勵"}, functions: [
					{name:"Increase Item Drop rate",otLangName:{chs:"增加道具掉落率",cht:"增加道具掉落率"},
						function:cards=>{
							const searchTypeArray = [53];
							return cards.filter(card=>{
								const skill = getCardLeaderSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition:card=>{
							const searchTypeArray = [53];
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return;
							const sk = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createSkillIcon('rate-mul-drop'));
							fragment.append(`x${sk[0]/100}`);
							return fragment;
						}
					},
					{name:"Increase Coin rate",otLangName:{chs:"增加金币掉落倍数",cht:"增加金幣掉落倍數"},
						function:cards=>{
						const searchTypeArray = [54];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition:card=>{
							const searchTypeArray = [54];
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return;
							const sk = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createSkillIcon('rate-mul-coin'));
							fragment.append(`x${sk[0]/100}`);
							return fragment;
						}
					},
					{name:"Increase Exp rate",otLangName:{chs:"增加经验获取倍数",cht:"增加經驗獲取倍數"},
						function:cards=>{
							const searchTypeArray = [148];
							return cards.filter(card=>{
								const skill = getCardLeaderSkill(card, searchTypeArray);
								return skill;
							}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition:card=>{
							const searchTypeArray = [148];
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return;
							const sk = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createSkillIcon('rate-mul-exp'));
							fragment.append(`x${sk[0]/100}`);
							return fragment;
						}
					},
					{name:"Increase Plus Point rate",otLangName:{chs:"增加加蛋值掉落倍数",cht:"增加加蛋值掉落倍數"},
						function:cards=>{
						const searchTypeArray = [264];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition:card=>{
							const searchTypeArray = [264];
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return;
							const sk = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createSkillIcon('rate-mul-plus_point'));
							fragment.append(`x${sk[0]/100}`);
							return fragment;
						}
					},
					{name:"Increase Part Break drop rate",otLangName:{chs:"增加部位破坏素材掉率",cht:"增加部位破壞素材掉率"},
						function:cards=>{
						const searchTypeArray = [265];
						return cards.filter(card=>{
							const skill = getCardLeaderSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
						},
						addition:card=>{
							const searchTypeArray = [265];
							const skill = getCardLeaderSkill(card, searchTypeArray);
							if (!skill) return;
							const sk = skill.params;
							const fragment = document.createDocumentFragment();
							fragment.appendChild(createSkillIcon('rate-mul-part_break'));
							fragment.append(`x${sk[0]/100}`);
							return fragment;
						}
					},
				]},
			]},
			{group:true,name:"HP Scale",otLangName:{chs:"血倍率",cht:"血倍率"}, functions: [
				{name:"HP Scale [3, ∞)",otLangName:{chs:"队长血倍率[2, ∞)",cht:"隊長血倍率[2, ∞)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale >= 3;
					}).sort(sortByHPScal),
					addition: HPScal_Addition
				},
				{name:"HP Scale [2, 3)",otLangName:{chs:"队长血倍率[2, ∞)",cht:"隊長血倍率[2, ∞)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale >= 2 && HPscale < 3;
					}).sort(sortByHPScal),
					addition: HPScal_Addition
				},
				{name:"HP Scale [1.5, 2)",otLangName:{chs:"队长血倍率[1.5, 2)",cht:"隊長血倍率[1.5, 2)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale >= 1.5 && HPscale < 2;
					}).sort(sortByHPScal),
					addition: HPScal_Addition
				},
				{name:"HP Scale (1, 1.5)",otLangName:{chs:"队长血倍率(1, 1.5)",cht:"隊長血倍率(1, 1.5)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale > 1 && HPscale < 1.5;
					}).sort(sortByHPScal),
					addition: HPScal_Addition
				},
				{name:"HP Scale == 1",otLangName:{chs:"队长血倍率 == 1",cht:"隊長血倍率 == 1"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale === 1;
					}),
					addition: HPScal_Addition
				},
				{name:"HP Scale [0, 1)",otLangName:{chs:"队长血倍率[0, 1)",cht:"隊長血倍率[0, 1)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const HPscale = getHPScale(skill);
						return HPscale < 1;
					}).sort(sortByHPScal),
					addition: HPScal_Addition
				},
			]},
			{group:true,name:"Reduce Shield",otLangName:{chs:"减伤盾",cht:"減傷盾"}, functions: [
				{name:"Reduce Damage [75%, 100%]",otLangName:{chs:"队长盾减伤[75%, 100%]",cht:"隊長盾減傷[75%, 100%]"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale >= 0.75;
					}).sort(sortByReduceScale),
					addition: ReduceScale_Addition
				},
				{name:"Reduce Damage [50%, 75%)",otLangName:{chs:"队长盾减伤[50%, 75%)",cht:"隊長盾減傷[50%, 75%)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale >= 0.5 && reduceScale < 0.75;
					}).sort(sortByReduceScale),
					addition: ReduceScale_Addition
				},
				{name:"Reduce Damage [25%, 50%)",otLangName:{chs:"队长盾减伤[25%, 50%)",cht:"隊長盾減傷[25%, 50%)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale >= 0.25 && reduceScale < 0.5;
					}).sort(sortByReduceScale),
					addition: ReduceScale_Addition
				},
				{name:"Reduce Damage (0%, 25%)",otLangName:{chs:"队长盾减伤(0%, 25%)",cht:"隊長盾減傷(0%, 25%)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale > 0 && reduceScale < 0.25;
					}).sort(sortByReduceScale),
					addition: ReduceScale_Addition
				},
				{name:"Reduce Damage == 0",otLangName:{chs:"队长盾减伤 == 0",cht:"隊長盾減傷 == 0"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale === 0;
					})
				},
				{name:"Reduce Damage - Must all Att.",otLangName:{chs:"队长盾减伤-必须全属性减伤",cht:"隊長盾減傷-必須全屬性減傷"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						return getReduceScale(skill, true) > 0;
					})
				},
				{name:"Reduce Damage - Exclude HP-line",otLangName:{chs:"队长盾减伤-排除血线盾",cht:"隊長盾減傷-排除血線盾"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						return getReduceScale(skill, undefined, true) > 0;
					})
				},
				{name:"Reduce Damage - Exclude chance",otLangName:{chs:"队长盾减伤-排除几率盾",cht:"隊長盾減傷-排除幾率盾"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						return getReduceScale(skill, undefined, undefined, true) > 0;
					})
				},
				/*{name:"More than half with 99% gravity[29%, 100%)",otLangName:{chs:"满血99重力不下半血-队长盾减伤[29%, 100%)",cht:"滿血99重力不下半血-隊長盾減傷[29%, 100%)"},
					function:cards=>cards.filter(card=>{
						const skill = Skills[card.leaderSkillId];
						const reduceScale = getReduceScale(skill);
						return reduceScale>=0.29;
					}).sort(sortByReduceScale)
				},*/
				{name:"Reduce Damage - Unconditional",otLangName:{chs:"队长盾减伤-无条件盾",cht:"隊長盾減傷-無條件盾"},
					function:cards=>{
						return cards.filter(card=>{
							const skill = Skills[card.leaderSkillId];
							return getReduceScale_unconditional(skill) > 0;
						}).sort((a,b)=>{
							const a_s = Skills[a.leaderSkillId], b_s = Skills[b.leaderSkillId];
							return getReduceScale_unconditional(a_s) - getReduceScale_unconditional(b_s);
						});
					},
					addition:card=>{
						const skill = Skills[card.leaderSkillId];
						const scale = getReduceScale_unconditional(skill)
						return scale > 0 && `无条件${Math.round(getReduceScale_unconditional(skill) * 100)}%`;
					}
				},
			]},
		]},
