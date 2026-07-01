		{group:true,name:"Evo type",otLangName:{chs:"进化类型",cht:"進化類型"}, functions: [
			{group:true,name:"Transform",otLangName:{chs:"变身相关",cht:"變身相關"}, functions: [
				{name:"No Transform",otLangName:{chs:"非变身",cht:"非變身"},
					function:cards=>cards.filter(card=>
						!Array.isArray(card.henshinFrom) &&
						!Array.isArray(card.henshinTo))
				},
				{name:"After Transform",otLangName:{chs:"变身后",cht:"變身後"},
					function:cards=>cards.filter(card=>Array.isArray(card.henshinFrom))
				},
				{name:"Before Transform",otLangName:{chs:"变身前",cht:"變身前"},
					function:cards=>cards.filter(card=>Array.isArray(card.henshinTo))
				},
				{name:"Not Before Transform",otLangName:{chs:"除了变身前",cht:"除了變身前"},
					function:cards=>cards.filter(card=>!Array.isArray(card.henshinTo))
				},
				{name:"Random Transform",otLangName:{chs:"随机变身",cht:"隨機變身"},
					function:cards=>cards.filter(card=>{
						const searchTypeArray = [236];
						const skill = getCardActiveSkill(card, searchTypeArray);
						return skill;
					})
				},
			]},
			{name:"Pixel Evo",otLangName:{chs:"像素进化",cht:"像素進化"},
				function:cards=>cards.filter(card=>card.evoMaterials.includes(3826))
			},
			//{name:"",otLangName:{chs:"非8格潜觉",cht:"非8格潛覺"},function:cards=>cards.filter(card=>!card.is8Latent)},
			{name:"Reincarnation/Super Rein..",otLangName:{chs:"转生、超转生进化",cht:"轉生、超轉生進化"},
				function:cards=>cards.filter(isReincarnated)
			}, //evoBaseId可能为0
			//{name:"",otLangName:{chs:"仅超转生进化",cht:"僅超轉生進化"},function:cards=>cards.filter(card=>isReincarnated(card) && !Cards[card.evoBaseId].isUltEvo)},
			{name:"Super Ult Evo",otLangName:{chs:"超究极进化",cht:"超究極進化"},
				function:cards=>cards.filter(card=>card.isUltEvo && Cards[card.evoBaseId].isUltEvo)
			},
			{name:"Evo from Weapon",otLangName:{chs:"由武器进化而来",cht:"由武器進化而來"},
				function:cards=>cards.filter(card=>card.isUltEvo && Cards[card.evoBaseId].awakenings.includes(49))
			},
			{name:"Ordeal Evo",otLangName:{chs:"试练进化",cht:"試練進化"},
				function:cards=>cards.filter(card=>card.evoMaterials[0] === 0xFFFF),
				addition:card=>card.evoMaterials[0] === 0xFFFF && `地下城ID:${card.evoMaterials[1]}`
			},
		]},
		{group:true,name:"Awakenings",otLangName:{chs:"觉醒类",cht:"覺醒類"}, functions: [
			{name:"Have Sync Awoken",otLangName:{chs:"有同步觉醒",cht:"有同步覺醒"},
				function:cards=>cards.filter(card=>card.syncAwakening),
				addition:card=>{if (card.syncAwakeningConditions) {
					return card.syncAwakeningConditions.map(c=>cardN(c.id)).nodeJoin();
				}}
			},
			{name:"Full Awakening (9 / 8 for weapon)",otLangName:{chs:"满觉醒（9个/武器8个）",cht:"滿覺醒（9個/武器8個）"},
				function:cards=>cards.filter(card=>card.awakenings.length >= ( card.awakenings.includes(49) ? 8 : 9))
			},
			{name:"Has, but not full Awakening",otLangName:{chs:"有，但觉醒未满",cht:"有，覺醒未滿"},
				function:cards=>cards.filter(card=>card.awakenings.length > 0 && card.awakenings.length < ( card.awakenings.includes(49) ? 8 : 9))
			},
			{name:"3 same Killer, or 2 with latent",otLangName:{chs:"3个相同杀觉醒，或2+潜觉",cht:"3個相同殺覺醒，或2+潛覺"},
				function:cards=>cards.filter(card=>{
				const hasAwokenKiller = typekiller_for_type.find(type=>card.awakenings.filter(ak=>ak===type.awoken).length+(card.superAwakenings.includes(type.awoken)?1:0)>=2);
				if (hasAwokenKiller)
				{ //大于2个杀的进行判断
					if (card.awakenings.filter(ak=>ak===hasAwokenKiller.awoken).length+(card.superAwakenings.includes(hasAwokenKiller.awoken)?1:0)>=3)
					{ //大于3个杀的直接过
						return true;
					}else
					{ //2个杀的
						const isAllowLatent = card.types.filter(i=>
								i>=0 //去掉-1的type
							).map(type=>
								typekiller_for_type.find(t=>t.type==type).allowableLatent //得到允许打的潜觉杀
							).some(ls=>
								ls.includes(hasAwokenKiller.latent) //判断是否有这个潜觉杀
							);
						return isAllowLatent
					}
				}else
				{
					return false;
				}
				})
			},
			{group:true,name:"Kind of Awakening (No Super Awoken)",otLangName:{chs:"某类觉醒（无超觉）",cht:"某類覺醒（无超觉）"}, functions: [
				{name:"Any Reduce Attr. Damage Awakening",otLangName:{chs:"任意颜色盾觉醒",cht:"任意顏色盾覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=4 && ak<=8))
				},
				{name:"Any Killer Awakening",otLangName:{chs:"任意杀手觉醒",cht:"任意殺手覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=31 && ak<=42))
				},
				{name:"Any Enhanced Orbs Awakening",otLangName:{chs:"任意+珠觉醒",cht:"任意+珠覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=14 && ak<=18 || ak === 29 || ak>=99 && ak<=104))
				},
				{name:"Any Enhanced Rows Awakening",otLangName:{chs:"任意横行强化觉醒",cht:"任意横行強化覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=22 && ak<=26 || ak>=116 && ak<=120))
				},
				{name:"Any Enhanced Combos Awakening",otLangName:{chs:"任意连击强化（章鱼烧）觉醒",cht:"任意連擊強化（章魚燒）覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=73 && ak<=77 || ak>=121 && ak<=125))
				},
				{name:"Any Multi Attr. Enhanced Awakening",otLangName:{chs:"任意杂色强化觉醒",cht:"任意雜色強化覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak === 44 || ak === 51 || ak>=79 && ak<=81 || ak === 97 || ak>=112 && ak<=114))
				},
				{name:"Any Add Type Awakening",otLangName:{chs:"任意附加类型觉醒",cht:"任意附加類型覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=83 && ak<=90))
				},
				{name:"Any Change Sub Attr. Awakening",otLangName:{chs:"任意更改副属性觉醒",cht:"任意更改副屬性覺醒"},
					function:cards=>cards.filter(card=>card.awakenings.some(ak=>ak>=91 && ak<=95))
				},
			]},
		]},
		{group:true,name:"Others Search",otLangName:{chs:"其他搜索",cht:"其他搜索"}, functions: [
			{name:"Water Att. & Attacker Type(Tanjiro)",otLangName:{chs:"攻击型或水属性（炭治郎）",cht:"攻擊型或水屬性（炭治郎）"},
				function:cards=>cards.filter(card=>card.attrs.includes(1) || card.types.includes(6))
			},
			{name:"Level limit unable break",otLangName:{chs:"不能突破等级限制",cht:"不能突破等級限制"},
				function:cards=>cards.filter(card=>card.limitBreakIncr===0)
			},
			{name:"Able to lv110, but no Super Awoken",otLangName:{chs:"能突破等级限制但没有超觉醒",cht:"能突破等級限制但沒有超覺醒"},
				function:cards=>cards.filter(card=>card.limitBreakIncr > 0 && card.superAwakenings.length == 0)
			},
			{name:"Raise ≥50% at lv110",otLangName:{chs:"110级三维成长≥50%",cht:"110級三維成長≥50%"},
				function:cards=>cards.filter(card=>card.limitBreakIncr>=50).sort((a,b)=>a.limitBreakIncr - b.limitBreakIncr),
				addition:card=>`成长${card.limitBreakIncr}%`
			},
			{name:"Max level is lv1",otLangName:{chs:"满级只有1级",cht:"滿級只有1級"},
				function:cards=>cards.filter(card=>card.maxLevel==1)
			},
			{name:"Tradable(Less than 100MP)",otLangName:{chs:"可交易(低于100MP)",cht:"可交易(低於100MP)"},
				function:cards=>cards.filter(card=>card.sellMP<100)
			},
			{name:"Have 3 types",otLangName:{chs:"有3个type",cht:"有3個type"},
				function:cards=>cards.filter(card=>card.types.filter(t=>t>=0).length>=3)
			},
			{name:"Have 3 Attrs",otLangName:{chs:"有3个属性",cht:"有3個屬性"},
				function:cards=>cards.filter(card=>card.attrs.filter(a=>a>=0 && a<6).length >= 3)
			},
			{name:"3 attrs are different",otLangName:{chs:"3属性不一致",cht:"3屬性不一致"},
				function:cards=>cards.filter(({attrs})=>(new Set(attrs.filter(a=>a>=0 && a<6))).size >= 3)
			},
			{name:"All Latent TAMADRA",otLangName:{chs:"所有潜觉蛋龙",cht:"所有潛覺蛋龍"},
				function:cards=>cards.filter(card=>card.latentAwakeningId>0).sort((a,b)=>a.latentAwakeningId-b.latentAwakeningId)
			},
			{name:"Stacked material",otLangName:{chs:"堆叠的素材",cht:"堆疊的素材"},
				function:cards=>cards.filter(card=>card.stackable),
			},
			{name:"Not stacked material",otLangName:{chs:"不堆叠的素材",cht:"不堆疊的素材"},
				function:cards=>cards.filter(card=>!card.stackable && card.types.some(t=>[0,12,14,15].includes(t))),
			},
			{group:true,name:"Sold in stores",otLangName:{chs:"直接售卖",cht:"直接售賣"}, functions: [
				{name:"Will get Orbs skin",otLangName:{chs:"能获得宝珠皮肤",cht:"能獲得寶珠皮膚"},
					function:cards=>cards.filter(({orbSkinOrBgmId})=>orbSkinOrBgmId>0 && orbSkinOrBgmId<1e4),
					addition:({orbSkinOrBgmId})=>Boolean(orbSkinOrBgmId) && `ID.${orbSkinOrBgmId}`
				},
				{name:"Will get BGM",otLangName:{chs:"能获得背景音乐",cht:"能獲得背景音樂"},
					function:cards=>cards.filter(({orbSkinOrBgmId})=>orbSkinOrBgmId>=1e4),
					addition:({orbSkinOrBgmId})=>Boolean(orbSkinOrBgmId) && `ID.${orbSkinOrBgmId}`
				},
				{name:"Will get Team Badge",otLangName:{chs:"能获得队伍徽章",cht:"能獲得隊伍徽章"},
					function:cards=>cards.filter(({badgeId})=>badgeId),
					addition:({badgeId})=>{
						if (!badgeId) return;
						const fragment = document.createDocumentFragment();
						fragment.append(`ID.${badgeId}`);
						const icon = document.createElement("icon");
						icon.className = "badge";
						icon.setAttribute("data-badge-icon", badgeId);
						fragment.append(icon);
						return fragment;
					}
				},
			]},
			{name:"Hava banner when use skill",otLangName:{chs:"使用技能时有横幅",cht:"使用技能時有橫幅"},
				function:cards=>cards.filter(card=>card.skillBanner)
			},
			{group:true,name:"Only Additional display",otLangName:{chs:"附加显示",cht:"附加显示"}, functions: [
				{name:"Show Original Name",otLangName:{chs:"显示怪物原始名称",cht:"显示怪物原始名稱"},
					function:cards=>cards,
					addition:card=>card.name
				},
				{name:"Show Feed EXP",otLangName:{chs:"显示合成经验值",cht:"显示合成經驗值"},
					function:cards=>cards.filter(card=>card.feedExp > 0).sort((a,b)=>a.feedExp * a.maxLevel - b.feedExp * b.maxLevel),
					addition:card=>`EXP ${Math.round(card.feedExp * card.maxLevel / 4).bigNumberToString()}`
				},
				{name:"Show Sell Price",otLangName:{chs:"显示售卖金钱",cht:"显示售賣金錢"},
					function:cards=>cards.filter(card=>card.sellPrice > 0).sort((a,b)=>a.sellPrice * a.maxLevel - b.sellPrice * b.maxLevel),
					addition:card=>`Coin ${Math.round(card.sellPrice * card.maxLevel / 10).bigNumberToString()}`
				},
				{name:"Show Sell Monster Point(MP)",otLangName:{chs:"显示售卖怪物点数(MP)",cht:"显示售賣怪物點數(MP)"},
					function:cards=>cards,
					addition:card=>`MP ${card.sellMP.bigNumberToString()}`
				},
				{name:"Show Card Types",otLangName:{chs:"显示角色类型",cht:"显示角色類型"},
					function:cards=>cards,
					addition:card=>createTypesList(card.types)
				},
				{name:"Show Card Cost",otLangName:{chs:"显示角色消耗",cht:"显示角色消耗"},
					function:cards=>cards,
					addition:card=>`COST ${card.cost}`
				},
				{name:"Show Card Group ID",otLangName:{chs:"显示角色分组ID",cht:"顯示角色分組ID"},
					function:cards=>cards,
					addition:card=>{
						const ul = document.createElement("ul");
						ul.className = "monsterinfo-groupId";
						const mSeriesId = ul.appendChild(document.createElement("li"));
						mSeriesId.className = "monster-seriesId";
						mSeriesId.textContent = card.seriesId;
						mSeriesId.setAttribute(dataAttrName, card.seriesId);
						mSeriesId.classList.toggle(className_displayNone, !card.seriesId);
						const mCollabId = ul.appendChild(document.createElement("li"));
						mCollabId.className = "monster-collabId";
						mCollabId.textContent = card.collabId;
						mCollabId.setAttribute(dataAttrName, card.collabId);
						mCollabId.classList.toggle(className_displayNone, !card.collabId);
						const mGachaId = ul.appendChild(document.createElement("li"));
						mGachaId.className = "monster-gachaId";
						mGachaId.textContent = card.gachaIds.join();
						mGachaId.setAttribute(dataAttrName, card.gachaIds.join());
						mGachaId.classList.toggle(className_displayNone, !card.gachaIds.length);
						return ul;
					}
				},
			]},
		]},
	];
