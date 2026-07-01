			{group:true,name:"Player's HP change",otLangName:{chs:"玩家HP操纵类",cht:"玩家HP操縱類"}, functions: [
				{name:"Heal after turn",otLangName:{chs:"回合结束回血 buff",cht:"回合結束回血 buff"},
					function:cards=>{
						const searchTypeArray = [179];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [179];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('auto-heal'));
						fragment.append(`${sk[1]? sk[1].bigNumberToString() :`${sk[2]}%`}×${sk[0]}T`);
						return fragment;
					}
				},
				{name:"Heal immediately",otLangName:{chs:"玩家立刻回血",cht:"玩家立刻回血"},
					function:cards=>{
						return cards.filter(card=>{
							const heal = healImmediately_Rate(card);
							return Object.values(heal).some(v=>v);
						})
						.sort((a,b)=>{
							const a_h = healImmediately_Rate(a), b_h = healImmediately_Rate(b);
							const a_vs = Object.values(a_h), b_vs = Object.values(b_h);
							const a_i = a_vs.findIndex(v=>v), b_i = b_vs.findIndex(v=>v);
							let sortNum = a_i - b_i;
							if (!sortNum)
							{
								sortNum = a_vs[a_i] - b_vs[b_i];
							}
							return sortNum;
						});
					},
					addition:card=>{
						const heal = healImmediately_Rate(card);
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('heal', 'hp-incr'));
						if (heal.scale)
							fragment.append(`${heal.scale}%`);
						if (heal.const)
							fragment.append(`${heal.const.bigNumberToString()}点`);
						if (heal.selfRcv)
							fragment.append(`${heal.selfRcv/100}倍回复力`, );
						if (heal.vampire)
							fragment.append(`${heal.vampire}%伤害`);
						return fragment;
					}
				},
				{name:"Change team maximum HP",otLangName:{chs:"队伍最大 HP 变化",cht:"队伍最大 HP 變化"},
					function:cards=>{
						const searchTypeArray = [237];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:card=>{
						const searchTypeArray = [237];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('maxhp-locked'), `${sk[1].bigNumberToString()}%×${sk[0]}T`);
						return fragment;
					}
				},
				{name:"Damage self",otLangName:{chs:"玩家自残",cht:"玩家自殘"},
					function:cards=>{
						return cards.filter(card=>damageSelf_Rate(card)>0)
							.sort((a,b)=>damageSelf_Rate(a) - damageSelf_Rate(b));
					},
					addition:card=>{
						let rate = damageSelf_Rate(card);
						const fragment = document.createDocumentFragment();
						fragment.append(createSkillIcon('heal', 'hp-decr'));
						if (rate < 100)
							fragment.append(`减少${rate}%`);
						else
							fragment.append(`减少到1`);
						return fragment;
					}
				},
			]},
			{group:true,name:"Buff",otLangName:{chs:"buff 类",cht:"buff 類"}, functions: [
				{name:"RCV rate change",otLangName:{chs:"回复力 buff",cht:"回覆力 buff"},
					function:cards=>{
						return cards.filter(card=>{
							const atkbuff = rcvBuff_Rate(card);
							return atkbuff.skilltype > 0;
						}).sort((a,b)=>{
							let a_pC = rcvBuff_Rate(a), b_pC = rcvBuff_Rate(b);
							let sortNum = a_pC.skilltype - b_pC.skilltype;
							if (sortNum == 0)
								sortNum = a_pC.rate - b_pC.rate;
							if (sortNum == 0)
								sortNum = a_pC.turns - b_pC.turns;
							return sortNum;
						});
					},
					addition:card=>{
						const atkbuff = rcvBuff_Rate(card);
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createOrbsList([5]));
						if (atkbuff.skilltype == 0) return fragment;
						if (atkbuff.skilltype == 1)
						{
							fragment.appendChild(document.createTextNode(`+${atkbuff.rate}%/`));
							if (atkbuff.awoken.length)
								fragment.appendChild(creatAwokenList(atkbuff.awoken));
							if (atkbuff.attrs.length)
								fragment.appendChild(createOrbsList(atkbuff.attrs));
							if (atkbuff.types.length)
								fragment.appendChild(createTypesList(atkbuff.types));
							fragment.appendChild(document.createTextNode(`×${atkbuff.turns}T`));
						}else if (atkbuff.skilltype == 2)
						{
							if (atkbuff.attrs.length)
								fragment.appendChild(createOrbsList(atkbuff.attrs));
							if (atkbuff.types.length)
								fragment.appendChild(createTypesList(atkbuff.types));
							fragment.appendChild(document.createTextNode(`×${atkbuff.rate / 100}`));
							fragment.appendChild(document.createTextNode(`×${atkbuff.turns}T`));
						}
						return fragment;
					}
				},
				{name:"Team ATK rate change",otLangName:{chs:"全队攻击力 buff",cht:"全隊攻擊力 buff"},
					function:cards=>{
						return cards.filter(card=>{
							const atkbuff = atkBuff_Rate(card);
							return atkbuff.skilltype > 0;
						}).sort((a,b)=>{
							let a_pC = atkBuff_Rate(a), b_pC = atkBuff_Rate(b);
							let sortNum = a_pC.skilltype - b_pC.skilltype;
							if (sortNum == 0)
								sortNum = a_pC.rate - b_pC.rate;
							if (sortNum == 0)
								sortNum = a_pC.turns - b_pC.turns;
							return sortNum;
						});
					},
					addition:card=>{
						const atkbuff = atkBuff_Rate(card);
						const fragment = document.createDocumentFragment();
						if (atkbuff.skilltype == 0) return fragment;
						if (atkbuff.skilltype == 1)
						{
							fragment.appendChild(document.createTextNode(`+${atkbuff.rate}%/`));
							if (atkbuff.awoken.length)
								fragment.appendChild(creatAwokenList(atkbuff.awoken));
							if (atkbuff.attrs.length)
								fragment.appendChild(createOrbsList(atkbuff.attrs));
							if (atkbuff.types.length)
								fragment.appendChild(createTypesList(atkbuff.types));
							fragment.appendChild(document.createTextNode(`×${atkbuff.turns}T`));
						}else if (atkbuff.skilltype == 2)
						{
							if (atkbuff.attrs.length)
								fragment.appendChild(createOrbsList(atkbuff.attrs));
							if (atkbuff.types.length)
								fragment.appendChild(createTypesList(atkbuff.types));
							fragment.appendChild(document.createTextNode(`×${atkbuff.rate / 100}`));
							fragment.appendChild(document.createTextNode(`×${atkbuff.turns}T`));
						}
						return fragment;
					}
				},
				{name:"Move time change",otLangName:{chs:"操作时间 buff",cht:"操作時間 buff"},
					function:cards=>{
						const searchTypeArray = [132];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray), b_s = getCardActiveSkill(b, searchTypeArray);
							//将技能的手指类型转换为二进制01、10、11等形式，低位表示加固定秒，高位表示手指加倍
							const a_t =  Boolean(a_s.params[1]) | Boolean(a_s.params[2])<<1, b_t = Boolean(b_s.params[1]) | Boolean(b_s.params[2])<<1;
							return (a_t - b_t) || ((a_t & b_t & 1) ? a_s.params[1] - b_s.params[1] : a_s.params[2] - b_s.params[2]);
						});
					},
					addition:card=>{
						const searchTypeArray = [132];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						let str = "👆";
						if (sk[1]) str += `${sk[1]>0?`+`:``}${sk[1]/10}S`;
						if (sk[2]) str += `x${sk[2]/100}`;
						str += `x${sk[0]}T`;
						return str;
					}
				},
				{name:"Adds combo",otLangName:{chs:"加C buff",cht:"加C buff"},
					function:cards=>{
						const searchTypeArray = [160];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray), b_s = getCardActiveSkill(b, searchTypeArray);
							return a_s.params[1] - b_s.params[1];
						});
					},
					addition:card=>{
						const searchTypeArray = [160];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `+${sk[1]}C×${sk[0]}T`;
					}
				},
				{name:"Reduce Damage for all Attr",otLangName:{chs:"全属减伤 buff",cht:"全屬減傷 buff"},
					function:cards=>{
						const searchTypeArray = [3,156];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							if (!skill) return false;
							if (skill.type == 156)
								return skill.params[4]==3;
							else
								return true;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray), b_s = getCardActiveSkill(b, searchTypeArray);
							let sortNum = b_s.type - a_s.type; //先分开宝石姬与非宝石姬
							if (!sortNum)
							{
								let a_pC = a_s.params[a_s.type == 3 ? 1 : 5],b_pC = b_s.params[b_s.type == 3 ? 1 : 5];
								sortNum = a_pC - b_pC;
							}
							return sortNum;
						});
					},
					addition:card=>{
						const searchTypeArray = [3,156];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
			
						const fragment = document.createDocumentFragment();
						if (skill.type == 156)
						{
							fragment.appendChild(document.createTextNode(`${sk[5]}%/`));
							const awokenArr = sk.slice(1,4).filter(s=>s>0);
							fragment.appendChild(creatAwokenList(awokenArr));
							fragment.appendChild(document.createTextNode(`×${sk[0]}T`));
						}else
						{
							fragment.appendChild(document.createTextNode(`${sk[1]}%×${sk[0]}T`));
						}
						return fragment;
					}
				},
				{name:"Reduce 100% Damage",otLangName:{chs:"全属减伤 100%",cht:"全屬減傷 100%"},
					function:cards=>{
						const searchTypeArray = [3];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill && skill.params[1]>=100;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [3];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `无敌×${sk[0]}T`;
					}
				},
				{name:"Reduce all Damage for designated Attr",otLangName:{chs:"限属减伤 buff",cht:"限屬減傷 buff"},
					function:cards=>{
						const searchTypeArray = [21];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [21];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						
						const colors = [sk[1]];
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`-`));
						fragment.appendChild(createOrbsList(colors));
						fragment.appendChild(document.createTextNode(`×${sk[0]}T`));
			
						return fragment;
					}
				},
				{name:"Mass Attacks",otLangName:{chs:"变为全体攻击",cht:"變爲全體攻擊"},
					function:cards=>{
						const searchTypeArray = [51];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [51];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						return `全体×${sk[0]}T`;
					}
				},
				{name:"Rate by state count(Jewel Princess)",otLangName:{chs:"以状态数量为倍率类技能（宝石姬）",cht:"以狀態數量爲倍率類技能（寶石姬）"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [156,168,228,231];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					})
				},
			]},
			{group:true,name:"For Enemy",otLangName:{chs:"对敌 buff 类",cht:"對敵 buff 類"}, functions: [
				{name:"Menace",otLangName:{chs:"威吓",cht:"威嚇"},
					function:cards=>{
						const searchTypeArray = [18];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,0));
					},
					addition:card=>{
						const searchTypeArray = [18];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('delay'));
						fragment.append(`×${sk[0]}T`);
						return fragment;
					}
				},
				{name:"Reduces enemies' DEF",otLangName:{chs:"破防",cht:"破防"},
					function:cards=>{
						const searchTypeArray = [19, 282];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray),
			  					  b_s = getCardActiveSkill(b, searchTypeArray);

							return a_s.type - b_s.type ||
								a_s.params[1] - b_s.params[1] ||
								a_s.params[0] - b_s.params[0];
						});
					},
					addition:card=>{
						const searchTypeArray = [19, 282];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						switch (skill.type) {
							case 19: {
								fragment.append(
									createSkillIcon('def-break'),
									`${sk[1]}%×${sk[0]}T`
								);
								break;
							}
							case 282: {
								fragment.append(
									createSkillIcon('analyze'),
									`${sk[0]}%`
								);
								break;
							}
						}
						return fragment;
					}
				},
				{name:"Poisons enemies",otLangName:{chs:"中毒",cht:"中毒"},
					function:cards=>{
						const searchTypeArray = [4];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [4];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('poison'));
						fragment.append(`ATK×${sk[0]/100}`);
						return fragment;
					}
				},
				{name:"Change enemies's Attr",otLangName:{chs:"改变敌人属性",cht:"改變敵人屬性"},
					function:cards=>{
						return cards.filter(card=>{
							return changeEnemiesAttr_Attr(card).attr != null;
						}).sort((a,b)=>{
							let a_pC = changeEnemiesAttr_Attr(a),b_pC = changeEnemiesAttr_Attr(b);
							return a_pC.attr - b_pC.attr;
						})
					},
					addition:card=>{
						let change = changeEnemiesAttr_Attr(card);
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`敌→`));
						fragment.appendChild(createOrbsList(change.attr));
						if (change.turns > 0)
							fragment.appendChild(document.createTextNode(`×${change.turns}T`));
						return fragment;
					}
				},
				{name:"Counterattack buff",otLangName:{chs:"受伤反击 buff",cht:"受傷反擊 buff"},
					function:cards=>{
						const searchTypeArray = [60];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray,1));
					},
					addition:card=>{
						const searchTypeArray = [60];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('counter-attack'));
						fragment.appendChild(createOrbsList(sk[2]));
						fragment.appendChild(document.createTextNode(`×${sk[1]/100}倍`));
						fragment.appendChild(document.createTextNode(`×${sk[0]}T`));
			
						return fragment;
					}
				},
				{name:"Voids Super Gravity",otLangName:{chs:"超重力无效 buff",cht:"超重力無效 buff"},
					function:cards=>{
						const attrName = "super-gravity";
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
			]},
