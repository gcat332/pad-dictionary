	function atkBuff_Rate(card)
	{
		const searchTypeArray = [
			88,92, //类型的
			50,90, //属性的，要排除回复力
			156,168,231, //宝石姬
			228, //属性、类型数量
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		return skills.map(atkBuffParse).find(s=>s.rate != 0) || atkBuffParse();
		function atkBuffParse(skill) {
			const outObj = {
				skilltype: 0, //0为没有，1为宝石姬类，2为指定类型、属性
				types: [],
				attrs: [],
				awoken: [],
				rate: 0,
				turns: 0,
			};
			if (!skill) return outObj;
			const sk = skill.params;
			if (skill.type == 88 || skill.type == 92)
			{
				outObj.skilltype = 2;
				outObj.types = sk.slice(1, skill.type == 88 ? 2 : 3);
				outObj.turns = sk[0];
				outObj.rate = sk[skill.type == 88 ? 2 : 3];
			}
			else if(skill.type == 50 || skill.type == 90)
			{
				outObj.attrs = sk.slice(1, skill.type == 50 ? 2 : 3).filter(a=>a !== 5);
				if (!outObj.attrs.length)  //去除回复力
					return outObj;
				outObj.skilltype = 2;
				outObj.turns = sk[0];
				outObj.rate = sk[skill.type == 50 ? 2 : 3];
			}
			else if(skill.type == 156 && sk[4] == 2 //必须要是加攻击力
				|| skill.type == 168)
			{
				outObj.skilltype = 1;
				outObj.awoken = sk.slice(1, skill.type == 168 ? 7 : 4).filter(Boolean);
				outObj.turns = sk[0];
				outObj.rate = skill.type == 168 ? sk[7] : sk[5] - 100;
			}
			else if(skill.type == 228 && sk[3] > 0)
			{
				outObj.skilltype = 1;
				outObj.attrs = Bin.unflags(sk[1]);
				outObj.types = Bin.unflags(sk[2]);
				outObj.turns = sk[0];
				outObj.rate = sk[3];
			}
			else if(skill.type == 231 && sk[6] > 0)
			{
				outObj.skilltype = 1;
				outObj.awoken = sk.slice(1, 5).filter(Boolean);
				outObj.turns = sk[0];
				outObj.rate = sk[6];
			}
			return outObj;
		}

	}
	function rcvBuff_Rate(card)
	{
		const searchTypeArray = [
			50,90,
			228, 231, //宝石姬
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		return skills.map(rcvBuffParse).find(s=>s.rate != 0) || rcvBuffParse();
		function rcvBuffParse(skill) {
			const outObj = {
				skilltype: 0, //0为没有，1为宝石姬类，2为指定类型、属性
				types: [],
				attrs: [],
				awoken: [],
				rate: 0,
				turns: 0,
			};
			if (!skill) return outObj;
			const sk = skill.params;
			if (skill.type == 228 && sk[4] > 0) {
				outObj.skilltype = 1;
				outObj.attrs = Bin.unflags(sk[1]);
				outObj.types = Bin.unflags(sk[2]);
				outObj.turns = sk[0];
				outObj.rate = sk[4];
			} else if (skill.type == 231 && sk[7] > 0) {
				outObj.skilltype = 1;
				outObj.awoken = sk.slice(1, 5).filter(Boolean);
				outObj.turns = sk[0];
				outObj.rate = sk[7];
			} else if (skill.type == 50 || skill.type == 90) {
				outObj.skilltype = sk.slice(1,sk.length>2?-1:undefined).includes(5) ? 2 : 0;
				outObj.turns = sk[0];
				outObj.rate = sk.length > 2 ? sk[sk.length-1] : 0;
			}
			return outObj;
		}
	}
	function damageSelf_Rate(card)
	{
		const searchTypeArray = [84,85,86,87,195];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return 0;
		const sk = skill.params;
		return 100 - (sk[skill.type == 195 ? 0 : 3] || 0);
	}
	function changeEnemiesAttr_Attr(card)
	{
		const outObj = {
			attr: null,
			turns: 0
		}
		const searchTypeArray = [153, 224];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return outObj;
		const sk = skill.params;
		if (skill.type == 153)
		{
			outObj.attr = sk[0];
		}
		else if (skill.type == 224)
		{
			outObj.attr = sk[1] || 0;
			outObj.turns = sk[0];
		}
		return outObj;
	}

	function shapeThisRowOk(line, lineNumber) {
		if (lineNumber <= 0) return true;
		return line >= 0 && (line & lineNumber) === lineNumber && //含有这个形状
		(line & lineNumber.notNeighbour()) === 0; //形状四周都没有
	}
	function shapeUpsideDownRowOk(line, lineNumber) {
		if (lineNumber <= 0) return true;
		return line > 0 ? (line & lineNumber) === 0 : true;
	}
	function shapeIsCross(sk) { //产珠是十字
		const baseLineNum = 0b111;
		const lineNumArr = []; //同一行内所有的可能存在 既 0b111, 0b1110, 0b11100, 0b111000
		for (let _lineNum=baseLineNum; _lineNum<0b1000000; _lineNum<<=1){
			lineNumArr.push(_lineNum);
		}

		for (let ri=1; ri<4; ri++)
		{
			//搜索所有可能的行存在
			let maybeLineNum = lineNumArr.filter(lineNum=>shapeThisRowOk(sk[ri], lineNum));
			if (maybeLineNum.length < 1) continue;
			
			maybeLineNum = maybeLineNum.filter(lineNum=>{
				const lineNum2 = (lineNum << 1) & (lineNum >> 1);
				return shapeThisRowOk(sk[ri-1], lineNum2) &&
					   shapeThisRowOk(sk[ri+1], lineNum2) &&
					   shapeUpsideDownRowOk(sk[ri-2], lineNum2) &&
					   shapeUpsideDownRowOk(sk[ri+2], lineNum2);
			});
			if (maybeLineNum.length > 0) return true;
		}
		return false;
	}
	function shapeIsLShape(sk) { //产珠是L字
		const baseLineNum = 0b111;
		const lineNumArr = []; //同一行内所有的可能存在 既 0b111, 0b1110, 0b11100, 0b111000
		for (let _lineNum=baseLineNum; _lineNum<0b1000000; _lineNum<<=1){
			lineNumArr.push(_lineNum);
		}

		for (let ri=0; ri<5; ri++)
		{
			//搜索所有可能的行存在
			let maybeLineNum = lineNumArr.filter(lineNum=>shapeThisRowOk(sk[ri], lineNum));
			if (maybeLineNum.length < 1) continue;
			
			maybeLineNum = maybeLineNum.filter(lineNum=>{
				const lineNum2 = lineNum & ~(lineNum >> 1); //左边
				const lineNum3 = lineNum & ~(lineNum << 1); //右边

				return  shapeUpsideDownRowOk(sk[ri+1], lineNum) && ( //朝上
						shapeThisRowOk(sk[ri-1], lineNum2) &&
						shapeThisRowOk(sk[ri-2], lineNum2) &&
						shapeUpsideDownRowOk(sk[ri-3], lineNum2) ||
						shapeThisRowOk(sk[ri-1], lineNum3) &&
						shapeThisRowOk(sk[ri-2], lineNum3) &&
						shapeUpsideDownRowOk(sk[ri-3], lineNum3)) 
						||
						shapeUpsideDownRowOk(sk[ri-1], lineNum) && ( //朝下
						shapeThisRowOk(sk[ri+1], lineNum2) &&
						shapeThisRowOk(sk[ri+2], lineNum2) &&
						shapeUpsideDownRowOk(sk[ri+3], lineNum2) ||
						shapeThisRowOk(sk[ri+1], lineNum3) &&
						shapeThisRowOk(sk[ri+2], lineNum3) &&
						shapeUpsideDownRowOk(sk[ri+3], lineNum3));
			});
			if (maybeLineNum.length > 0) return true;
		}
		return false;
	}
	//创建1个觉醒图标
	function createAwokenIcon(awokenId)
	{
		const icon = document.createElement("icon");
		icon.className ="awoken-icon";
		icon.setAttribute("data-awoken-icon", awokenId);
		return icon;
	}
	//产生一个觉醒列表
	function creatAwokenList(awokens) {
		const ul = document.createElement("ul");
		ul.className = "awoken-ul";
		awokens.forEach(ak=>{
			const li = ul.appendChild(document.createElement("li"));
			const icon = li.appendChild(createAwokenIcon(ak));
		});
		return ul;
	}
	//产生宝珠列表
	function createOrbsList(orbs, className)
	{
		if (orbs == undefined) orbs = [0];
		else if (!Array.isArray(orbs)) orbs = [orbs];
		const ul = document.createElement("ul");
		ul.className = "board";
		orbs.forEach(orbType => {
			const li = ul.appendChild(document.createElement("li"));
			li.className = className ? `orb ${className}` :`orb`;
			li.setAttribute("data-orb-icon", orbType);
		});	
		return ul;
	}
	//产生类型列表
	function createTypesList(types)
	{
		if (types == undefined) types = [0];
		else if (!Array.isArray(types)) types = [types];
		const ul = document.createElement("ul");
		ul.className = "types-ul";
		types.forEach(type => {
			const li = ul.appendChild(document.createElement("li"));
			li.className = `type-icon`;
			li.setAttribute("data-type-icon", type);
		});	
		return ul;
	}

