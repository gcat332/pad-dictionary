			{group:true,name:"Create Fixed Position Orbs",otLangName:{chs:"固定位置产珠类",cht:"固定位置產珠類"}, functions: [
				{name:"Create designated shape",otLangName:{chs:"生成指定形状的",cht:"生成指定形狀的"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [176];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:card=>{
						const searchTypeArray = [176];
						const skills = getCardActiveSkills(card, searchTypeArray);
						if (!skills.length) return;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`形状`));
						skills.forEach(skill=>fragment.appendChild(createOrbsList(skill.params[5])));
						return fragment;
					}
				},
				{name:"Create outer edges",otLangName:{chs:"生成四周一圈",cht:"生成四周一圈"},
					function:cards=>cards.filter(card=>{
						function isOuterEdges(sk)
						{
							const baseLineNum1 = 0b111111;
							const baseLineNum2 = 0b100001;
							return  shapeThisRowOk(sk[0], baseLineNum1) &&
									shapeThisRowOk(sk[1], baseLineNum2) && //第2行含有这个形状
									shapeThisRowOk(sk[2], baseLineNum2) && //第2行含有这个形状
									shapeThisRowOk(sk[3], baseLineNum2) && //第2行含有这个形状
									shapeThisRowOk(sk[4], baseLineNum1);
						}
						const searchTypeArray = [176];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && isOuterEdges(skill.params);
					}),
					addition:card=>{
						const searchTypeArray = [176];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`外圈`));
						fragment.appendChild(createOrbsList(sk[5]));
						return fragment;
					}
				},
				{name:"Create 3×3 block",otLangName:{chs:"生成3×3方块",cht:"生成3×3方塊"},
					function:cards=>cards.filter(card=>{
						function is3x3(sk)
						{
							const baseLineNum = 0b111;
							const lineNumArr = []; //同一行内所有的可能存在 既 0b111, 0b1110, 0b11100, 0b111000
							for (let _lineNum=baseLineNum; _lineNum<0b1000000; _lineNum<<=1)
							{
								lineNumArr.push(_lineNum);
							}
	
							for (let ri=0; ri<3; ri++)
							{
								//搜索所有可能的行存在
								let maybeLineNum = lineNumArr.filter(lineNum=>shapeThisRowOk(sk[ri], lineNum));
								if (maybeLineNum.length < 1) continue;
								
								maybeLineNum = maybeLineNum.filter(lineNum=>
									shapeUpsideDownRowOk(sk[ri-1], lineNum) && //如果上一行存在，并且无交集(and为0)
									shapeUpsideDownRowOk(sk[ri+3], lineNum) && //如果第四行存在，并且无交集(and为0)
									shapeThisRowOk(sk[ri+1], lineNum) && //第2行含有这个形状
									shapeThisRowOk(sk[ri+2], lineNum)    //第3行含有这个形状
								);
								if (maybeLineNum.length > 0) return true;
							}
							return false;
						}
						const searchTypeArray = [176];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && is3x3(skill.params.slice(0,5));
					}),
					addition:card=>{
						const searchTypeArray = [176];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`3×3`));
						fragment.appendChild(createOrbsList(sk[5]));
						return fragment;
					}
				},
				{name:"Create cross",otLangName:{chs:"生成十字",cht:"生成十字"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [176];
						const skills = getCardActiveSkills(card, searchTypeArray);
						return skills.filter(skill=>shapeIsCross(skill.params.slice(0,5))).length;
					}),
					addition:function(card){
						const searchTypeArray = [176];
						const skills = getCardActiveSkills(card, searchTypeArray).filter(skill=>shapeIsCross(skill.params.slice(0,5)));
						if (!skills.length) return;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`十字`));
						skills.forEach(skill=>fragment.appendChild(createOrbsList(skill.params[5])));
						return fragment;
					},
				},
				{name:"Create L shape",otLangName:{chs:"生成L字",cht:"生成L字"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [176];
						const skills = getCardActiveSkills(card, searchTypeArray);
						return skills.filter(skill=>shapeIsLShape(skill.params.slice(0,5))).length;
					}),
					addition:function(card){
						const searchTypeArray = [176];
						const skills = getCardActiveSkills(card, searchTypeArray).filter(skill=>shapeIsLShape(skill.params.slice(0,5)));
						if (!skills.length) return;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(document.createTextNode(`L字`));
						skills.forEach(skill=>fragment.appendChild(createOrbsList(skill.params[5])));
						return fragment;
					},
				},
				{name:"Create verticals",otLangName:{chs:"产竖",cht:"產豎"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [127];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:generateColumnOrbs_Addition
				},
				{name:"Create vertical Heart",otLangName:{chs:"产竖心",cht:"產豎心"},
					function:cards=>cards.filter(card=>{
						function isHeart(sk)
						{
							for (let i=1;i<sk.length;i+=2)
							{
								if (sk[i] & 32)
								{
									return true;
								}
							}
						}
						const searchTypeArray = [127];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && isHeart(skill.params);
					}),
					addition:generateColumnOrbs_Addition
				},
				{name:"Create horizontals",otLangName:{chs:"产横",cht:"產橫"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [128];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:generateRowOrbs_Addition
				},
				{name:"Create ≥2 horizontals",otLangName:{chs:"2横或以上",cht:"2橫或以上"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [128];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && (skill.params.length>=3 || Bin.unflags(skill.params[0]).length>=2);
					}),
					addition:generateRowOrbs_Addition
				},
				{name:"Create 2 color horizontals",otLangName:{chs:"2色横",cht:"2色橫"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [128];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && skill.params[3]>=0 && (skill.params[1] & skill.params[3]) != skill.params[1];
					}),
					addition:generateRowOrbs_Addition
				},
				{name:"Create horizontal not Top or Bottom",otLangName:{chs:"非顶底横",cht:"非頂底橫"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [128];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && ((skill.params[0] | skill.params[2]) & 0b1110);
					}),
					addition:generateRowOrbs_Addition
				},
				{name:"Extensive horizontal(Farm and outer edges)",otLangName:{chs:"泛产横（包含花火与四周一圈等）",cht:"泛產橫（包含花火與四周一圈等）"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [128,71,176];
						function isRow(skill)
						{
							const sk = skill.params;
							if (skill.type === 128) {//普通横
								return true;
							}
							else if (skill.type === 71) {//花火
								return sk.slice(0,sk.includes(-1)?sk.indexOf(-1):undefined).length === 1
							}
							else if (skill.type === 176) {//特殊形状
								return sk.some(n=>(n & 0b111111) === 0b111111)
							}
							return false;
						}
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && isRow(skill);
					})
				},
			]},
			{group:true,name:"Damage Enemy - Gravity",otLangName:{chs:"对敌直接伤害类-重力",cht:"對敵直接傷害類-重力"}, functions: [
				{name:"Any",otLangName:{chs:"任意",cht:"任意"},
					function:cards=>{
						const searchTypeArray = [6, 161, 261];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition: gravity_Addition
				},
				{name:"Current HP",otLangName:{chs:"敌人当前血量",cht:"敵人當前血量"},
					function:cards=>{
						const searchTypeArray = [6, 261];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition: gravity_Addition
				},
				{name:"Max HP",otLangName:{chs:"敌人最大血量",cht:"敵人最大血量"},
					function:cards=>{
						const searchTypeArray = [161];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition: gravity_Addition
				},
				{name:"Breaking Shield",otLangName:{chs:"破白盾",cht:"破白盾"},
					function:cards=>{
						const searchTypeArray = [259, 272];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_s = getCardActiveSkill(a, searchTypeArray),
								b_s = getCardActiveSkill(b, searchTypeArray);
							const a_p = a_s.params[0] * (a_s.type === 259 ? 1 : 100),
								b_p = b_s.params[0] * (b_s.type === 259 ? 1 : 100);
							return a_p - b_p;
						});
					},
					addition:card=>{
						const searchTypeArray = [259, 272];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						 
						const percent = skill.params[0] * (skill.type === 259 ? 1 : 100);
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('breaking-shield'));
						fragment.append(`-${percent}%`);
						return fragment;
					}
				},
				{name:"Park Breaking",otLangName:{chs:"部位破坏重力",cht:"部位破壞重力"},
					function:cards=>{
						const searchTypeArray = [276];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:card=>{
						const searchTypeArray = [276];
						const skill = getCardActiveSkill(card, searchTypeArray);
						if (!skill) return;
						const sk = skill.params;
						const fragment = document.createDocumentFragment();
						fragment.appendChild(createSkillIcon('rate-mul-part_break'));
						fragment.append(`-${sk[0]}%`);
						return fragment;
					}
				},
			]},
			{group:true,name:"Damage Enemy - Fixed damage",otLangName:{chs:"对敌直接伤害类-固伤",cht:"對敵直接傷害類-固傷"}, functions: [
				{name:"Any",otLangName:{chs:"任意",cht:"任意"},
					function:cards=>{
						const searchTypeArray = [55,188,56];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_ss = getCardActiveSkills(a, searchTypeArray), b_ss = getCardActiveSkills(b, searchTypeArray);
							let a_pC = a_ss.reduce((p,v)=>p+v.params[0],0), b_pC = b_ss.reduce((p,v)=>p+v.params[0],0);
							return a_pC - b_pC;
						});
					},
					addition:dixedDamage_Addition
				},
				{name:"Single",otLangName:{chs:"单体",cht:"單體"},
					function:cards=>{
						const searchTypeArray = [55,188];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>{
							const a_ss = getCardActiveSkills(a, searchTypeArray), b_ss = getCardActiveSkills(b, searchTypeArray);
							let a_pC = a_ss.reduce((p,v)=>p+v.params[0],0), b_pC = b_ss.reduce((p,v)=>p+v.params[0],0);
							return a_pC - b_pC;
						});
					},
					addition:dixedDamage_Addition
				},
				{name:"Mass",otLangName:{chs:"全体",cht:"全體"},
					function:cards=>{
						const searchTypeArray = [56];
						return cards.filter(card=>{
							const skill = getCardActiveSkill(card, searchTypeArray);
							return skill;
						}).sort((a,b)=>sortByParams(a,b,searchTypeArray));
					},
					addition:dixedDamage_Addition
				},
			]},
