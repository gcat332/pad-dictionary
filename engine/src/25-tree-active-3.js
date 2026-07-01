			{group:true,name:"Orbs States Change",otLangName:{chs:"改变宝珠状态类",cht:"改變寶珠狀態類"}, functions: [
				{name:"Unlock",otLangName:{chs:"解锁",cht:"解鎖"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [172];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Lock(Any color)",otLangName:{chs:"上锁（不限色）",cht:"上鎖（不限色）"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [152];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:lock_Addition
				},
				{name:"Lock(≥6 color)",otLangName:{chs:"上锁5色+心或全部",cht:"上鎖5色+心或全部"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [152];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && (skill.params[0] & 0b11_1111) === 0b11_1111;
					}),
					addition:lock_Addition
				},
				{name:"Enhanced Orbs",otLangName:{chs:"强化宝珠",cht:"強化寶珠"},
					function:cards=>{
					const searchTypeArray = [52,91,140];
					return cards.filter(card=>{
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					});
					},
					addition:card=>{
						const searchTypeArray = [52,91,140];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						let attrs = [];
						switch (skill.type)
						{
							case 52:{
								attrs.push(sk[0]); break;
							}
							case 91:{
								attrs = sk.slice(0,-1); break;
							}
							case 140:{
								attrs = Bin.unflags(sk[0]); break;
							}
						}
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('orb-enhanced'));
						fragment.appendChild(createOrbsList(attrs));
						return fragment;
					}
				},
				{name:"Add Combo Drop",otLangName:{chs:"加豆荚",cht:"加豆莢"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [190];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:lock_Addition
				},
				{name:"Add Nail",otLangName:{chs:"加钉子",cht:"加釘子"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [262];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:lock_Addition
				},
				{name:"Bind self matchable",otLangName:{chs:"自封消珠 debuff",cht:"自封消珠 debuff"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [215];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [215];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`自封`));
						fragment.appendChild(createOrbsList(Bin.unflags(sk[1] || 1)));
						fragment.appendChild(document.createTextNode(`×${sk[0]}T`));
						return fragment;
					}
				},
			]},
			{group:true,name:"Board States Change",otLangName:{chs:"改变板面状态类",cht:"改變板面狀態類"}, functions: [
				{name:"Replaces all Orbs",otLangName:{chs:"刷版",cht:"刷版"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [10];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					})
				},
				{name:"Destory Orbs",otLangName:{chs:"破坏宝珠",cht:"破壞寶珠"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [277];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [277];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						const attrs = Bin.unflags(sk[0]);
						fragment.append("破坏",createOrbsList(attrs));
						return fragment;
					}
				},
				{name:"No Skyfall",otLangName:{chs:"无天降 buff",cht:"無天降 buff"},
					function:cards=>{
						const searchTypeArray = [184];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [184];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `无↓×${sk[0]}T`;
					}
				},
				{name:"Creates Roulette Orb",otLangName:{chs:"生成轮盘位 buff",cht:"生成輪盤位 buff"},
					function:cards=>{
						const searchTypeArray = [207, 249];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray),
								  b_s = getCardActiveSkill(b, searchTypeArray);
							return (a_s.type - b_s.type) || !a_s.params[7] - !b_s.params[7] || a_s.params[0] - b_s.params[0];
						});
					},
					addition:card=>{
						const searchTypeArray = [207, 249];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('board-roulette'));
						if (skill.type == 249) {
							fragment.append(createOrbsList(Bin.unflags(sk[1])));
						}
						fragment.append(`${sk[7]? sk[7] : '固定'+sk.slice(2,7).flatMap(Bin.unflags).length }`,`×${sk[0]}T`);
						return fragment;
					}
				},
				{name:"Creates Cloud",otLangName:{chs:"生成云 debuff",cht:"生成雲 debuff"},
					function:cards=>{
						const searchTypeArray = [238];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [238];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `${sk[1] * sk[2]}个×${sk[0]}T`;
					}
				},
				{name:"Creates Cloud",otLangName:{chs:"生成封条 debuff",cht:"生成封条 debuff"},
					function:cards=>{
						const searchTypeArray = [239];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [239];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const colums = Bin.unflags(sk[0]), rows = Bin.unflags(sk[2]);
						const fragment = document.createDocumentFragment();
						if (colums.length)
							fragment.append(`${colums.length}竖`);
						if (rows.length)
							fragment.append(`${rows.length}横`);
						fragment.append(`×${sk[1]}T`);
						return fragment;
					}
				},
				{name:"Creates Deep Dark Orb",otLangName:{chs:"生成超暗闇 debuff",cht:"生成超暗闇 debuff"},
					function:cards=>{
						const searchTypeArray = [251];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [251];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `${sk[1] == sk[2] ? sk[1] : sk[1] +"~"+ sk[2]}个×${sk[0]}T`;
					}
				},
				{name:"Change Board Size",otLangName:{chs:"改变板面大小 buff",cht:"改變板面大小 buff"},
					function:cards=>{
						const searchTypeArray = [244];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:card=>{
						const searchTypeArray = [244];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
	
						let width, height;
						switch (sk[1]) {
							case 1: {
								width = 7;
								height = 6;
								break;
							}
							case 2: {
								width = 5;
								height = 3;
								break;
							}
							case 3: {
								width = 6;
								height = 5;
								break;
							}
							default: {
								width = 6;
								height = 5;
							}
						}
						return `[${width}×${height}]×${sk[0]}T`;
					}
				},
				{name:"Fixed starting position",otLangName:{chs:"固定起手位置",cht:"固定起手位置"},
					function:cards=>cards.filter(card=>{
					const searchTypeArray = [273];
					const skill = getCardActiveSkill(card, searchTypeArray);
					return skill;
					})
				},
			]},
			{group:true,name:"Orbs Drop",otLangName:{chs:"珠子掉落 类",cht:"珠子掉落 類"}, functions: [
				{name:"Drop Enhanced Orbs",otLangName:{chs:"掉落强化宝珠 buff",cht:"掉落強化寶珠 buff"},
					function:cards=>{
						const searchTypeArray = [180];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:card=>{
						const searchTypeArray = [180];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `${sk[1]}%×${sk[0]}T`;
					}
				},
				{name:"Drop locked orbs(any color)",otLangName:{chs:"掉锁（不限色）",cht:"掉鎖（不限色）"},
					function:cards=>{
						const searchTypeArray = [205];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:dropLock_Addition
				},
				{name:"Drop locked orbs(≥6 color)",otLangName:{chs:"掉锁5色+心或全部",cht:"掉鎖5色+心或全部"},
					function:cards=>{
						const searchTypeArray = [205];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b11_1111) === 0b11_1111;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:dropLock_Addition
				},
				{group:true,name:"Drop rate increases",otLangName:{chs:"掉落率提升",cht:"掉落率提升"}, functions: [
					{name:"Drop rate increases",otLangName:{chs:"掉落率提升 buff",cht:"掉落率提升 buff"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Fire",otLangName:{chs:"掉落率提升-属性-火",cht:"掉落率提升-屬性-火"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b1);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Water",otLangName:{chs:"掉落率提升-属性-水",cht:"掉落率提升-屬性-水"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b10);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Wood",otLangName:{chs:"掉落率提升-属性-木",cht:"掉落率提升-屬性-木"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b100);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Light",otLangName:{chs:"掉落率提升-属性-光",cht:"掉落率提升-屬性-光"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b1000);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Dark",otLangName:{chs:"掉落率提升-属性-暗",cht:"掉落率提升-屬性-暗"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b1_0000);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Heart",otLangName:{chs:"掉落率提升-属性-心",cht:"掉落率提升-屬性-心"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b10_0000);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - Attr. - Jammers/Poison",otLangName:{chs:"掉落率提升-属性-毒、废",cht:"掉落率提升-屬性-毒、廢"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && (skill.params[0] & 0b11_1100_0000);
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - 99 turns",otLangName:{chs:"掉落率提升-持续99回合",cht:"掉落率提升-持續99回合"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && skill.params[1] >= 99;
						}),
						addition:dropOrb_Addition
					},
					{name:"Drop rate - 100% rate",otLangName:{chs:"掉落率提升-100%几率",cht:"掉落率提升-100%幾率"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [126];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && skill.params[3] == 100;
						}),
						addition:dropOrb_Addition
					},
				]},
				{name:"Drop Nail Orbs",otLangName:{chs:"掉落钉珠 buff",cht:"掉落釘珠 buff"},
					function:cards=>{
						const searchTypeArray = [226];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [226];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('orb-nail'), `${sk[1]}%×${sk[0]}T`);
						return fragment;
					}
				},
				{name:"Drop Thorn Orbs",otLangName:{chs:"掉落荆棘 debuff",cht:"掉落荊棘 debuff"},
					function:cards=>{
						const searchTypeArray = [243];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [243];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('orb-thorn'));
						if ((sk[1] & 0b1111111111) != 1023) {
							let attrs = Bin.unflags(sk[1]);
							fragment.append(createOrbsList(attrs));
						}
						fragment.append(`${sk[3]}%×${sk[0]}T`, document.createElement("br"), "/" ,createSkillIcon('maxhp-locked'), `${sk[2]}%`);
						return fragment;
					}
				},
				{name:"Prediction of falling",otLangName:{chs:"预测掉落 buff",cht:"預測掉落 buff"},
					function:cards=>{
						const searchTypeArray = [253];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [253];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('prediction-falling'));
						fragment.append(`×${sk[0]}T`);
						return fragment;
					}
				},
			]},
