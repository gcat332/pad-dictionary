			{group:true,name:"Change all Orbs on Board",otLangName:{chs:"洗板类",cht:"洗板類"}, functions: [
				{name:"Changes all Orbs to any",otLangName:{chs:"洗版-任意",cht:"洗版-任意"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [71];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					}),
					addition:boardChange_Addition
				},
				{group:true,name:"Colors Count",otLangName:{chs:"颜色数量",cht:"颜色数量"}, functions: [
					{name:"To 1 color(Farm)",otLangName:{chs:"1色（花火）",cht:"1色（花火）"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length == 1;
						}),
						addition:boardChange_Addition
					},
					{name:"To 2 color",otLangName:{chs:"2色",cht:"2色"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length == 2;
						}),
						addition:boardChange_Addition
					},
					{name:"To 3 color",otLangName:{chs:"3色",cht:"3色"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length == 3;
						}),
						addition:boardChange_Addition
					},
					{name:"To 4 color",otLangName:{chs:"4色",cht:"4色"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length == 4;
						}),
						addition:boardChange_Addition
					},
					{name:"To 5 color",otLangName:{chs:"5色",cht:"5色"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length == 5;
						}),
						addition:boardChange_Addition
					},
					{name:"To ≥6 color",otLangName:{chs:"6色以上",cht:"6色以上"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).length >= 6;
						}),
						addition:boardChange_Addition
					},
				]},
				{group:true,name:"Include Color",otLangName:{chs:"包含颜色",cht:"包含颜色"}, functions: [
					{name:"Include Fire",otLangName:{chs:"含火",cht:"含火"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(0);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Water",otLangName:{chs:"含水",cht:"含水"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(1);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Wood",otLangName:{chs:"含木",cht:"含木"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(2);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Light",otLangName:{chs:"含光",cht:"含光"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(3);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Dark",otLangName:{chs:"含暗",cht:"含暗"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(4);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Heart",otLangName:{chs:"含心",cht:"含心"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							return boardChange_ColorTypes(skill).includes(5);
						}),
						addition:boardChange_Addition
					},
					{name:"Include Jammers/Poison",otLangName:{chs:"含毒废",cht:"含毒廢"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [71];
							const skill = getCardActiveSkill(card, searchTypeArray);
							const colors = boardChange_ColorTypes(skill);
							return colors.includes(6)
								|| colors.includes(7)
								|| colors.includes(8)
								|| colors.includes(9);
						}),
						addition:boardChange_Addition
					},
				]},
			]},
			{group:true,name:"Orbs Color Change",otLangName:{chs:"指定色转珠类",cht:"指定色轉珠類"}, functions: [
				{group:true,name:"To Color",otLangName:{chs:"转为颜色",cht:"转为颜色"}, functions: [
					{name:"To Fire",otLangName:{chs:"变为-火",cht:"變爲-火"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(0));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Water",otLangName:{chs:"变为-水",cht:"變爲-水"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(1));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Wood",otLangName:{chs:"变为-木",cht:"變爲-木"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(2));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Light",otLangName:{chs:"变为-光",cht:"變爲-光"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(3));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Dark",otLangName:{chs:"变为-暗",cht:"變爲-暗"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(4));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Heal",otLangName:{chs:"变为-心",cht:"變爲-心"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(5));
						}),
						addition:changeOrbs_Addition
					},
					{name:"To Jammers/Poison",otLangName:{chs:"变为-毒废",cht:"變爲-毒廢"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.to.includes(6) || p.to.includes(7) || p.to.includes(8) || p.to.includes(9));
						}),
						addition:changeOrbs_Addition
					},
				]},
				{group:true,name:"From Color",otLangName:{chs:"转走颜色",cht:"转走颜色"}, functions: [
					{name:"From Fire",otLangName:{chs:"转走-火",cht:"轉走-火"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(0));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Water",otLangName:{chs:"转走-水",cht:"轉走-水"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(1));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Wood",otLangName:{chs:"转走-木",cht:"轉走-木"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(2));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Light",otLangName:{chs:"转走-光",cht:"轉走-光"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(3));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Dark",otLangName:{chs:"转走-暗",cht:"轉走-暗"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(4));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Heart",otLangName:{chs:"转走-心",cht:"轉走-心"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(5));
						}),
						addition:changeOrbs_Addition
					},
					{name:"From Jammers/Poison",otLangName:{chs:"转走-毒废",cht:"轉走-毒廢"},
						function:cards=>cards.filter(card=>{
							const searchTypeArray = [9,20,154];
							const skills = getCardActiveSkills(card, searchTypeArray);
							if (!skills.length) return false;
							let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
							return parsedSkills.some(p=>p.from.includes(6) || p.to.includes(7) || p.to.includes(8) || p.to.includes(9));
						}),
						addition:changeOrbs_Addition
					},
				]},
				
			]},
			{group:true,name:"Random Create Orbs",otLangName:{chs:"随机产珠类",cht:"隨機產珠類"}, functions: [
				{name:"Create 15×2 color Orbs",otLangName:{chs:"产珠15个×2色",cht:"產珠15個×2色"},
					function:cards=>cards.filter(card=>{
						function is1515(sk)
						{
							return Boolean(Bin.unflags(sk[1]).length == 2 && sk[0] == 15);
						}
						const searchTypeArray = [141];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && is1515(skill.params);
					}),
					addition:generateOrbs_Addition
				},
				{name:"Create 30 Orbs",otLangName:{chs:"产珠30个",cht:"產珠30個"},
					function:cards=>cards.filter(card=>{
						function is30(sk)
						{
							return Boolean(Bin.unflags(sk[1]).length * sk[0] == 30);
						}
						const searchTypeArray = [141];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill && is30(skill.params);
					}),
					addition:generateOrbs_Addition
				},
				{group:true,name:"Orb Color",otLangName:{chs:"生成颜色",cht:"生成颜色"}, functions: [
					{name:"6 color Orbs",otLangName:{chs:"6色",cht:"6色"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>(gen.to & 0b111111) === 0b111111);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Fire Orbs",otLangName:{chs:"火",cht:"火"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b000001);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Water Orbs",otLangName:{chs:"水",cht:"水"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b000010);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Wood Orbs",otLangName:{chs:"木",cht:"木"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b000100);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Light Orbs",otLangName:{chs:"光",cht:"光"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b001000);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Dark Orbs",otLangName:{chs:"暗",cht:"暗"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b010000);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Heart Orbs",otLangName:{chs:"心",cht:"心"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b100000);
						}),
						addition:generateOrbs_Addition
					},
					{name:"Jammers/Poison Orbs",otLangName:{chs:"毒废",cht:"毒廢"},
						function:cards=>cards.filter(card=>{
							const gens = generateOrbsParse(card);
							return gens.some(gen=>gen.to & 0b1111000000);
						}),
						addition:generateOrbs_Addition
					},
				]},
			]},
