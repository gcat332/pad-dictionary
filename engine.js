/* PAD special-search engine extracted from old/ sources. */
(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PADEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  let Skills = [];
  let Cards = [];
  const engineGlobalsStubbed = ["currentLanguage", "tp/render i18n helpers", "DocumentFragment render helpers (not used by filters)"];
  const currentLanguage = "en";

  function definePrototypeValue(proto, name, value) {
    if (!Object.prototype.hasOwnProperty.call(proto, name)) {
      Object.defineProperty(proto, name, { value, configurable: true, writable: true });
    }
  }

  function installHelpers() {
    definePrototypeValue(Array.prototype, "deleteLatter", function(item = null) {
      let index = this.length - 1;
      for (; index >= 0; index--) if (this[index] !== item) break;
      this.splice(index + 1);
      return this;
    });
    definePrototypeValue(Array.prototype, "distinct", function() {
      const set = new Set(this);
      this.length = 0;
      this.push(...set);
      return this.valueOf();
    });
    definePrototypeValue(Array.prototype, "switch", function(i1, i2) {
      if (Math.max(i1, i2) >= this.length) return false;
      const temp = this[i1];
      this[i1] = this[i2];
      this[i2] = temp;
      return true;
    });
    definePrototypeValue(Array.prototype, "shuffle", function() {
      let length = this.length;
      while (length) {
        const randomIndex = Math.floor(Math.random() * length--);
        this.switch(length, randomIndex);
      }
      return this;
    });
    definePrototypeValue(Array.prototype, "groupBy", function(func) {
      return this.reduce((pre, cur) => {
        const grp = pre.find((group) => group?.[0] && func(group?.[0], cur));
        if (grp) grp.push(cur);
        else pre.push([cur]);
        return pre;
      }, []);
    });
    definePrototypeValue(Array.prototype, "randomItem", function() {
      if (this.length === 0) return null;
      if (this.length === 1) return this[0];
      return this[Math.floor(Math.random() * this.length)];
    });
    definePrototypeValue(Array.prototype, "nodeJoin", function(separator) {
      if (typeof document === "undefined") return this.join(separator ?? "");
      const frg = document.createDocumentFragment();
      this.forEach((item, idx, arr) => {
        frg.append(item);
        if (idx < arr.length - 1 && separator !== null && separator !== undefined) {
          frg.append(separator instanceof Node ? separator.cloneNode(true) : separator);
        }
      });
      return frg;
    });
    definePrototypeValue(Number.prototype, "notNeighbour", function() {
      const num = this.valueOf();
      return ~num & (num << 1 | num >> 1);
    });
    definePrototypeValue(Number.prototype, "bigNumberToString", function() { return String(this.valueOf()); });
    definePrototypeValue(Number.prototype, "keepCounts", function(decimalDigits = 2, plusSign = false) {
      const newNumber = Number(this.toFixed(decimalDigits));
      return (plusSign && this > 0 ? "+" : "") + String(newNumber);
    });
    if (typeof DocumentFragment !== "undefined") {
      definePrototypeValue(DocumentFragment.prototype, "ap", function(...args) {
        this.append(...args.flat(Infinity).filter((item) => item !== null && item !== undefined));
        return this;
      });
    }
  }

  class Bin extends Set {
    constructor(arg) {
      if (typeof arg === "number" || typeof arg === "bigint") {
        super(Bin.unflags(arg));
      } else if (Array.isArray(arg) && arg.every((item) => typeof item === "number" && Number.isSafeInteger(item))) {
        super(arg);
      } else {
        throw new TypeError("Bin expects number, bigint, or number[]");
      }
    }
    static unflags(number) {
      const arr = [];
      if (!number) return arr;
      const inputType = typeof number;
      if (inputType !== "number" && inputType !== "bigint") throw new TypeError("Bin.unflags expects number or bigint");
      if (inputType === "number" && number > Number.MAX_SAFE_INTEGER) throw new RangeError("number exceeds safe integer range");
      const isBigint = inputType === "bigint";
      for (let i = 0, flag = isBigint ? 1n : 1; flag <= number; i++, flag = (isBigint ? 2n : 2) ** (isBigint ? BigInt(i) : i)) {
        if (number & flag) arr.push(i);
      }
      return arr;
    }
    static enflags(indexArr) {
      if (!Array.isArray(indexArr) || !indexArr.every((item) => typeof item === "number" && Number.isSafeInteger(item))) {
        throw new TypeError("Bin.enflags expects number[]");
      }
      let result = 0;
      let isBigint = false;
      let baseNum = 2;
      for (let value of indexArr) {
        if (value > 52 && !isBigint) {
          isBigint = true;
          result = BigInt(result);
          baseNum = BigInt(baseNum);
        }
        if (isBigint) value = BigInt(value);
        result = result + baseNum ** value;
      }
      return result;
    }
    get int() { return Bin.enflags(Array.from(this.values())); }
    add(index) {
      if (typeof index !== "number" || !Number.isSafeInteger(index)) throw new TypeError("Bin.add expects an integer");
      return super.add(index);
    }
  }

  function getActuallySkills(skill, skillTypes, searchRandom = true) {
    if (!skill) return [];
    if (skillTypes.includes(skill.type)) return [skill];
    if (
      skill.type === 116 ||
      (searchRandom && skill.type === 118) ||
      skill.type === 138 ||
      skill.type === 232 ||
      skill.type === 233 ||
      skill.type === 248
    ) {
      const params = skill.type === 248 ? skill.params.slice(1) : skill.params.concat();
      params.reverse();
      return params.flatMap((id) => getActuallySkills(Skills[id], skillTypes, searchRandom)).filter(Boolean);
    }
    return [];
  }

  function getCardLeaderSkills(card, skillTypes) {
    if (!card) return [];
    return getActuallySkills(Skills[card.leaderSkillId], skillTypes, false);
  }

  function getCardActiveSkills(card, skillTypes, searchRandom = false) {
    if (!card) return [];
    return getActuallySkills(Skills[card.activeSkillId], skillTypes, searchRandom);
  }

  function getSkillMinCD(skill) {
    return skill.initialCooldown - (skill.maxLevel - 1);
  }

let merge_skill = false;

class Attributes {
	static "0" = "Fire";
	static "1" = "Water";
	static "2" = "Wood";
	static "3" = "Light";
	static "4" = "Dark";
	static "5" = "Heart";
	static "6" = "Jammer";
	static "7" = "Poison";
	static "8" = "MPoison";
	static "9" = "Bomb";
	static Fire = 0;
	static Water = 1;
	static Wood = 2;
	static Light = 3;
	static Dark = 4;
	static Heart = 5;
	static Jammer = 6;
	static Poison = 7;
	static MPoison = 8;
	static Bomb = 9;
	static get all() {
		return [
			Attributes.Fire,
			Attributes.Water,
			Attributes.Wood,
			Attributes.Light,
			Attributes.Dark
		];
	}
	static get _6color() {
		return [
			Attributes.Fire,
			Attributes.Water,
			Attributes.Wood,
			Attributes.Light,
			Attributes.Dark,
			Attributes.Heart
		];
	}
	static get orbs() {
		return [
			Attributes.Fire,
			Attributes.Water,
			Attributes.Wood,
			Attributes.Light,
			Attributes.Dark,
			Attributes.Heart,
			Attributes.Jammer,
			Attributes.Poison,
			Attributes.MPoison,
			Attributes.Bomb
		];
	}
}

//代码来自于 https://www.jianshu.com/p/3644833bca33
function isEqual(obj1,obj2) {
	//判断是否是对象或数组
	function isObject(obj) {
		return typeof obj === 'object' && obj !== null;
	}
	// 两个数据有任何一个不是对象或数组
	if (!isObject(obj1) || !isObject(obj2)) {
		// 值类型(注意：参与equal的一般不会是函数)
		return obj1 === obj2;
	}
	// 如果传的两个参数都是同一个对象或数组
	if (obj1 === obj2) {
		return true;
	}

	// 两个都是对象或数组，而且不相等
	// 1.先比较obj1和obj2的key的个数，是否一样
	const obj1Keys = Object.keys(obj1);
	const obj2Keys = Object.keys(obj2);
	if (obj1Keys.length !== obj2Keys.length) {
		return false;
	}

	// 如果key的个数相等,就是第二步
	// 2.以obj1为基准，和obj2依次递归比较
	for (let key in obj1) {
		// 比较当前key的value  --- 递归
		const res = isEqual(obj1[key], obj2[key]);
		if (!res) {
			return false;
		}
	}

	// 3.全相等
	return true
}
class Orb
{
	attr = null;
	//states = {
	//	enhanced: false, //强化
	//	locked: false, //锁定
	//	unmatchable: false, //禁止消除
	//}
	states = new Set();
	constructor(attr = null)
	{
		this.attr = attr;
	}
	valueOf() {
		return this.attr;
	}
}
class Block
{
	//states = {
	//	cloud: false, //云
	//	roulette: false, //轮盘变化
	//}
	states = new Set();
}
class BoardSet
{
	boards = [];
	boardsLabel = [];
	node = (()=>{
		const div = document.createElement("div");
		div.className = "board-set";
		return div;
	})();
	constructor(...boards) {
		const boardSet = this;

		boardSet.boards.push(...(boards.filter(board=>board instanceof Board)));
		boardSet.boards.forEach((board, idx)=>{
			boardSet.node.appendChild(board.tableNode);
			const span = document.createElement("span");
			span.dataset.columnCount = board.columnCount;
			span.dataset.rowCount = board.rowCount;
			boardSet.boardsLabel.push(span);
			boardSet.node.appendChild(span);
			if (idx > 0) {
				board.tableNode.classList.add(className_displayNone);
			}
		});
		const span = document.createElement("span");
		span.className = "show-all-board";
		span.onclick = function(){
			boardSet.boards.forEach(board=>board.tableNode.classList.remove(className_displayNone));
			this.classList.add(className_displayNone);
		};
		boardSet.node.appendChild(span);
	}
	valueOf() {
		return this.node;
	}
}
class Board
{
	rowCount = 0;
	columnCount = 0;
	orbsData = [];
	blocksData = [];
	tableNode = document.createElement("table");
	constructor(def = null, columnCount = 6, rowCount = 5)
	{
		const intAttr = typeof(def) == "number" ? def : void 0;
		this.rowCount = Number(rowCount);
		this.columnCount = Number(columnCount);

		this.orbsData = new Array(this.rowCount);
		this.blocksData = new Array(this.rowCount);
		for (let ri=0; ri<this.rowCount; ri++)
		{
			const orbCol = new Array(this.columnCount), blockCol = new Array(this.columnCount);
			for (let ci=0; ci<this.columnCount; ci++)
			{
				orbCol[ci] = new Orb(intAttr);
				blockCol[ci] = new Block();
			}
			this.orbsData[ri] = orbCol;
			this.blocksData[ri] = blockCol;
		}
		//如果传入的是数组，直接随机分布
		if (Array.isArray(def))
		{
			this.randomFill(def);
		}
		const table = this.tableNode;
		table.boardData = this;
		table.className = "board";
		for (let ri=0; ri<this.rowCount; ri++)
		{
			const row = table.insertRow();
			for (let ci=0; ci<this.columnCount; ci++)
			{
				const cell = row.insertCell();
				cell.className = "block";
				const orbIcon = cell.appendChild(document.createElement('icon'));
				orbIcon.className = "orb";
			}
		}
	}
	//获取指定行号
	getTargetRowIndex(rowIndex)
	{
		switch (this.rowCount) {
			case 6: return rowIndex >= 2 ? rowIndex + 1 : rowIndex;
			case 4: return rowIndex >= 3 ? rowIndex - 1 : rowIndex;
			case 5: default: return rowIndex;
		}
	}
	//获取指定列号
	getTargetColumnIndex(columnIndex)
	{
		switch (this.columnCount) {
			case 7: return columnIndex >= 3 ? columnIndex + 1 : columnIndex;
			case 5: return columnIndex >= 3 ? columnIndex - 1 : columnIndex;
			case 6: default: return columnIndex;
		}
	}
	setOrbAndBlock(orb, block, attr, state, blockState)
	{
		if (orb instanceof Orb) {
			if (typeof(attr) == 'number' && !orb.states.has('locked'))
				orb.attr = attr;
			if (typeof(state) == 'string')
				orb.states.add(state);
		}
		if (block instanceof Block && typeof(blockState) == 'string')
			block.states.add(blockState);
	}
	//设定横行
	setRows(rows, attrs, state, blockState)
	{
		if (!Array.isArray(attrs)) attrs = [attrs];
		for (let ri of rows)
		{
			ri = this.getTargetRowIndex(ri);
			const orbsRow = this.orbsData[ri], blocksRow = this.blocksData[ri];
			for (let ci=0; ci<this.columnCount; ci++)
			{
				this.setOrbAndBlock(orbsRow[ci], blocksRow[ci], attrs.randomItem(), state, blockState);
			}
		}
	}
	//设定竖列
	setColumns(cols, attrs, state, blockState)
	{
		if (!Array.isArray(attrs)) attrs = [attrs];
		for (let ci of cols)
		{
			ci = this.getTargetColumnIndex(ci);
			for (let ri=0; ri<this.rowCount; ri++)
			{
				const orbsRow = this.orbsData[ri], blocksRow = this.blocksData[ri];

				this.setOrbAndBlock(orbsRow[ci], blocksRow[ci], attrs.randomItem(), state, blockState);
				if (blockState == 'immobility') { //如果是封条，额外添加需要旋转的信息
					this.setOrbAndBlock(orbsRow[ci], blocksRow[ci], attrs.randomItem(), state, 'rotate');
				}
			}
		}
	}
	//设定形状
	setShape(matrix, attrs, state, blockState)
	{
		if (!Array.isArray(attrs)) attrs = [attrs];
		//const setOrb = typeof(state) == 'number';
		function fillRow(ri, inputRow)
		{
			const orbsRow = this.orbsData[ri], blocksRow = this.blocksData[ri];
			for (let ci of inputRow)
			{
				ci = this.getTargetColumnIndex(ci);
				if (this.columnCount >= 7 && ci == 4)
				{
					this.setOrbAndBlock(orbsRow[ci - 1], blocksRow[ci - 1], attrs.randomItem(), state, blockState);
				}
				this.setOrbAndBlock(orbsRow[ci], blocksRow[ci], attrs.randomItem(), state, blockState);
			}
		}
		for (let i=0; i<matrix.length; i++)
		{
			let ri = this.getTargetRowIndex(i);
			if (this.rowCount >= 6 && ri == 3)
			{
				fillRow.call(this, ri - 1, matrix[i]);
			}
			fillRow.call(this, ri, matrix[i]);
		}
	}
	//洗版的填充
	randomFill(attrs)
	{
		if (!Array.isArray(attrs) && typeof(attrs) == 'number')
			attrs = [attrs];
		//获得随机排列的数据
		let attrArray = new Array(this.rowCount * this.columnCount);
		//每种颜色至少3个
		for (let i=0; i<attrs.length; i++) {
			attrArray.fill(attrs[i], i * 3, (i + 1) * 3);
		}
		//随机填充剩下的
		for (let i=attrs.length*3; i<attrArray.length; i++) {
			attrArray[i] = attrs.length == 1 ?
						attrs[0] :
						attrs[Math.floor(Math.random() * attrs.length)];
		}
		attrArray.shuffle(); //整体随机分布一次
		const flatOrbsData = this.orbsData.flat();
		flatOrbsData.forEach((orb, idx)=>{
			if (!orb.states.has('locked'))
				orb.attr = attrArray[idx];
		});
	}
	//生成珠子的填充
	generateOrbs(attrs, count, exclude, state)
	{
		if (!Array.isArray(attrs) && typeof(attrs) == 'number')
			attrs = [attrs];
		if (!Array.isArray(exclude) && typeof(exclude) == 'number')
			exclude = [exclude];

		let flatOrbsData = this.orbsData.flat()
		if (exclude?.length) flatOrbsData = flatOrbsData.filter(orb=>!exclude.includes(orb.attr));
		flatOrbsData.shuffle(); //将所有排除的格子打乱

		if (!state) { //未输入状态时，为产生珠子
			const attrArray = attrs?.length ? attrs.map(attr=>new Array(count).fill(attr)).flat() : [];
			//有属性时，使用产生珠子的长度；如果没有属性时，就保留1个长度，用来添加状态；但是都不能大于排除的宝珠数。
			const maxLength = Math.min(attrArray.length, flatOrbsData.length);
			//直接填充
			for (let i=0; i<maxLength; i++) {
				this.setOrbAndBlock(flatOrbsData[i], null, attrArray[i]);
			}
		} else {
			//在板面上查询符合的颜色
			flatOrbsData = flatOrbsData.filter(orb=>attrs.includes(orb.attr));
			const maxLength = Math.min(count, flatOrbsData.length);
			for (let i=0; i<maxLength; i++) {
				this.setOrbAndBlock(flatOrbsData[i], null, null, state);
			}
		}
	}
	//生成板面状态
	generateBlockStates(blockState, count = 1, size = [1,1], position = [0, 0])
	{
		for (let i=0; i<count; i++) {
			let [width, height] = size, [x, y] = position;
			if (!x) x = Math.randomInteger(this.columnCount - width); else x--;
			if (!y) y = Math.randomInteger(this.rowCount - height); else y--;
			for (let hi=0; hi<height; hi++) {
				for (let wi=0; wi<width; wi++) {
					this.setOrbAndBlock(null, this.blocksData[y+hi][x+wi], null, null, blockState);
				}
			}
		}
	}
	//导出数组
	valueOf()
	{
		return this.orbsData;
	}
	//输出表格
	refreshTable()
	{
		const table = this.tableNode;
		table.dataset.rowCount = this.rowCount;
		table.dataset.columnCount = this.columnCount;
		for (let ri=0; ri<this.rowCount; ri++)
		{
			const orbsRow = this.orbsData[ri], blocksRow = this.blocksData[ri];
			const row = table.rows[ri];
			for (let ci=0; ci<this.columnCount; ci++)
			{
				const cell = row.cells[ci], orbIcon = cell.querySelector("icon");
				const orbObj = orbsRow[ci], blockObj = blocksRow[ci];
				if (orbObj.attr != null)
					orbIcon.setAttribute("data-orb-icon", orbObj.attr);
				else
					orbIcon.removeAttribute("data-orb-icon");

				orbIcon.classList.add(...orbObj.states);
				cell.classList.add(...blockObj.states);
			}
		}
		return table;
	}
}

const SkillTarget = {
	type1: ["self","leader-self","leader-helper","sub-members"],
	type2: ["right-neighbor","left-neighbor","self"],
	enhancedAwakeningsId: [
			27, //U
			48, //九宫
			60, //L字
			78, //十字

			126,//T字
			22, //横排-火
			23, //横排-水
			24, //横排-木

			25, //横排-光
			26, //横排-暗
			79, //三色
			80, //四色

			81, //五色
			0,
			0,
			73, //串串-火

			74, //串串-水
			75, //串串-木
			76, //串串-光
			77, //串串-暗

			20, //心横解封
			82, //饼干
			133, //火水同时攻击
			134, //火水同时攻击

			135, //水木同时攻击
	],
};

const SkillValue = {
	isLess: function (value) {
		if (value.kind === SkillValueKind.Percent) return value.value < 1;
		if (value.kind === SkillValueKind.Constant) return value.value < 0;
		return false;
	}
};

const SkillValueKind = {
	Percent: 'mul',
	Constant: 'const',
	ConstantTo: 'const-to',
	xMaxHP: 'mul-maxhp',
	xHP: 'mul-hp',
	xCHP: 'mul-chp',
	xATK: 'mul-atk',
	xRCV: 'mul-rcv',
	RandomATK: 'random-atk',
	HPScale: 'hp-scale',
	xTeamHP: 'mul-team-hp',
	xTeamATK: 'mul-team-atk',
	xTeamRCV: 'mul-team-rcv',
	xAwakenings: 'mul-awakenings',
};

const SkillPowerUpKind = {
	Multiplier: 'mul',
	ScaleAttributes: 'scale-attrs',
	ScaleCombos: 'scale-combos',
	ScaleMatchLength: 'scale-match-len',
	ScaleMatchAttrs: 'scale-match-attrs',
	ScaleCross: 'scale-cross',
	ScaleRemainOrbs: 'scale-remain-orbs',
	ScaleStateKind: 'scale-state-kind',
};

const SkillKinds = {
	Error: "error",
	Unknown: "unknown",
	ActiveTurns: "active-turns",
	DelayActiveTurns: "delay-active-turns",
	DamageEnemy: "damage-enemy",
	Vampire: "vampire",
	ReduceDamage: "reduce-damage",
	SelfHarm: "self-harm",
	Heal: "heal",
	AutoHealBuff: "auto-heal-buff",
	ChangeOrbs: "change-orbs",
	GenerateOrbs: "generate-orbs",
	FixedOrbs: "fixed-orbs",
	PowerUp: "power-up",
	SlotPowerUp: "slot-power-up",
	CounterAttack: "counter-attack",
	SetOrbState: "set-orb-state",
	RateMultiply: "rate-mul",
	OrbDropIncrease: "orb-drop-incr",
	Resolve: "resolve",
	Delay: "delay",
	DefenseBreak: "def-break",
	MassAttack: "mass-attack",
	BoardChange: "board-change",
	Unbind: "unbind",
	BindSkill: "bind-skill",
	BindCard: "bind-card",
	RandomSkills: "random-skills",
	EvolvedSkills: "evolved-skills",
	ChangeAttribute: "change-attr",
	SkillBoost: "skill-boost",
	AddCombo: "add-combo",
	VoidEnemyBuff: "void-enemy-buff",
	Poison: "poison",
	CTW: "ctw",
	Gravity: "gravity",
	FollowAttack: "follow-attack",
	FollowAttackFixed: "follow-attack-fixed",
	AutoHeal: "auto-heal",
	TimeExtend: "time-extend",
	DropRefresh: "drop-refresh",
	LeaderChange: "leader-change",
	MinMatchLength: "min-match-len",
	FixedTime: "fixed-time",
	Drum: "drum",
	AutoPath: "auto-path",
	BoardSizeChange: "board-size-change",
	NoSkyfall: "no-skyfall",
	Henshin: "henshin",
	VoidPoison: "void-poison",
	SkillProviso: "skill-proviso",
	ImpartAwakenings: "impart-awakenings",
	ObstructOpponent: "obstruct-opponent",
	IncreaseDamageCapacity: "increase-damage-cap",
	BoardJammingStates: "board-jamming-states",
	RemoveAssist: "remove-assist",
	PredictionFalling: "prediction-falling",
	BreakingShield: "breaking-shield",
	PlayVoice: "play-voice",
	TimesLimit: "times-limit",
	FixedStartingPosition: "fixed-starting-position",
	PartGravity: "part-gravity",
	DestroyOrb: "destroy-orb",
	VoidFieldBuff: "void-field-buff",
	Analyze: "analyze",
}

function skillParser(skillId)
{
	function merge(skills)
	{
		//主动技部分的合并
		let activeTurns = skills.filter(skill=>skill.kind == SkillKinds.ActiveTurns);
		if (activeTurns.length>1)
		{ //把后面的全都合并到第一个
			//按回合数拆分组
			let diffTurnsGroup = activeTurns.groupBy((a,b)=>a.turns === b.turns);
			let diffTurnsSkills = diffTurnsGroup.flatMap(group=>{
				if (group.length>1) { //大于一个技能的可以合并
					group[0].skills = group.flatMap(s=>s.skills);
					// group.reduce((pre,cur)=>{
					// 	pre.skills.push(...cur.skills);
					// 	return pre
					// });
					let firstSkill = group.shift(); //从筛选中去除第一个
					group.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
					return [firstSkill];
				} else { //1个技能的跳过
					return group[0];
				}
			});
			//进行具体技能效果的合并
			diffTurnsSkills.forEach(turnsSkill=>{
				//破吸部分的合并
				let voidBuff = turnsSkill.skills.filter(skill=>skill.kind == SkillKinds.VoidEnemyBuff);
				if (voidBuff.length>1)
				{ //把后面的全都合并到第一个
					voidBuff[0].buffs = voidBuff.flatMap(s=>s.buffs);
					voidBuff.shift(); //从筛选中去除第一个
					voidBuff.forEach(skill=>turnsSkill.skills.splice(turnsSkill.skills.indexOf(skill),1)); //去掉所有后面的
				}
			});
		}
		//解封部分的合并
		let unbinds = skills.filter(skill=>skill.kind == SkillKinds.Unbind);
		if (unbinds.length>1)
		{ //把后面的全都合并到第一个
			unbinds.reduce((pre,cur)=>{
				pre.normal = pre.normal || cur.normal;
				pre.awakenings = pre.awakenings || cur.awakenings;
				pre.matches = pre.matches || cur.matches;
				return pre
			});
			unbinds.shift(); //从筛选中去除第一个
			unbinds.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		let fixedDamages = skills.filter(skill=>skill.kind == SkillKinds.DamageEnemy && skill.attr === 'fixed').filter((skill,idx,arr)=>skill.id==arr[0].id);
		if (fixedDamages.length>1)
		{ //把后面的全都合并到第一个
			fixedDamages[0].times = fixedDamages.length;
			fixedDamages.shift(); //从筛选中去除第一个
			fixedDamages.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		let skillPowerUp = skills.filter(skill=>skill.kind == SkillKinds.PowerUp);
		if (skillPowerUp.length > 1 || (skillPowerUp[0] && skillPowerUp[0]?.value?.kind === SkillPowerUpKind.ScaleCross))
		{
			//合并技能效果
			function combinePowerUp(target, source) {
				if (source?.additional.length)
				{
					if (!Array.isArray(target.additional)) target.additional = [];
					target.additional.push(...source.additional);
				}
				if (source.reduceDamage != undefined)
				{
					if (!target.reduceDamage)
						target.reduceDamage = source.reduceDamage;
					else if (target.reduceDamage.kind === source.reduceDamage.kind)
						target.reduceDamage.value *= source.reduceDamage.value;
				}
				if (target?.value.baseAtk != undefined && source?.value.baseAtk) target.value.baseAtk *= source.value.baseAtk;
				if (target?.value.baseRcv != undefined && source?.value.baseRcv != undefined) target.value.baseRcv *= source.value.baseRcv;

				if (target?.value.bonusAtk != undefined && source?.value.bonusAtk != undefined) target.value.bonusAtk += source.value.bonusAtk;
				if (target?.value.bonusRcv != undefined && source?.value.bonusRcv != undefined) target.value.bonusRcv += source.value.bonusRcv;

				if (target?.value.atk != undefined && source?.value.atk != undefined) target.value.atk *= source.value.atk;
				if (target?.value.hp != undefined && source?.value.hp != undefined) target.value.hp *= source.value.hp;
				if (target?.value.rcv != undefined && source?.value.rcv != undefined) target.value.rcv *= source.value.rcv;
			}

			//十字
			let scaleCross = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleCross);
			function mergeScaleCrossAttr(skill)
			{
				let crosses = skill.value.crosses;
				let atk = crosses[0].atk;
				let rcv = crosses[0].rcv;
				if (crosses.length >= 2 &&
					crosses.every(cross=>cross.atk === atk && cross.rcv === rcv)
				) {
					crosses[0].attr = Array.from(new Set(crosses.reduce((pre,cur)=>{
						pre.push(...cur.attr);
						return pre;
					}, [])));
					skill.value.crosses.splice(1);
				}
			}
			//每个十字技能，先把所有属性合并到自身
			scaleCross.forEach(mergeScaleCrossAttr);
			//筛选出所有倍率一样的子技能
			scaleCross = scaleCross.filter((skill,idx,arr)=>{
				let atk = arr[0].value.crosses[0].atk;
				let rcv = arr[0].value.crosses[0].rcv;
				let crosses = skill.value.crosses;
				return crosses.every(cross=>cross.atk === atk && cross.rcv === rcv);
			});
			//先合并属性倍率
			if (scaleCross.length >= 1)
			{ //把后面的全都合并到第一个
				scaleCross.reduce((pre,cur)=>{
					combinePowerUp(pre,cur);
					pre.value.crosses = pre.value.crosses.concat(cur.value.crosses);
					return pre
				});
				let _skill = scaleCross.shift(); //从筛选中去除第一个
				scaleCross.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
				mergeScaleCrossAttr(_skill);
			}
			//重新找出来十字，合并附加内容
			scaleCross = skills.filter(skill=>skill.kind == SkillKinds.PowerUp && skill.value.kind === SkillPowerUpKind.ScaleCross);
			scaleCross = scaleCross.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let attr0 = s0.value.crosses[0].attr.concat().sort();
				let attr1 = skill.value.crosses[0].attr.concat().sort();
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				isEqual(attr0, attr1)
				;
			});
			if (scaleCross.length > 1)
			{ //把后面的全都合并到第一个
				scaleCross.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleCross.shift(); //从筛选中去除第一个
				scaleCross.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}

			//长串匹配
			let scaleMatchLength = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleMatchLength);
			scaleMatchLength = scaleMatchLength.groupBy((a,b)=>{
				let av = a.value;
				let bv = b.value;

				return isEqual(a.condition, b.condition) &&
				isEqual(a.attrs, b.attrs) &&
				isEqual(a.types, b.types) &&
				av.min === bv.min &&
				av.max === bv.max &&
				(av.matchAll === bv.matchAll || av.attrs.length <= 1) && isEqual(av.attrs, bv.attrs)
				;
			});
			for (let group of scaleMatchLength)
			{
				if (group.length > 1)
				{ //把后面的全都合并到第一个
					group.reduce((pre,cur)=>{
						combinePowerUp(pre, cur);
						return pre
					});
					group.shift(); //从筛选中去除第一个
					group.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
				}
			}
			
			//多串匹配
			let scaleMatchAttrs = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleMatchAttrs);	
			scaleMatchAttrs = scaleMatchAttrs.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max &&
				isEqual(v0.matches, v1.matches)
				;
			});

			if (scaleMatchAttrs.length > 1)
			{ //把后面的全都合并到第一个
				scaleMatchAttrs.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleMatchAttrs.shift(); //从筛选中去除第一个
				scaleMatchAttrs.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//多色匹配
			let scaleAttributes = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleAttributes);	
			scaleAttributes = scaleAttributes.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max &&
				isEqual(v0.attrs, v1.attrs)
				;
			});

			if (scaleAttributes.length > 1)
			{ //把后面的全都合并到第一个
				scaleAttributes.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleAttributes.shift(); //从筛选中去除第一个
				scaleAttributes.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//连击数
			let scaleCombos = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.ScaleCombos);	
			scaleCombos = scaleCombos.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				let v0 = s0.value;
				let v1 = skill.value;
				return isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types) &&
				v0.min === v1.min &&
				v0.max === v1.max
				;
			});

			if (scaleCombos.length > 1)
			{ //把后面的全都合并到第一个
				scaleCombos.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				scaleCombos.shift(); //从筛选中去除第一个
				scaleCombos.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
			
			//普通倍率
			let multiplier = skillPowerUp.filter(skill=>skill.value.kind === SkillPowerUpKind.Multiplier
				&& skill.condition?.LShape);	
		
			multiplier = multiplier.filter((skill,idx,arr)=>{
				let s0 = arr[0];
				return !!skill.condition && isEqual(skill.condition, s0.condition) &&
				isEqual(skill.attrs, s0.attrs) &&
				isEqual(skill.types, s0.types)
				;
			});

			if (multiplier.length)
			{ //把后面的全都合并到第一个
				multiplier.reduce((pre,cur)=>{
					combinePowerUp(pre, cur);
					return pre
				});
				multiplier.shift(); //从筛选中去除第一个
				multiplier.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
			}
		}
		let changeOrbs = skills.filter(skill=>skill.kind == SkillKinds.ChangeOrbs);
		if (changeOrbs.length>1)
		{ //把后面的全都合并到第一个
			changeOrbs.reduce((pre,cur)=>{
				pre.changes.push(...cur.changes);
				return pre
			});
			changeOrbs.shift(); //从筛选中去除第一个
			changeOrbs.forEach(skill=>skills.splice(skills.indexOf(skill),1)); //去掉所有后面的
		}
		return skills;
	}
	const skill = Skills[skillId];
	if (!skill) return [];
	//此处用apply将这个parser传递到后面解析函数的this里，用于递归解析
	const result = skillObjectParsers?.[skill.type]?.apply({ parser: skillParser }, skill.params) 
		?? { kind: SkillKinds.Unknown }; //没有时返回未知技能
	let skills = (Array.isArray(result) ? result : [result]) //确保技能是数组
		.filter(Boolean) //去除无效技能
		.map(s => ({ id: skillId, type: skill.type, params: skill.params, ...s })); //额外增加技能id、type、原始参数

	function splitProvisoSkill(skills)
	{
		let idx = skills.findIndex(skill=>skill.kind == SkillKinds.SkillProviso); //搜索HP、层数限制技能的位置
		if (idx>=0) //如果找到，就拆分成3份
		{
			return [
				skills.slice(0,idx),
				skills.slice(idx, idx+1),
				skills.slice(idx+1),
			];
		}else
		{
			return [skills];
		}
	}
	//技能原始对象的合并，技能显示效果的合并在“function renderSkillEntry”里
	if (merge_skill)
	{
		//将技能拆分成3部分后分别合并技能
		let skillsSplit = splitProvisoSkill(skills).map(_skills=>merge(_skills));
		//再展平，重新回到一层技能
		skills = skillsSplit.flat(1);
	}
	
	return skills;
}

const v = {
	percent: function(value) {
		return { kind: SkillValueKind.Percent, value: (value / 100) ?? 1 };
	},
	constant: function(value) {
		return { kind: SkillValueKind.Constant, value: value ?? 0 };
	},
	constantTo: function(value) {
		return { kind: SkillValueKind.ConstantTo, value: value ?? 1 };
	},
	xMaxHP: function(value) {
		return { kind: SkillValueKind.xMaxHP, value: (value / 100) ?? 1 };
	},
	xHP: function(value) {
		return { kind: SkillValueKind.xHP, value: (value / 100) ?? 1 };
	},
	xCHP: function(value) {
		return { kind: SkillValueKind.xCHP, value: (value / 100) ?? 1 };
	},
	xShield: function(value) {
		return { kind: SkillValueKind.xShield, value: (value / 100) ?? 1 };
	},
	xATK: function(value) {
		return { kind: SkillValueKind.xATK, value: (value / 100) ?? 1 };
	},
	xRCV: function(value) {
		return { kind: SkillValueKind.xRCV, value: (value / 100) ?? 1 };
	},
	randomATK: function(min, max) {
		return { kind: SkillValueKind.RandomATK, min: (min / 100) ?? 1, max: (max / 100) ?? 1, scale: 1 };
	},
	hpScale: function(min, max, scale) {
		return { kind: SkillValueKind.HPScale, min: (min / 100) ?? 1, max: (max / 100) ?? 1, scale: (scale / 100) ?? 1 };
	},
	xTeamHP: function(value) {
		return { kind: SkillValueKind.xTeamHP, value: (value / 100) ?? 1 };
	},
	xTeamATK: function(attrs, value) {
		return { kind: SkillValueKind.xTeamATK, attrs: attrs, value: (value / 100) ?? 1 };
	},
	xTeamRCV: function(value) {
		return { kind: SkillValueKind.xTeamRCV, value: (value / 100) ?? 1 };
	},
	percentAwakenings: function(awakenings, value) {
		return { kind: SkillValueKind.xAwakenings, awakenings: awakenings, value: value };
	},
};

const c = {
	hp: function (min, max) {
		return { hp: { min: min / 100, max: max / 100 } };
	},
	exact: function (type, value, attrs, multiple = false) {
		if (attrs === void 0) { attrs = Attributes.all; }
		return { exact: { type: type, value: value, attrs: attrs, multiple: multiple} };
	},
	combos: function (min) {
		return { combos: { min } };
	},
	attrs: function (attrs, min) {
		return { attrs: { attrs, min} };
	},
	compo: function (type, ids) {
		return { compo: { type: type, ids: ids } };
	},
	remainOrbs: function (count) { return { remainOrbs: { count: count } }; },
	useSkill: function (times = 1) { return { useSkill: times }; },
	multiplayer: function () { return { multiplayer: true }; },
	prob: function (percent) { return { prob: percent }; },
	LShape: function (attrs) { return { LShape: { attrs } }; },
	heal: function (min) { return { heal: { min } }; },
	stage: function (min=0, max=0) {
		return { stage: { min, max } };
	},
	remainAttrOrbs: function (attrs, min, max) {
		return { remainAttrOrbs: { attrs, min, max} };
	},
	awakeningActivated: function (awakenings) { return { awakeningActivated: { awakenings } }; },
	stateIsActive: function (type, indexes) {
		return { stateIsActive: { type, indexes } };
	},
	enemyAttr: function (attrs) { return { enemyAttr: { attrs } }; },
}

const p = {
	mul: function (values) {
		if (Array.isArray(values)) {
			return {
				kind: SkillPowerUpKind.Multiplier,
				hp: 1,
				atk: values[0] / 100,
				rcv: values[1] / 100
			};
		}
		else {
			return {
				kind: SkillPowerUpKind.Multiplier,
				hp: (values.hp ?? 100) / 100,
				atk: (values.atk ?? 100) / 100,
				rcv: (values.rcv ?? 100) / 100
			};
		}
	},
	stats: function (value) {
		let statTypes = Array.from(arguments).slice(1);
		return [
			statTypes.indexOf(1) >= 0 ? value : 100,
			statTypes.indexOf(2) >= 0 ? value : 100
		];
	},
	scale: function (min, max, baseMul, bonusMul) {
		return {
			min: min,
			max: max ?? min,
			baseAtk: (baseMul[0] / 100) ?? 1,
			baseRcv: (baseMul[1] / 100) ?? 1,
			bonusAtk: (bonusMul[0] / 100) ?? 0,
			bonusRcv: (bonusMul[1] / 100) ?? 0
		};
	},
	scaleAttrs: function (attrs, min, max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleAttributes, attrs: attrs ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleCombos: function (min, max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleCombos ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleMatchLength: function (attrs, min, max, baseMul, bonusMul, matchAll = false) {
		return { kind: SkillPowerUpKind.ScaleMatchLength, attrs, matchAll,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleMatchAttrs: function (matches, min, max, baseMul, bonusMul) {
		const flatMatches = matches.flat(); //当匹配的全是不同颜色时，切换成匹配颜色的技能
		if (new Set(flatMatches).size === flatMatches.length)
			return this.scaleAttrs(matches, min, max, baseMul, bonusMul);
		else
			return { kind: SkillPowerUpKind.ScaleMatchAttrs, matches: matches ,...this.scale(min, max, baseMul, bonusMul) };
	},
	scaleCross: function (crosses) {
		return { kind: SkillPowerUpKind.ScaleCross, crosses: crosses.map(cross => ({ ...cross, atk: ((cross.atk ?? 100) / 100), rcv: ((cross.rcv ?? 100) / 100)})) };
	},
	scaleRemainOrbs: function (max, baseMul, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleRemainOrbs ,...this.scale(bonusMul ? 0 : max, max, baseMul, bonusMul) };
	},
	scaleStateKind: function (awakenings, attrs, types, value) {
		return { kind: SkillPowerUpKind.ScaleStateKind, awakenings: awakenings, attrs: attrs, types: types, value: value };
	},
	scaleMatchLengthTimes: function (attrs, min, exact, bonusMul) {
		return { kind: SkillPowerUpKind.ScaleMatchLengthTimes, attrs, min, exact, bonusMul };
	},
}

function activeTurns(turns, ...skills) {
	return skills.length ? { kind: SkillKinds.ActiveTurns, turns, skills } : null;
}
function delayActiveTurns(turns, ...skills) {
	return skills.length ? { kind: SkillKinds.DelayActiveTurns, turns, skills } : null;
}
function damageEnemy(target, attr, damage) {
	return { kind: SkillKinds.DamageEnemy, target, attr, damage };
}
function vampire(attr, damageValue, healValue) {
	return { kind: SkillKinds.Vampire, attr: attr, damage: damageValue, heal: healValue };
}
function reduceDamage(attrs, percent, condition, prob) {
	return { kind: SkillKinds.ReduceDamage, attrs: attrs, percent: percent, condition: condition, prob: prob || 1 };
}
function selfHarm(value) {
	return { kind: SkillKinds.SelfHarm, value: value };
}
function heal(value) {
	return { kind: SkillKinds.Heal, value: value };
}
function autoHealBuff(value) {
	return { kind: SkillKinds.AutoHealBuff, value: value };
}
function fromTo(from, to) {
	return { from: from, to: to };
}
function changeOrbs(...changes) {
	return { kind: SkillKinds.ChangeOrbs, changes: changes };
}
function generateOrbs(orbs, exclude, count, time) {
	return { kind: SkillKinds.GenerateOrbs, orbs: orbs, exclude: exclude, count: count, time: time};
}
function fixedOrbs(...generates) {
	return { kind: SkillKinds.FixedOrbs, generates: generates };
}
function powerUp(attrs, types, value, condition = null, reduceDamage = null, additional = [], eachTime = false) {
	let targets = attrs?.targets;
	if (targets) {attrs = null; types = null;}
	return { kind: SkillKinds.PowerUp, targets, attrs, types, condition, value, reduceDamage, additional, eachTime};
}
function slotPowerUp(value, targets) {
	return { kind: SkillKinds.SlotPowerUp, value, targets};
}
function counterAttack(attr, prob, value) {
	return { kind: SkillKinds.CounterAttack, attr: attr, prob: prob, value: value };
}
function setOrbState(orbs, state, arg) {
	return { kind: SkillKinds.SetOrbState, orbs, state, arg};
}
function rateMultiply(value, rate) {
	return { kind: SkillKinds.RateMultiply, value: value, rate: rate };
}
function orbDropIncrease(prob, attrs, flag, value) {
	return { kind: SkillKinds.OrbDropIncrease, prob, attrs, flag, value };
}
function resolve(min, max) {
	return { kind: SkillKinds.Resolve, min: min, max: max };
}
function unbind(normal, awakenings, matches) {
	return { kind: SkillKinds.Unbind, normal: normal, awakenings: awakenings , matches: matches};
}
function bindSkill() { return { kind: SkillKinds.BindSkill}; }
function bindCard() { return { kind: SkillKinds.BindCard}; }
function boardChange(attrs) {
	return { kind: SkillKinds.BoardChange, attrs: attrs };
}
function randomSkills(skills) {
	return { kind: SkillKinds.RandomSkills, skills: skills };
}
function evolvedSkills(loop, skills) {
	return { kind: SkillKinds.EvolvedSkills, loop: loop, skills: skills };
}
function changeAttr(attr, targets) {
	return { kind: SkillKinds.ChangeAttribute, attr, targets };
}
function gravity(value, target = "all", isPartGravity = false) {
	return { kind: isPartGravity ? SkillKinds.PartGravity : SkillKinds.Gravity,
		value,
		target
	};
}
function voidEnemyBuff(buffs) {
	if (!Array.isArray(buffs)) buffs = [buffs];
	return { kind: SkillKinds.VoidEnemyBuff, buffs: buffs };
}
function voidFieldBuff(buffs) {
	if (!Array.isArray(buffs)) buffs = [buffs];
	return { kind: SkillKinds.VoidFieldBuff, buffs: buffs };
}
function skillBoost(value1, value2) { return { kind: SkillKinds.SkillBoost, min: value1, max: value2 ?? value1 }; }
function minMatch(value) { return { kind: SkillKinds.MinMatchLength, value: value }; }
function fixedTime(value) { return { kind: SkillKinds.FixedTime, value: v.constant(value) }; }
function addCombo(value) { return { kind: SkillKinds.AddCombo, value: value }; }
function defBreak(value) { return { kind: SkillKinds.DefenseBreak, value: value }; }
function analyze(value) { return { kind: SkillKinds.Analyze, value: value }; }
function poison(value) { return { kind: SkillKinds.Poison, value: value }; }
function CTW(time, cond, skill) {
	return { kind: SkillKinds.CTW, time, cond, skill };
}
function followAttack(value) { return { kind: SkillKinds.FollowAttack, value: value }; }
function followAttackFixed(value) { return { kind: SkillKinds.FollowAttackFixed, value: v.constant(value) }; }
function autoHeal(value) { return { kind: SkillKinds.AutoHeal, value: value }; }
function timeExtend(value) { return { kind: SkillKinds.TimeExtend, value: value }; }
function delay() { return { kind: SkillKinds.Delay }; }
function massAttack() { return { kind: SkillKinds.MassAttack }; }
function dropRefresh() { return { kind: SkillKinds.DropRefresh }; }
function drum() { return { kind: SkillKinds.Drum }; }
function autoPath(number) { return { kind: SkillKinds.AutoPath, matchesNumber:v.constant(number) }; }
function leaderChange(type = 0) { return { kind: SkillKinds.LeaderChange, type: type }; }
function noSkyfall() { return { kind: SkillKinds.NoSkyfall }; }
function henshin(id, random = false) {
	return {
		kind: SkillKinds.Henshin,
		id: Array.isArray(id) ? id[0] : id, //兼容旧程序
		ids: Array.isArray(id) ? id : [id],
		random: random
	};
}
function skillPlayVoice(skillStage, VoiceId) {
	return { kind: SkillKinds.PlayVoice, stage: skillStage, id: VoiceId };
}
function voidPoison() { return { kind: SkillKinds.VoidPoison }; }
function skillProviso(cond) { return { kind: SkillKinds.SkillProviso, cond: cond }; }
function impartAwakenings(attrs, types, target, awakenings) {
	return { kind: SkillKinds.ImpartAwakenings, attrs, types, target, awakenings };
}
function obstructOpponent(typeName, pos, ids) {
	return { kind: SkillKinds.ObstructOpponent, typeName: typeName, pos: pos, enemy_skills: ids };
}
function increaseDamageCapacity(cap, targets, attrs, types) {
	return { kind: SkillKinds.IncreaseDamageCapacity, cap, targets, attrs, types};
}
function boardJammingStates(state, posType, options) {
	return { kind: SkillKinds.BoardJammingStates, state: state, posType: posType, ...options};
}
function boardSizeChange(width=7, height=6) {
	return { kind: SkillKinds.BoardSizeChange, width, height };
}
function removeAssist() {
	return { kind: SkillKinds.RemoveAssist };
}
function predictionFalling() {
	return { kind: SkillKinds.PredictionFalling };
}
function breakingShield(value) {
	return { kind: SkillKinds.BreakingShield, value };
}
function timesLimit(turns) {
	return { kind: SkillKinds.TimesLimit, turns };
}
function fixedStartingPosition() {
	return { kind: SkillKinds.FixedStartingPosition };
}
function destroyOrb(attrs) {
	return { kind: SkillKinds.DestroyOrb, attrs };
}

const skillObjectParsers = {
	//parser: (() => []), //这个用来解决代码提示的报错问题，不起实际作用
  
	[0](attr, mul) { return damageEnemy('all', attr, v.xATK(mul)); },
	[1](attr, value) { return damageEnemy('all', attr, v.constant(value)); },
	[2](mul, _) { return damageEnemy('single', 'self', v.xATK(mul)); },
	[3](turns, percent) { return activeTurns(turns, reduceDamage('all', v.percent(percent))); },
	[4](mul) { return poison(v.xATK(mul)); },
	[5](time) { return CTW(v.constant(time)); },
	[6](percent) { return gravity(v.xCHP(percent)); },
	[7](mul) { return heal(v.xRCV(mul)); },
	[8](value) { return heal(v.constant(value)); },
	[9](from, to) { return changeOrbs(fromTo([from ?? 0], [to ?? 0])); },
	[10]() { return dropRefresh(); },
	[11](attr, mul) { return powerUp([attr], null, p.mul({ atk: mul })); },
	[12](mul) { return followAttack(v.xATK(mul)); },
	[13](mul) { return autoHeal(v.xRCV(mul)); },
	[14](min, max) { return resolve(v.percent(min), v.percent(max ?? 100)); },
	[15](time) { return timeExtend(v.constant(time / 100)); },
	[16](percent) { return reduceDamage('all', v.percent(percent)); },
	[17](attr, percent) { return reduceDamage([attr], v.percent(percent)); },
	[18](turns) { return activeTurns(turns, delay()); },
	//破防
	[19](turns, percent) { return activeTurns(turns, defBreak(v.percent(percent))); },
	[20](from1, to1, from2, to2) { 
		if ((to1 ?? 0) == (to2 ?? 0))
			return changeOrbs(fromTo([from1 ?? 0, from2 ?? 0], [to1 ?? 0]));
		else
			return changeOrbs(
				fromTo([from1 ?? 0], [to1 ?? 0]),
				fromTo([from2 ?? 0], [to2 ?? 0])
			);
	},
	[21](turns, attr, percent) { return activeTurns(turns, reduceDamage([attr], v.percent(percent))); },
	[22](type, mul) { return powerUp(null, [type], p.mul({ atk: mul })); },
	[23](type, mul) { return powerUp(null, [type], p.mul({ hp: mul })); },
	[24](type, mul) { return powerUp(null, [type], p.mul({ rcv: mul })); },
  
	[26](mul) { return powerUp(null, null, p.mul({ atk: mul })); },
  
	[28](attr, mul) { return powerUp([attr], null, p.mul({ atk: mul, rcv: mul })); },
	[29](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[30](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ hp: mul })); },
	[31](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ atk: mul })); },
  
	[33]() { return drum(); },
  
	[35](mul, percent) { return vampire('self', v.xATK(mul), v.percent(percent)); },
	[36](attr1, attr2, percent) { return reduceDamage([attr1, attr2], v.percent(percent)); },
	[37](attr, mul) { return damageEnemy('single', attr, v.xATK(mul)); },
	[38](max, prob, percent) { return reduceDamage('all', v.percent(percent), max === 100 ? c.hp(max, max) : c.hp(0, max), v.percent(prob)); },
	[39](percent, stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[40](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ atk: mul })); },
	[41](prob, mul, attr) { return counterAttack(attr ?? 0, v.percent(prob), v.percent(mul)); },
	[42](targetAttr, dmgAttr, value) { return damageEnemy(targetAttr, dmgAttr, v.constant(value)); },
	[43](min, prob, percent) { return reduceDamage('all', v.percent(percent), c.hp(min, 100), v.percent(prob)); },
	[44](percent, stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[45](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, atk: mul })); },
	[46](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul })); },
  
	[48](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul })); },
	[49](attr, mul) { return powerUp([attr], null, p.mul({ rcv: mul })); },
	[50](turns, attr, mul) { return activeTurns(turns, powerUp([attr], null, p.mul({ atk: mul ?? 0  }))); },
	[51](turns) { return activeTurns(turns, massAttack()); },
	[52](attr, mul) { return setOrbState([attr], 'enhanced', {enhance: v.percent(mul)}); },
	[53](mul) { return rateMultiply(v.percent(mul), 'drop'); },
	[54](mul) { return rateMultiply(v.percent(mul), 'coin'); },
	[55](value) { return damageEnemy('single', 'fixed', v.constant(value)); },
	[56](value) { return damageEnemy('all', 'fixed', v.constant(value)); },
  
	[58](attr, min, max) { return damageEnemy('all', attr, v.randomATK(min, max)); },
	[59](attr, min, max) { return damageEnemy('single', attr, v.randomATK(min, max)); },
	[60](turns, mul, attr) { return activeTurns(turns, counterAttack(attr, v.percent(100), v.percent(mul))); },
	[61](attrs, min, base, bonus, stage) { return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min + (stage ?? 0), [base, 100], [bonus, 0])); },
	[62](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, atk: mul })); },
	[63](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, rcv: mul })); },
	[64](type, mul) { return powerUp(null, [type], p.mul({ atk: mul, rcv: mul })); },
	[65](type, mul) { return powerUp(null, [type], p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[66](combo, mul) { return powerUp(null, null, p.scaleCombos(combo, combo, [mul, 100], [0, 0])); },
	[67](attr, mul) { return powerUp([attr], null, p.mul({ hp: mul, rcv: mul })); },
  
	[69](attr, type, mul) { return powerUp([attr], [type], p.mul({ atk: mul })); },
  
	[71](...attrs) { return boardChange(attrs.filter(attr => attr >= 0)); },
	//据说是破除敌人的守护盾，但是因为重来没有实装过，所以不知道实际效果
	[72](turns) { return activeTurns(turns, voidEnemyBuff(['guard'])); },
	[73](attr, type, mul) { return powerUp([attr], [type], p.mul({ hp: mul, atk: mul })); },
  
	[75](attr, type, mul) { return powerUp([attr], [type], p.mul({ atk: mul, rcv: mul })); },
	[76](attr, type, mul) { return powerUp([attr], [type], p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[77](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ hp: mul, atk: mul })); },
  
	[79](type1, type2, mul) { return powerUp(null, [type1, type2], p.mul({ atk: mul, rcv: mul })); },
  
	[84](attr, min, max, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('single', attr, v.randomATK(min, max))
		];
	},
	[85](attr, min, max, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('all', attr, v.randomATK(min, max))
		];
	},
	[86](attr, value, _, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('single', attr, v.constant(value))
		];
	},
	[87](attr, value, _, percent) {
		return [
			selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1)),
			damageEnemy('all', attr, v.constant(value))
		];
	},
	[88](turns, type, mul) { return activeTurns(turns, powerUp(null, [type], p.mul({ atk: mul }))); },
  
	[90](turns, attr1, attr2, mul) { return activeTurns(turns, powerUp([attr1, attr2], null, p.mul({ atk: mul }))); },
	[91](attr1, attr2, mul) { return setOrbState([attr1, attr2], 'enhanced', {enhance: v.percent(mul)}); },
	[92](turns, type1, type2, mul) { return activeTurns(turns, powerUp(null, [type1, type2], p.mul({ atk: mul }))); },
	[93]() { return leaderChange(); },
	[94](percent, attr, stats1, stats2, mul) { return powerUp([attr], null, p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[95](percent, type, stats1, stats2, mul) { return powerUp(null, [type], p.mul(p.stats(mul, stats1, stats2)), c.hp(0, percent)); },
	[96](percent, attr, stats1, stats2, mul) { return powerUp([attr], null, p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[97](percent, type, stats1, stats2, mul) { return powerUp(null, [type], p.mul(p.stats(mul, stats1, stats2)), c.hp(percent, 100)); },
	[98](min, base, bonus, max) { return powerUp(null, null, p.scaleCombos(min, max, [base, 100], [bonus, 0])); },
  
	[100](stats1, stats2, mul) { return powerUp(null, null, p.mul(p.stats(mul, stats1, stats2)), c.useSkill()); },
	[101](combo, mul) { return powerUp(null, null, p.mul({ atk: mul }), c.exact('combo', combo)); },
  
	[103](combo, stats1, stats2, mul) { return powerUp(null, null, p.scaleCombos(combo, combo, p.stats(mul, stats1, stats2), [0, 0])); },
	[104](combo, attrs, stats1, stats2, mul) { return powerUp(Bin.unflags(attrs), null, p.scaleCombos(combo, combo, p.stats(mul, stats1, stats2), [0, 0])); },
	[105](rcv, atk) { return powerUp(null, null, p.mul({ rcv, atk })); },
	[106](hp, atk) { return powerUp(null, null, p.mul({ hp, atk })); },
	[107](hp, attrs, atk) {
		return [
			powerUp(null, null, p.mul({ hp })),
			attrs && powerUp(Bin.unflags(attrs), null, p.mul({ atk: atk ?? 100 })) || null,
		].filter(Boolean);
	},
	[108](hp, type, atk) { return [powerUp(null, null, p.mul({ hp })), powerUp(null, [type], p.mul({ atk }))]; },
	[109](attrs, len, mul) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul, 100], [0, 0])); },
	[110](single, attr, min, max, scale) { return damageEnemy(single ? 'single' : 'all', attr, v.hpScale(min, max, scale)); },
	[111](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul, atk: mul })); },
  
	[114](attr1, attr2, mul) { return powerUp([attr1, attr2], null, p.mul({ hp: mul, atk: mul, rcv: mul })); },
	[115](attr, mul, percent) { return vampire(attr, v.xATK(mul), v.percent(percent)); },
	[116](...ids) { return ids.flatMap(id => this.parser(id)); },
	[117](bind, rcv, constant, hp, awokenBind) {
	  return [
		rcv ? heal(v.xRCV(rcv)) : hp ? heal(v.xMaxHP(hp)) : constant ? heal(v.constant(constant)) : null,
		(bind || awokenBind) ? unbind(bind ?? 0, awokenBind ?? 0) : null,
	  ].filter(Boolean);
	},
	[118](...ids) { return randomSkills(ids.map(id => this.parser(id))); },
	[119](attrs, min, base, bonus, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [base || 100, 100], [bonus, 0])); },
  
	[121](attrs, types, hp, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })); },
	[122](percent, attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(0, percent)); },
	[123](percent, attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(percent, 100)); },
	[124](attrs1, attrs2, attrs3, attrs4, attrs5, min, mul, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4, attrs5].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, bonus ? attrs.length : min, [mul, 100], [bonus, 0]));
	},
	[125](mon1, mon2, mon3, mon4, mon5, hp, atk, rcv) { return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('card', [mon1, mon2, mon3, mon4, mon5].filter(Boolean))); },
	[126](attrs, turns, turns2, percent) { return activeTurns(turns === turns2 ? turns : [turns, turns2], orbDropIncrease(v.percent(percent), Bin.unflags(attrs))); },
	[127](...params) { //cols1, attrs1, cols2, attrs2 ...
		const generates = [];
		for (let i = 0; i < params.length; i+=2) {
			generates.push({
				orbs: Bin.unflags(params[i+1]),
				type: 'col',
				positions: Bin.unflags(params[i])
			});
		}
		return fixedOrbs.apply(null, generates);
	},
	[128](...params) { //rows1, attrs1, rows2, attrs2 ...
		const generates = [];
		for (let i = 0; i < params.length; i+=2) {
			generates.push({
				orbs: Bin.unflags(params[i+1]),
				type: 'row',
				positions: Bin.unflags(params[i])
			});
		}
		return fixedOrbs.apply(null, generates);
	},
	[129](attrs, types, hp, atk, rcv, rAttrs, rPercent) {
		return [
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent)) || null
		].filter(Boolean);
	},
	[130](percent, attrs, types, atk, rcv, rAttrs, rPercent) {
		return [
			(atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(0, percent)) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent), c.hp(0, percent)) || null
		].filter(Boolean);
	},
	[131](percent, attrs, types, atk, rcv, rAttrs, rPercent) {
		return [
			(atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.hp(percent, 100)) || null,
			rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent), c.hp(percent, 100)) || null
		].filter(Boolean);
	},
	[132](turns, time, percent) { return activeTurns(turns, timeExtend(time ? v.constant(time / 10) : v.percent(percent))); },
	[133](attrs, types, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.useSkill()); },
	[136](attrs1, hp1, atk1, rcv1, attrs2, hp2, atk2, rcv2) {
		return [
			powerUp(Bin.unflags(attrs1), null, p.mul({ hp: hp1 || 100, atk: atk1 || 100, rcv: rcv1 || 100 })),
			powerUp(Bin.unflags(attrs2), null, p.mul({ hp: hp2 || 100, atk: atk2 || 100, rcv: rcv2 || 100 })),
		];
	},
	[137](types1, hp1, atk1, rcv1, types2, hp2, atk2, rcv2) {
		return [
			powerUp(null, Bin.unflags(types1), p.mul({ hp: hp1 || 100, atk: atk1 || 100, rcv: rcv1 || 100 })),
			powerUp(null, Bin.unflags(types2), p.mul({ hp: hp2 || 100, atk: atk2 || 100, rcv: rcv2 || 100 })),
		];
	},
	[138](...ids) { return ids.flatMap(id => this.parser(id)); },
	[139](attrs, types, percent1, less1, mul1, percent2, less2, mul2) {
		return [
			powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: mul1 || 100 }), less1 ? c.hp(0, percent1) : c.hp(percent1, 100)),
			powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: mul2 || 100 }), less1 ?
				(less2 ? c.hp(percent1, percent2) : c.hp(percent2, 100)) :
				(less2 ? c.hp(0, percent2) : c.hp(percent2, percent1 - 1))
			),
		];
	},
	[140](attrs, mul) { return setOrbState(Bin.unflags(attrs), 'enhanced', {enhance: v.percent(mul)}); },
	[141](count, to, exclude) { return generateOrbs(Bin.unflags(to), Bin.unflags(exclude), count); },
	[142](turns, attr) { return activeTurns(turns, changeAttr(attr, ['self'])); },
  
	[143](mul, dmgAttr) { return damageEnemy('all', dmgAttr ?? 0, v.xTeamHP(mul)); },

	[144](teamAttrs, mul, single, dmgAttr) { return damageEnemy(single ? 'single' : 'all', dmgAttr ?? 0, v.xTeamATK(Bin.unflags(teamAttrs), mul)); },
	[145](mul) { return heal(v.xTeamRCV(mul)); },
	[146](turns1, turns2) { return skillBoost(v.constant(turns1), turns2 ? v.constant(turns2) : undefined); },
  
	[148](percent) { return rateMultiply(v.percent(percent), 'exp'); },
	[149](mul) { return powerUp(null, null, p.mul({ rcv: mul }), c.exact('match-length', 4, [Attributes.Heart])); },
	[150](_, mul) { return powerUp({targets: ['the-attr']}, null, p.mul({ atk: mul }), c.exact('match-length', 5, 'enhanced')); },
	[151](mul1, mul2, percent) {
		return powerUp(null, null, p.scaleCross([{ single: true, attr: [Attributes.Heart], atk: mul1 || 100, rcv: mul2 || 100 }]), null, v.percent(percent));
	},
	[152](attrs, count) { return setOrbState(Bin.unflags(attrs), 'locked', {count: v.constant(count)}); },
	[153](attr, _) { return changeAttr(attr, ['enemy_all']); },
	[154](from, to) { return changeOrbs(fromTo(Bin.unflags(from), Bin.unflags(to))); },
	[155](attrs, types, hp, atk, rcv) { return powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.multiplayer()); },
	[156](turns, awoken1, awoken2, awoken3, type, mul) {
		if (type == 1)
		{
			return heal(v.percentAwakenings([awoken1, awoken2, awoken3].filter(Boolean), v.xRCV(mul)));
		}else
		{
			return activeTurns(turns, type === 2 ?
				powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3].filter(Boolean), null, null, p.mul({atk: mul - 100, hp:0, rcv:0}))) :
				reduceDamage('all', v.percentAwakenings([awoken1, awoken2, awoken3].filter(Boolean), v.percent(mul)))
			);
		}
	},
	[157](attr1, mul1, attr2, mul2, attr3, mul3) {
		let crosses = [
			{ single: false, attr: [attr1], atk: mul1 },
			{ single: false, attr: [attr2], atk: mul2 },
			{ single: false, attr: [attr3], atk: mul3 }
		].filter(cross => cross.atk);
	  	return powerUp(null, null, p.scaleCross(crosses));
	},
	[158](len, attrs, types, atk, hp, rcv) {
	  return [
		minMatch(len),
		powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }))
	  ];
	},
	[159](attrs, min, base, bonus, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [base, 100], [bonus, 0])); },
	[160](turns, combo) { return activeTurns(turns, addCombo(combo)); },
	[161](percent) { return gravity(v.xMaxHP(percent)); },
	[162]() { return boardSizeChange(); },
	[163](attrs, types, hp, atk, rcv, rAttrs, rPercent) {
	  return [
		noSkyfall(),
		(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
		rPercent && reduceDamage(Bin.unflags(rAttrs), v.percent(rPercent)) || null,
	  ].filter(Boolean);
	},
	[164](attrs1, attrs2, attrs3, attrs4, min, atk, rcv, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, attrs.length, [atk, rcv], [bonus, bonus]));
	},
	[165](attrs, min, baseAtk, baseRcv, bonusAtk, bonusRcv, incr) {
		const attrsArr = Bin.unflags(attrs);
		return powerUp(null, null, p.scaleAttrs(attrsArr, min, min + (min < attrsArr.length ? (incr ?? 0) : 0), [baseAtk || 100, baseRcv || 100], [bonusAtk, bonusRcv]));
	},
	[166](min, baseAtk, baseRcv, bonusAtk, bonusRcv, max) { return powerUp(null, null, p.scaleCombos(min, max, [baseAtk, baseRcv], [bonusAtk, bonusRcv])); },
	[167](attrs, min, baseAtk, baseRcv, bonusAtk, bonusRcv, max) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), min, max, [baseAtk, baseRcv], [bonusAtk, bonusRcv])); },
	[168](turns, awoken1, awoken2, awoken3, awoken4, awoken5, awoken6, mul) {
		return activeTurns(turns, 
			powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3, awoken4, awoken5, awoken6].filter(Boolean), null, null, p.mul({atk: mul, hp:0, rcv:0})))
		);
	},
	[169](min, base, percent, bonus, max) { return powerUp(null, null, p.scaleCombos(min, max ?? min, [base || 100, 100], [bonus, 0]), null, v.percent(percent)); },
	//stage的真实用法目前不知道，缺少样本来判断，不知道到底是直接算数(stage-1)还是算二进制个数(Bin.unflags(stage).length)。 2022年5月23日
	//按 瘦鹅 的说法，也可能是因为暗牛头限制了5色， 所以就算是3级到了6色，也只算5色。
	[170](attrs, min, base, percent, bonus, stage) {
		let attrsArr = Bin.unflags(attrs);
		return powerUp(null, null, p.scaleAttrs(attrsArr, min, Math.min(min + (stage || 0), attrsArr.length), [base, 100], [bonus ?? 0, 0]), null, v.percent(percent));
	},
	[171](attrs1, attrs2, attrs3, attrs4, min, mul, percent, bonus) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, bonus ? attrs.length : min, [mul, 100], [bonus ?? 0, 0]), null, v.percent(percent));
	},
	[172]() { return setOrbState(Attributes.orbs, 'unlocked'); },
	[173](turns, attrAbsorb, comboAbsorb, damageAbsorb) {
	  return activeTurns(turns, voidEnemyBuff(
		[
		  attrAbsorb && 'attr-absorb',
		  comboAbsorb && 'combo-absorb',
		  damageAbsorb && 'damage-absorb'
		].filter((buff) => typeof buff === 'string')
	  ));
	},
	[175](series1, series2, series3, hp, atk, rcv) { return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('series', [series1, series2, series3].filter(Boolean))); },
	[176](row1, row2, row3, row4, row5, attrs) {
		return fixedOrbs(
			{ orbs: [attrs ?? 0], type: 'shape', positions: [row1, row2, row3, row4, row5].map(Bin.unflags) }
		);
	},
	[177](attrs, types, hp, atk, rcv, remains, baseAtk, bonusAtk) {
	  return [
		noSkyfall(),
		(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
		baseAtk && powerUp(null, null, p.scaleRemainOrbs(remains, [baseAtk ?? 100, 100], [bonusAtk ?? 0, 0])) || null
	  ].filter(Boolean);
	},
	[178](time, attrs, types, hp, atk, rcv, attrs2, percent) {
		return [
			fixedTime(time),
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })),
			percent && reduceDamage(Bin.unflags(attrs2), v.percent(percent)) || null,
		].filter(Boolean);
		/*const reduceAttrs = Bin.unflags(attrs2);
		const isAllAttr = isEqual(reduceAttrs, Attributes.attr);
		return [
			fixedTime(time),
			(hp || atk || rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), null, isAllAttr ? v.percent(percent) : null),
			percent && !isAllAttr && reduceDamage(reduceAttrs, v.percent(percent)) || null,
		].filter(Boolean);*/
	},
	[179](turns, value, percent, bind, awokenBind) {
		return [
			(bind || awokenBind) ? unbind(bind ?? 0, awokenBind ?? 0) : null,
			activeTurns(turns, autoHealBuff(value ? v.constant(value) : v.xMaxHP(percent)))
		].filter(Boolean);
	},
	[180](turns, percent) { return activeTurns(turns, orbDropIncrease(v.percent(percent), [], 'enhanced')); },
  
	[182](attrs, len, mul, percent) { return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul || 100, 100], [0, 0]), null, v.percent(percent)); },
	[183](attrs, types, percent1, atk1, reduce, percent2, atk2, rcv2) {
	  return [
		(percent1 > 0) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk1 || 100 }), c.hp(percent1, 100), v.percent(reduce)) || null,
		(atk2 || rcv2) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ atk: atk2 || 100, rcv: rcv2 || 100 }), c.hp(0, percent2 || percent1)) || null
	  ].filter(Boolean);
	},
	[184](turns) { return activeTurns(turns, noSkyfall()); },
	[185](time, attrs, types, hp, atk, rcv) {
	  return [
		timeExtend(v.constant(time / 100)),
		powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })),
	  ];
	},
	[186](attrs, types, hp, atk, rcv) {
	  return [
		boardSizeChange(),
		(hp || atk ||rcv) && powerUp(Bin.unflags(attrs), Bin.unflags(types), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 })) || null,
	  ].filter(Boolean);
	},

	[188](value) {
	  return damageEnemy('single', 'fixed', v.constant(value));
	},
	[189]() {
	  return [
		setOrbState(Attributes.orbs, 'unlocked'),
		boardChange([0,1,2,3]),
		autoPath(3),
	  ];
	},
	[190](attrs, count) { return setOrbState(Bin.unflags(attrs), 'combo-drop', {count: v.constant(count)}); },

	[191](turns) {
	  return activeTurns(turns, voidEnemyBuff(['damage-void']));
	},
	[192](attrs, len, mul, combo) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [mul || 100, 100], [0, 0], true), null, null, combo ? [addCombo(combo)] : null);
	},
	[193](attrs, atk, rcv, percent) {
		return powerUp(null, null, p.mul([atk || 100, rcv || 100]), c.LShape(Bin.unflags(attrs)), v.percent(percent));
	},
	[194](attrs, min, mul, combo) {
		return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min, [mul || 100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[195](percent) {
	  return selfHarm(percent ? v.xCHP(100 - percent) : v.constantTo(1));
	},
	[196](matches) {
	  return unbind(0,0,matches);
	},
	[197]() {
	  return voidPoison();
	},
	[198](heal, atk, percent, awokenBind) {
		return powerUp(null, null, p.mul([atk || 100, 100]), c.heal(heal), percent && v.percent(percent), awokenBind && [unbind(0, awokenBind ?? 0)]);
	},
	[199](attrs, min, damage) {
		return powerUp(null, null, p.scaleAttrs(Bin.unflags(attrs), min, min, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[200](attrs, len, damage) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[201](attrs1, attrs2, attrs3, attrs4, min, damage) {
	  const attrs = [attrs1, attrs2, attrs3, attrs4].filter(Boolean);
	  return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, min, [100, 100], [0, 0]), null, null, [followAttackFixed(damage)]);
	},
	[202](id) {
		return henshin(id);
	},
	[203](evotypeid, hp, atk, rcv) {
		let evotype = (type=>{
			switch (type) {
				case 0: return "pixel-evo";
				case 2: return "reincarnation-evo";
				default: return type;
			}
		})(evotypeid);
		return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }),
		c.compo('evolution', [evotype]));
	},

	[205](attrs, turns) { return activeTurns(turns, orbDropIncrease(null, Bin.unflags(attrs == -1 ? 0b1111111111: attrs), 'locked')); },
	[206](attrs1, attrs2, attrs3, attrs4, attrs5, min, combo) {
		const attrs = [attrs1, attrs2, attrs3, attrs4, attrs5].filter(Boolean);
		return powerUp(null, null, p.scaleMatchAttrs(attrs.flatMap(Bin.unflags), min, min, [100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[207](turns, time, row1, row2, row3, row4, row5, count) {
		/*return activeTurns(turns, count ?
			generateOrbs( ['variation'], null, count, time/100):
			fixedOrbs( { orbs: ['variation'], time: time/100, type: 'shape', positions: [row1, row2, row3, row4, row5].map(row=>Bin.unflags(row)) })
		);*/
		const options = { time: time/100};
		if (count) {
			options.count = count;
		} else {
			options.positions = [row1, row2, row3, row4, row5].map(Bin.unflags);
		}
		return activeTurns(turns, 
			boardJammingStates('roulette', count ? 'random' : 'shape', options)
		);
	},
	[208](count1, to1, exclude1, count2, to2, exclude2) {
		return [
			generateOrbs(Bin.unflags(to1), Bin.unflags(exclude1), count1),
			generateOrbs(Bin.unflags(to2), Bin.unflags(exclude2), count2),
		];
	},
	[209](combo) {
		return powerUp(null, null, p.scaleCross([{ single: true, attr: [Attributes.Heart], atk: 100, rcv: 100}]), null, null, combo ? [addCombo(combo)] : null);
	},
	[210](attrs, reduce, combo) {
		return powerUp(null, null, p.scaleCross([{ single: false, attr: Bin.unflags(attrs), atk: 100, rcv: 100}]), null, v.percent(reduce), combo ? [addCombo(combo)] : null);
	},
	[213](attrs, types, ...awakenings) { //赋予觉醒的队长技
	  return impartAwakenings(Bin.unflags(attrs), Bin.unflags(types), null, awakenings);
	},
	[214](turns) { return activeTurns(turns, bindSkill()); },
	[215](turns, attrs) { return activeTurns(turns, setOrbState(Bin.unflags(attrs), 'bound')); },

	[217](rarity, hp, atk, rcv) {
		return powerUp(null, null, p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }),
		c.compo('team-total-rarity', rarity));
	},
	[218](turns) { return skillBoost(v.constant(-turns)); },

	[219](attrs, len, combo) {
		return powerUp(null, null, p.scaleMatchLength(Bin.unflags(attrs), len, len, [100, 100], [0, 0]), null, null, combo ? [addCombo(combo)] : null);
	},
	[220](attrs, combo) {
		var skill = powerUp(null, null, p.mul([100,100]), c.LShape(Bin.unflags(attrs)), null, combo ? [addCombo(combo)] : null);
		return skill;
	},
	[221](attrs, damage) {
		return powerUp(null, null, p.mul([100,100]), c.LShape(Bin.unflags(attrs)), null, damage ? [followAttackFixed(damage)] : null);
	},

	[223](combo, damage) {
		return powerUp(null, null, p.scaleCombos(combo, combo, [100, 100], [0, 0]), null, null, damage ? [followAttackFixed(damage)] : null);
	},
	[224](turns, attr) { return activeTurns(turns, changeAttr(attr, ['enemy_all'])); },
	[225](min, max) { return skillProviso(c.hp(min ?? 0, max ?? 100)); },
	[226](turns, percent) { return activeTurns(turns, orbDropIncrease(v.percent(percent), [], 'nail')); },
	[227]() { return leaderChange(1); },
	[228](turns, attrs, types, atk, rcv) {
		return activeTurns(turns,
			powerUp(null, null, p.scaleStateKind(null, Bin.unflags(attrs), Bin.unflags(types), p.mul({atk: atk, rcv: rcv ?? 0, hp:0})))
		);
	},
	[229](attrs, types, hp, atk, rcv) {
		return powerUp(null, null, p.scaleStateKind(null, Bin.unflags(attrs), Bin.unflags(types), p.mul({hp: hp || 0, atk: atk || 0, rcv: rcv || 0})));
	},
	//按位置增伤主动技1
	[230](turns, target, mul) {
		const targetTypes = SkillTarget.type1;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			slotPowerUp(p.mul({ atk: mul }), typeArr)
		);
	},
	[231](turns, awoken1, awoken2, awoken3, awoken4, awoken5, atk, rcv) {
		return activeTurns(turns, powerUp(null, null, p.scaleStateKind([awoken1, awoken2, awoken3, awoken4, awoken5].filter(Boolean), null, null, p.mul({atk: atk, hp:0, rcv: rcv ?? 0}))));
	},
	[232](...ids) { return evolvedSkills(false, ids.map(id => this.parser(id))); },
	[233](...ids) { return evolvedSkills(true, ids.map(id => this.parser(id))); },
	[234](min, max) { return skillProviso(c.stage(min ?? 0, max ?? 0)); },
	[235](attrs, lenMin, lenExact, atk, reducePercent, combo, damage, rcv) {
		// const len = lenMin || lenExact; //宝珠长度
		// const ee = Boolean(lenExact); //是否为刚好等于
		//第二个参数为多少以上就算，第三个参数为多少以上才算
		//return powerUp(null, null, p.mul({ atk: atk || 100}), c.exact('match-length', lenExact, Bin.unflags(attr)), v.percent(percent), [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean), true);
		//let powerup, condition;
		let powerup = Boolean(lenMin)
			? p.scaleMatchLength(Bin.unflags(attrs), lenMin, lenMin, [atk || 100, rcv || 100], [0, 0])
			: p.mul({ atk: atk || 100});
		let condition = Boolean(lenExact)
			? c.exact('match-length', lenExact, Bin.unflags(attrs))
			: null;
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		const eachTime = true;
		return powerUp(null, null, powerup, condition, v.percent(reducePercent), additional, eachTime);
	},
	[236](...ids) { //随机变身
		return henshin(ids.distinct(), true);
	},
	[237](turns, hp) { //改变HP上限
		return activeTurns(turns,
			powerUp(null, null, p.mul({ hp: hp }))
		);
	},
	[238](turns, width, height, pos1, pos2) { //产云
		return activeTurns(turns,
			boardJammingStates('clouds', (pos1 && pos2) ? 'fixed' : 'random', { size: [width, height], positions: [pos1, pos2] })
		);
	},
	[239](colum, turns, row) { //产封条
		//const colums = Bin.unflags(colum), rows = Bin.unflags(row);
		return activeTurns(turns,
			boardJammingStates('immobility', 'fixed', { positions: {colums: Bin.unflags(colum), rows: Bin.unflags(row)} })
		);
	},
	[241](turns, cap) { //改变伤害上限主动技
		// const targetTypes = SkillTarget.type1;
		// const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, ["self"])
		);
	},
	[243](turns, attrs, hpPercent, probPercent) { //掉落荆棘珠
		return activeTurns(turns, orbDropIncrease(v.percent(probPercent), Bin.unflags(attrs), 'thorn', v.xMaxHP(hpPercent)));
	},
	[244](turns, type) { //改变板面大小主动技
		let width, height;
		switch (type) {
			case 1: {
				width = 7;
				height = 6;
				break;
			}
			case 2: {
				width = 5;
				height = 4;
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
		return activeTurns(turns, boardSizeChange(width, height));
	},
	[245](rarity, _2, _3, hp, atk, rcv) { //全员满足某种情况，现在是全部星级不一样
 		return powerUp(Bin.unflags(_2), Bin.unflags(_3), p.mul({ hp: hp || 100, atk: atk || 100, rcv: rcv || 100 }), c.compo('team-same-rarity', rarity)); 
	},
	[246](time, combo, cap) { //限定时间内转出多少C提高伤害上限
 		return CTW(v.constant(time), c.combos(combo) , increaseDamageCapacity(cap * 1e8, ["self"]));
	},
	[247](time, attr, min, cap) { //限定时间内转出多少色提高伤害上限
 		return CTW(v.constant(time), c.attrs(Bin.unflags(attr), min) , increaseDamageCapacity(cap * 1e8, ["self"]));
	},
	[248](turns, ...ids) { //几回合后才生效的技能
		return delayActiveTurns(turns,
			...ids.flatMap(id => this.parser(id))
		);
	},
	[249](turns, attr, row1, row2, row3, row4, row5, count) {
		const options = {
			attrs: Bin.unflags(attr),
		};
		if (count) {
			options.count = count;
		} else {
			options.positions = [row1, row2, row3, row4, row5].map(Bin.unflags);
		}
		return activeTurns(turns, 
			boardJammingStates('roulette', count ? 'random' : 'shape', options)
		);
	},
	[250](...awakenings) { //去除自身辅助，如果有参数则是赋予觉醒
		const skillEffects = [removeAssist()];
		if (awakenings.length) {
			skillEffects.unshift(impartAwakenings(null, null, SkillTarget.type1[0], awakenings));
		}
		return skillEffects;
	},
	[251](turns, min, max) { //产超暗暗珠
		return activeTurns(turns,
			boardJammingStates('deep-dark', 'random', { min, max })
		);
	},
	[253](turns) { //预测掉落主动技
		return activeTurns(turns, predictionFalling());
	},
	[254](turns) { //预测掉落队长技
		return predictionFalling();
	},
	//剩余多少个属性珠才能使用技能
	[255](attr, min, max) { return skillProviso(c.remainAttrOrbs(Bin.unflags(attr), min ?? 0, max ?? 0)); },
	
	[257]() {
		return [
		  setOrbState(Attributes.orbs, 'unlocked'),
		  boardChange([0,1,2,3,4,5]),
		  autoPath(5),
		];
	},
	//按位置改变伤害上限主动技1
	[258](turns, cap, target) { //改变伤害上限主动技
		const targetTypes = SkillTarget.type1;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, typeArr)
		);
	},
	[259](percent) { return breakingShield(v.xShield(percent)); }, //破白盾
	[260](skillStage, voiceId) { return skillPlayVoice(skillStage, voiceId); },
	[261](percent) { return gravity(v.xCHP(percent), 'single'); },
	[262](count) { return setOrbState(Attributes.orbs, 'nail', {count: v.constant(count)}); },
	[263](turns, cap, attr, type) { //按属性改变伤害上限主动技
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, void 0, Bin.unflags(attr), Bin.unflags(type))
		);
	},
	[264](mul) { return rateMultiply(v.percent(mul), 'plus_point'); },
	[265](mul) { return rateMultiply(v.percent(mul), 'part_break'); },
	//按位置改变伤害上限主动技2
	[266](turns, cap, target) {
		const targetTypes = SkillTarget.type2;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			increaseDamageCapacity(cap * 1e8, typeArr)
		);
	},
	//卡片自绑定
	[267](turns) {return activeTurns(turns, bindCard()); },
	//限制技能使用次数
	[268](turns) { return timesLimit(turns); },
	//按位置增伤主动技2
	[269](turns, target, mul) {
		const targetTypes = SkillTarget.type2;
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			slotPowerUp(p.mul({ atk: mul }), typeArr)
		);
	},
	//一回合内使用几次技能才有倍率的队长技。
	[270](times, atk, rcv) { { return powerUp(Bin.unflags(31), null, p.mul({ atk: atk || 100, rcv: rcv || 100 }), c.useSkill(times)); } },
	//同时发动觉醒时强化
	[271](awakeningsFlag, atk, reducePercent, combo, damage, rcv) {
		const awakeningsArr = Bin.unflags(awakeningsFlag).map(n => SkillTarget.enhancedAwakeningsId[n] || 0);
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		return powerUp(null, null, p.mul({ atk: atk || 100, rcv: rcv || 100}), c.awakeningActivated(awakeningsArr), v.percent(reducePercent), additional);
	},
	//破白盾-2
	[272](times) { return breakingShield(v.xShield(times * 100)); },
	//固定起手位置
	[273](turns) {return activeTurns(turns, fixedStartingPosition()); },
	//改变其他位置的队友颜色
	[274](turns, attr, target) {
		const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
		const typeArr = Bin.unflags(target).map(n => targetTypes[n]);
		return activeTurns(turns,
			changeAttr(attr, typeArr)
		);
	},
	//宝珠掉落率提高时才能使用技能
	[275](typeNum, flag) {
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
		// const type = Bin.unflags(typeNum).map(n => typeNames[n] || 0)[0]; //之前以为是位运算，后来发现又不是
		const type = typeNames[typeNum-1];
		let indexes = null;
		switch (type) {
			case "orb-drop-increase": {
				indexes = Bin.unflags(flag);
				break;
			}
			case "enhanced-orb-drop-increase": {
				indexes = null;
				break;
			}
			case "attr-powerup":
			case "type-powerup": {
				indexes = flag;
				break;
			}
		}
		return skillProviso(c.stateIsActive(type, indexes));
	},
	//部位的重力
	[276](percent) { return gravity(v.xCHP(percent), void 0, true); },
	//破坏宝珠
	[277](attr) { 
		const attrs = Bin.unflags(attr);
		return destroyOrb(attrs);
	},
	//超重力无效化
	[278](turns) {return activeTurns(turns, voidFieldBuff(["super-gravity"])); },
	//宝珠掉落率提高时才能使用技能
	[279](attr) {
		const attrs = Bin.unflags(attr);
		return skillProviso(c.enemyAttr(attrs));
	},
	//每次发动觉醒时强化
	[280](awakening, atk, reducePercent, combo, damage, rcv) {
		const awakeningsArr = [awakening];
		let additional = [combo ? addCombo(combo) : null, damage ? followAttackFixed(damage) : null].filter(Boolean);
		const eachTime = true;
		return powerUp(null, null, p.mul({ atk: atk || 100, rcv: rcv || 100}), c.awakeningActivated(awakeningsArr), v.percent(reducePercent), additional, eachTime);
	},
	//解析
	[282](percent) { return analyze(v.percent(percent)); },

	[1000](type, pos, ...ids) {
		const posType = (type=>{
			switch (type) {
				case 1: return "after-me";
				case 2: return "designated-position";
				case 3: return "before-me";
				default: return type;
			}
		})(type);
		return obstructOpponent(posType, Bin.unflags(pos), ids);
	},
};

function renderSkillEntry(skills)
{
	//按住Ctrl点击技能在控制台输出技能的对象
	function showParsedSkill(event) {
		if (event.ctrlKey) {
			//const skillId = parseInt(this.getAttribute("data-skill-id"));
			console.log(this.skill);
		}
	}
	const ul = document.createElement("ul");
	ul.className = "card-skill-list";
	skills.forEach(skill=>{
		const li = ul.appendChild(document.createElement("li"));
		li.className = skill.kind;
		li.appendChild(renderSkill(skill));
		//li.setAttribute("data-skill-id", skill.id);
		li.skill = skill;
		li.addEventListener("click", showParsedSkill);
	});

	//技能显示效果的合并，技能原始对象的合并在“function skillParser”里
	if (merge_skill)
	{
		const searchKind = [ //需要配合并的技能类型
			SkillKinds.SetOrbState,
			SkillKinds.BoardChange,
			SkillKinds.GenerateOrbs,
			SkillKinds.FixedOrbs,
			SkillKinds.BoardJammingStates,
		];
		let boardChange = skills.filter(skill=>{
			if (skill.kind == SkillKinds.ActiveTurns) {
				//如果是主动技，任一子技能属于这个范围就可以了
				return skill.skills.some(subSkill=>searchKind.includes(subSkill.kind))
			} else {
				return searchKind.includes(skill.kind);
			}
		}).flatMap(skill=>skill.kind == SkillKinds.ActiveTurns ?
			//主动技还需要再筛选一遍子技能
			skill.skills.filter(subSkill=>searchKind.includes(subSkill.kind)) :
			skill);
		if (boardChange.filter(skill=>skill.kind != SkillKinds.SetOrbState).length > 0)
		{
			const boardsBar = new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
			for (const skill of boardChange)
			{
				switch (skill.kind)
				{
					case SkillKinds.BoardChange: { //洗版
						const attrs = skill.attrs;
						boardsBar.boards.forEach(board=>board.randomFill(attrs));
						break;
					}
					case SkillKinds.GenerateOrbs: { //产生珠子
						const { orbs, exclude, count } = skill;
						boardsBar.boards.forEach(board=>board.generateOrbs(orbs, count, exclude));
						break;
					}
					case SkillKinds.FixedOrbs: { //固定位置产生珠子
						for (const generate of skill.generates)
						{
							const orbs = generate.orbs;
							if (generate.type == 'shape') {
								boardsBar.boards.forEach(board=>board.setShape(generate.positions, orbs));
							} else {
								if (generate.type == 'row')
									boardsBar.boards.forEach(board=>board.setRows(generate.positions, orbs));
								else
									boardsBar.boards.forEach(board=>board.setColumns(generate.positions, orbs));
							}
						}
						break;
					}
					case SkillKinds.BoardJammingStates: { //产生板面干扰
						const { state, posType, size, positions, count, time } = skill;
						if (state == 'roulette') { //轮盘位
							boardsBar.boards.forEach(board=>{
								if (posType == 'random')
									board.generateBlockStates('roulette', count);
								else
									board.setShape(positions, null, null, 'roulette');
							});
						}
						if (state == 'clouds') { //云
							boardsBar.boards.forEach(board=>{
								board.generateBlockStates('clouds', count, size, positions);
							});
						}
						if (state == 'immobility') { //封条
							const {colums, rows} = skill.positions;
							boardsBar.boards.forEach(board=>{
								board.setColumns(colums, null, null, 'immobility');
								board.setRows(rows, null, null, 'immobility');
							});
						}
						if (state == 'deep-dark') { //超暗暗
							const { min, max } = skill;
							boardsBar?.boards?.forEach(board=>{
								if (posType == 'random')
									board.generateBlockStates('deep-dark', min == max ? min : Math.randomInteger(max, min));
								else
									board.setShape(positions, null, null, 'deep-dark');
							});
						}
						break;
					}
					case SkillKinds.SetOrbState: { //修改珠子状态
						const { orbs, state } = skill;
						const count = skill?.arg?.count?.value ?? 99;
						boardsBar.boards.forEach(board=>{
							board.generateOrbs(orbs, count, null, state);
						});
						break;
					}
				}
			}
			const li = ul.appendChild(document.createElement("li"));
			boardsBar.boards.forEach(board=>board.refreshTable());
			li.appendChild(boardsBar.node);
			li.className = "merge-board";
		}
	}

	return ul;
}
//行列拆分成顺序和逆序的正常数字
function posSplit(pos, axis = 'row')
{
	const max = axis == 'row' ? 5 : 6;
	return [
		pos.filter(n=>n<=2).map(n=>n+1),
		pos.filter(n=>n>=3).reverse().map(n=>max-n),
	];
	//return {sequence: pos.filter(n=>n<=2).map(n=>n+1), reverse: pos.filter(n=>n>=3).reverse().map(n=>max-n)};
}

function createSkillIcon(iconType, className){
	const idoc = document.createElement("icon");
	idoc.className = `icon-skill${className ? ` ${className}` : ''}`;
	idoc.setAttribute("data-icon-type", iconType);
	return idoc;
}

function renderSkill(skill, option = {})
{
	function renderSkillTitle(skillId, { showTurns } = {}) {
		const skill = Skills[skillId];
		const div = document.createElement("summary");
		div.className = "evolved-skill-title";
		const name = div.appendChild(document.createElement("span"));
		name.className = "skill-name";
		name.textContent = skill.name;
		name.setAttribute("data-skillid", skillId);
		//name.onclick = fastShowSkill;
		if (showTurns) {
			const cd = div.appendChild(document.createElement("span"));
			cd.className = "skill-cd";
			cd.textContent = skill.initialCooldown - skill.maxLevel + 1;
			if (skill.maxLevel > 1) {
				const level = div.appendChild(document.createElement("span"));
				level.className = "skill-level-label";
				level.textContent = skill.maxLevel;
			}
		}
		const originalSkill = document.createElement("div");
		originalSkill.className = "skill-datail-original";
		originalSkill.append(parseSkillDescription(skill));

		return [div, originalSkill].nodeJoin();
	}

	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tsp = localTranslating.skill_parse;
	const createIcon = createSkillIcon;
	
	if (Array.isArray(skill))
	{
		frg.ap(skill.map(_skill=>renderSkill(_skill)));
		return frg;
	}
	switch (skill.kind) {
		case SkillKinds.Error: {
			let dict = { type: skill.kind };
			frg.ap(tsp.skill.error(dict));
			break;
		}
		case SkillKinds.Unknown: {
			console.log(skill);
			let dict = {
				type: skill.kind
			};
			frg.ap(tsp.skill.unknown(dict));
			break;
		}
		case SkillKinds.ActiveTurns: { //有回合的行动
			let { turns, skills } = skill;
			let dict = {
				turns: Array.isArray(turns) ? turns.join(tsp.word.range_hyphen().textContent) : turns,
				skills: skills?.map(renderSkill)?.nodeJoin(tsp.word.semicolon()),
			};
			frg.ap(tsp.skill.active_turns(dict));
			break;
		}
		case SkillKinds.DelayActiveTurns: { //有推迟回合的行动
			let { turns, skills } = skill;
			let dict = {
				turns: Array.isArray(turns) ? turns.join(tsp.word.range_hyphen().textContent) : turns,
				icon: createIcon(SkillKinds.Delay),
				skills: renderSkillEntry(skills),
			};
			
			frg.ap(tsp.skill.delay_active_turns(dict));
			//独立出来
			//frg.ap();
			break;
		}
		case SkillKinds.RandomSkills: { //随机技能
			let skills = skill.skills;
			const ul = document.createElement("ul");
			ul.className = "random-active-skill";
			skills.forEach((subSkill, idx)=>{
				const li = ul.appendChild(document.createElement("li"));
				const details = li.appendChild(document.createElement("details"));
				details.open = false; //随机类技能默认关闭
				details.className = "skill-details";
				details.appendChild(renderSkillTitle(skill.params[idx]));
				details.appendChild(renderSkillEntry(subSkill));
			});
			let dict = {
				skills: ul,
			};
			frg.ap(tsp.skill.random_skills(dict));
			break;
		}
		case SkillKinds.EvolvedSkills: { //技能进化
			let {skills, loop} = skill;
			const ul = document.createElement("ul");
			ul.className = "evolved-active-skill";
			skills.forEach((subSkill, idx)=>{
				const li = ul.appendChild(document.createElement("li"));
				const details = li.appendChild(document.createElement("details"));
				details.open = true; //进化类技能默认打开
				details.className = "skill-details";
				details.appendChild(renderSkillTitle(skill.params[idx], { showTurns:true }));
				details.appendChild(renderSkillEntry(subSkill));
			});
			let dict = {
				skills: ul,
			};
			frg.ap(tsp.skill.evolved_skills(dict));
			if (loop) frg.ap(tsp.skill.evolved_skills_loop({icon: createIcon("evolved-skill-loop")}));
			break;
		}
		case SkillKinds.Delay: { //威吓
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.delay(dict));
			break;
		}
		case SkillKinds.MassAttack: { //全体攻击
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.mass_attack(dict));
			break;
		}
		case SkillKinds.LeaderChange: { //切换队长
			let type = skill.type;
			let dict = {
				icon: createIcon(skill.kind),
				target: type ? tsp.target.team_last() : tsp.target.self(),
			};
			frg.ap(tsp.skill.leader_change(dict));
			break;
		}
		case SkillKinds.NoSkyfall: { //无天降
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.no_skyfall(dict));
			break;
		}
		case SkillKinds.SelfHarm: { //主动自残
			let value = skill.value;
			let dict = {
				icon: createIcon("heal", "hp-decr"),
				value: renderValue(value, {percent: true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.self_harm(dict));
			break;
		}
		case SkillKinds.Heal: { //主动回血buff
			let value = skill.value;
			let dict = {
				icon: createIcon("heal", "hp-incr"),
				//icon: createIcon("auto-heal"),
				value: renderValue(value, {unit: tsp.unit.point, percent: value.kind == SkillValueKind.xRCV ? false : true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.heal(dict));
			break;
		}
		case SkillKinds.AutoHealBuff: { //自动回血buff
			let dict = {
				icon: createIcon("auto-heal"),
				value: renderValue(skill.value, {unit: tsp.unit.point, percent: true}),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.auto_heal_buff(dict));
			break;
		}
		case SkillKinds.DefenseBreak: { //破防
			let dict = {
				icon: createIcon(skill.kind),
				value: renderValue(skill.value, {percent: true}),
			};
			frg.ap(tsp.skill.defense_break(dict));
			break;
		}
		case SkillKinds.Analyze: { //分析

			const dict = {
				icon: createIcon(skill.kind),
				defBreak: renderSkill(defBreak(skill.value)),
			};
			frg.ap(tsp.skill.analyze(dict));
			break;
		}
		case SkillKinds.Poison: { //毒
			let dict = {
				icon: createIcon(skill.kind),
				belong_to: tsp.target.self(),
				target: tsp.target.enemy_all(),
				stats: tsp.stats.hp(),
				value: renderValue(skill.value),
			};
			frg.ap(tsp.skill.poison(dict));
			break;
		}
		case SkillKinds.TimeExtend: { //时间变化buff
			let value = skill.value;
			let dict = {
				icon: createIcon("status-time", SkillValue.isLess(value) ? "time-decr" : "time-incr"),
				value: renderValue(value, { unit:tsp.unit.seconds, plusSign: value.kind != SkillValueKind.Percent, percent: SkillValue.isLess(value) }),
				
			};
			frg.ap(tsp.skill.time_extend(dict));
			break;
		}
		case SkillKinds.FollowAttack: { //队长技倍率追打
			let dict = {
				//icon: createIcon("follow_attack"),
				belong_to: tsp.target.self(),
				target: tsp.target.enemy(),
				value: renderValue(skill.value),
			};
			frg.ap(tsp.skill.follow_attack(dict));
			break;
		}
		case SkillKinds.FollowAttackFixed: { //队长技固伤追打
			let damage = skill.value;
			let dict = {
				damage: renderValue(damage, {unit: tsp.unit.point}),
				attr: renderAttrs('fixed'),
			};
			frg.ap(tsp.skill.follow_attack_fixed(dict));
			break;
		}
		case SkillKinds.AutoHeal: { //队长技自动回血
			let dict = {
				icon: createIcon(skill.kind),
				belong_to: tsp.target.self(),
				value: renderValue(skill.value),
				stats: tsp.stats.hp(),
			};
			frg.ap(tsp.skill.auto_heal(dict));
			break;
		}
		case SkillKinds.CTW: { //时间暂停
			let {time, cond, skill: subSkill} = skill;
			let dict = {
				icon: createIcon(skill.kind),
				time: renderValue(time, { unit: tsp.unit.seconds }),
			};
			if (cond) {
				let dict2 = {
					cond: renderCondition(cond),
					skill: renderSkill(subSkill)
				}
				dict.addition = tsp.skill.ctw_addition(dict2);
			}
			frg.ap(tsp.skill.ctw(dict));
			break;
		}
		case SkillKinds.Gravity: { //重力
			let {value, target} = skill;
			let dict = {
				icon: createIcon(skill.kind),
				target: target === 'all' ? tsp.target.enemy_all() : tsp.target.enemy_one(),
				value: renderValue(value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.PartGravity: { //部位重力
			let {value, target} = skill;
			let dict = {
				icon: createIcon("rate-mul-part_break"), //直接用重力的
				part: tsp.target.enemy_part(),
				target: target === 'all' ? tsp.target.enemy_all() : tsp.target.enemy_one(),
				value: renderValue(value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.Resolve: { //根性
			let prob = skill.prob;
			let dict = {
				icon: createIcon(skill.kind),
				stats: renderStat('chp'),
				min: renderValue(skill.min, { percent:true }),
				max: renderValue(skill.max, { percent:true }),
			};
			frg.ap(tsp.skill.resolve(dict));
			break;
		}
		
		case SkillKinds.DamageEnemy: { //大炮和固伤
			let attr = skill.attr, target = skill.target, damage = skill.damage, times = skill.times;
			if (attr == null) break; //没有属性时，编号为0的空技能
			let dict = {
				target: target === 'all' ? tsp.target.enemy_all() : target === 'single' ? tsp.target.enemy_one() : tsp.target.enemy_attr({attr: renderAttrs(target, {affix: true})}),
				damage: renderValue(damage, {unit: tsp.unit.point}),
				attr: renderAttrs(attr, {affix: (attr === 'self' || attr === 'fixed') ? false : true}),
			};
			if (times)
			{
				dict.times = tsp.skill.damage_enemy_times({
					times: renderValue(v.constant(times), {unit: tsp.unit.times})
				});
				dict.totalDamage = tsp.skill.damage_enemy_count({
					damage: renderValue(v.constant(damage.value * times), {unit: tsp.unit.point})
				});
			}
			frg.ap(tsp.skill.damage_enemy(dict));
			break;
		}
		case SkillKinds.Unbind: { //解封
			let normal = skill.normal, awakenings = skill.awakenings, matches = skill.matches;
			let effects = [];
			let enabledStats = [normal, awakenings, matches].filter(Boolean);
			if (merge_skill && enabledStats.length >= 2 && enabledStats.every((s,i,arr)=>s==arr[0]))
			{
				if (normal)
				{
					effects.push(tsp.skill.unbind_normal({icon: createIcon("unbind-normal")}));
				}
				if (awakenings)
				{
					effects.push(tsp.skill.unbind_awakenings({icon: createIcon("unbind-awakenings")}));
				}
				if (matches)
				{
					effects.push(tsp.skill.unbind_matches({icon: createIcon("unbind-matches")}));
				}
				let dict = {
					turns: enabledStats[0],
					stats: effects.nodeJoin(tsp.word.slight_pause()),
				}
				frg.ap(tsp.skill.unbind(dict));
			}
			else
			{
				if (normal)
				{
					let dict = {
						turns: normal,
						stats: tsp.skill.unbind_normal({icon: createIcon("unbind-normal")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				if (awakenings)
				{
					let dict = {
						turns: awakenings,
						stats: tsp.skill.unbind_awakenings({icon: createIcon("unbind-awakenings")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				if (matches)
				{
					let dict = {
						turns: matches,
						stats: tsp.skill.unbind_matches({icon: createIcon("unbind-matches")}),
					}
					effects.push(tsp.skill.unbind(dict));
				}
				frg.ap(effects.nodeJoin(tsp.word.comma()));
			}
			break;
		}
		case SkillKinds.BindSkill: {
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.bind_skill(dict));
			break;
		}
		case SkillKinds.BindCard: {
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.bind_card(dict));
			break;
		}
		case SkillKinds.BoardChange: { //洗版
			const attrs = skill.attrs;
			let dict = {
				orbs: renderOrbs(attrs),
			};
			frg.ap(tsp.skill.board_change(dict));
			if (!merge_skill)
			{
				const boardsBar = new BoardSet(new Board(attrs), new Board(attrs,7,6), new Board(attrs,5,4));
				boardsBar.boards.forEach(board=>{
					board.refreshTable();
				});
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.SkillBoost: { //溜
			const min = skill.min, max = skill.max;
			let dict = {
				icon: createIcon(skill.kind, SkillValue.isLess(min) ? "boost-decr" : "boost-incr"),
				turns_min: renderValue(min, { unit:tsp.unit.turns, plusSign:true }),
			};
			if (max.value !== min.value) {
				dict.turns_max = tsp.skill.skill_boost_range(
					{turns: renderValue(max, { unit:tsp.unit.turns, plusSign:true })}
				);
			}
			frg.ap(tsp.skill.skill_boost(dict));
			break;
		}
		case SkillKinds.AddCombo: { //+C
			const value = skill.value;
			let icon = createIcon(skill.kind);
			icon.setAttribute("data-add-combo", value);
			let dict = {
				icon: icon,
				value: value,
			};
			frg.ap(tsp.skill.add_combo(dict));
			break;
		}
		case SkillKinds.FixedTime: { //固定手指
			const value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				value: renderValue(value, { unit: tsp.unit.seconds }),
			};
			frg.ap(tsp.skill.fixed_time(dict));
			break;
		}
		case SkillKinds.MinMatchLength: { //最低匹配长度
			const value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				unmatchable: value - 1,
				matchable: value,
			};
			frg.ap(tsp.skill.min_match_length(dict));
			break;
		}
		case SkillKinds.DropRefresh: { //刷版
			let dict = {
				icon: createIcon(skill.kind),
			};
			frg.ap(tsp.skill.drop_refresh(dict));
			break;
		}
		case SkillKinds.Drum: { //太鼓达人音效
			frg.ap(tsp.skill.drum());
			break;
		}
		case SkillKinds.AutoPath: { //自动路径，小龙的萌新技能
			const {matchesNumber} = skill;
			frg.ap(tsp.skill.auto_path({
				icon: createIcon(skill.kind),
				matchesNumber: renderValue(matchesNumber),
			}));
			break;
		}
		case SkillKinds.Vampire: { //吸血
			let attr = skill.attr, damage = skill.damage, heal = skill.heal;
			let _dict = {
				target: tsp.target.enemy_one(),
				damage: renderValue(damage),
				attr: renderAttrs(attr, {affix: (attr === 'self' || attr === 'fixed') ? false : true}),
			};
			let dict = {
				icon: createIcon("heal", "hp-incr"),
				damage_enemy: tsp.skill.damage_enemy(_dict),
				heal: renderValue(heal, {percent: true}),
			};
			frg.ap(tsp.skill.vampire(dict));
			break;
		}
		case SkillKinds.CounterAttack: { //反击
			let attr = skill.attr, prob = skill.prob, value = skill.value;
			let dict = {
				icon: createIcon(skill.kind),
				target: tsp.target.enemy(),
				chance: prob.value < 1 ? tsp.value.prob({value: renderValue(prob, { percent:true })}) : null,
				value: renderValue(value),
				attr: renderAttrs(attr, {affix: true}),
			};
			frg.ap(tsp.skill.counter_attack(dict));
			break;
		}
		case SkillKinds.ChangeOrbs: { //珠子变换
			let changes = skill.changes;
			let subDocument = [];
			for (const change of changes)
			{
				let dict = {
					from: renderOrbs(change.from),
					to: renderOrbs(change.to),
				};
				subDocument.push(tsp.skill.change_orbs(dict));
			}
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			break;
		}
		case SkillKinds.GenerateOrbs: { //产生珠子
			let orbs = skill.orbs, exclude = skill.exclude, count = skill.count;
			let dict = {
				exclude: exclude?.length ? tsp.word.affix_exclude({cotent: renderOrbs(exclude)}) : void 0,
				orbs: renderOrbs(orbs),
				value: count,
			};
			frg.ap(tsp.skill.generate_orbs(dict));
			if (!merge_skill)
			{
				const boardsBar = new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
				boardsBar.boards.forEach(board=>{
					board.generateOrbs(orbs, count, exclude);
					board.refreshTable();
				});
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.FixedOrbs: { //固定位置产生珠子
			let generates = skill.generates;
			let slight_pause = tsp.word.slight_pause().textContent;
			let subDocument = [];
			const boardsBar = merge_skill ? null : new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));

			for (const generate of generates)
			{
				const orbs = generate.orbs;
				const dict = {
					orbs: renderOrbs(orbs),
				};
				if (generate.type == 'shape')
				{
					dict.position = tsp.position.shape();
					boardsBar?.boards?.forEach(board=>board.setShape(generate.positions, orbs));
				}else
				{
					let posFrgs = [];
					if (generate.positions.length == 0) continue;
					if (generate.type == 'row')
					{
						const [sequence, reverse] = posSplit(generate.positions, 'row');
						if (sequence.length) posFrgs.push(tsp.position.top({pos: sequence.join(slight_pause)}));
						if (reverse.length) posFrgs.push(tsp.position.bottom({pos: reverse.join(slight_pause)}));
						boardsBar?.boards?.forEach(board=>board.setRows(generate.positions, orbs));
					}else
					{
						const [sequence, reverse] = posSplit(generate.positions, 'colum');
						if (sequence.length) posFrgs.push(tsp.position.left({pos: sequence.join(slight_pause)}));
						if (reverse.length) posFrgs.push(tsp.position.right({pos: reverse.join(slight_pause)}));
						boardsBar?.boards?.forEach(board=>board.setColumns(generate.positions, orbs));
					}
					dict.position = posFrgs.nodeJoin(tsp.word.slight_pause());
				}
				subDocument.push(tsp.skill.fixed_orbs(dict));
			}
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			if (boardsBar) {
				boardsBar.boards.forEach(board=>board.refreshTable());
				frg.ap(boardsBar.node);
			}
			
			break;
		}
		case SkillKinds.OrbDropIncrease: { //增加天降
			let {prob, attrs, flag, value} = skill;
			prob = prob || v.percent(100);
			let dict = {
				prob: renderValue(prob, {percent: true}),
				orbs: renderOrbs(attrs, {className: "drop", affix: true}),
				flag: flag && tsp.orbs[flag]({icon: createIcon("orb-" + flag)}) || null,
			};
			if (value?.kind == SkillValueKind.xMaxHP) {
				dict.value = tsp.skill.orb_thorn({value: renderValue(value, {percent: true})})
			}
			frg.ap(flag ? tsp.skill.orb_drop_increase_flag(dict) : tsp.skill.orb_drop_increase(dict));
			break;
		}
		case SkillKinds.VoidEnemyBuff:
		case SkillKinds.VoidFieldBuff:
		{
			const { buffs } = skill;
			let subDocument = [];
			for (const buff of buffs)
			{
				let dict = {
					icon: createIcon(buff),
				};
				let skillFunc = tsp.skill[buff.replace(/\-/g,'_')];
				if (skillFunc) {
					subDocument.push(skillFunc(dict));
				} else {
					subDocument.push(document.createTextNode(buff));
				}
			}
			let dict = {
				buff: subDocument.nodeJoin(tsp.word.slight_pause()),
			};
			
			frg.ap(tsp.skill[skill.kind.replace(/\-/g,'_')](dict));
			break;
		}
		case SkillKinds.ChangeAttribute: {
			const { attr, targets } = skill;
			let dict = {
				attr: renderAttrs(attr, {affix: true}),
				target: document.createDocumentFragment(),
			};
			
			const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
			let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
			if (atkUpTarget.length) {
				dict.target.appendChild(createTeamFlags(atkUpTarget));
			}
			
			dict.target.appendChild(targets.map(target=>
				tsp?.target[target.replaceAll("-","_")]?.())
				.nodeJoin(tsp.word.slight_pause()));

			frg.ap(tsp.skill.change_attribute(dict));
			break;
		}
		case SkillKinds.SetOrbState: {
			const {orbs, state, arg} = skill;
			let dict = {
				orbs: renderOrbs(orbs, {
					//有的时候附加效果限制个数，这个附加图标加到文字里面的图标上面的去不好看也不准确，应该只加到面板里。
					//className: state,
					affix: true
				}),
				icon: createIcon('orb-' + state),
			};
			switch (state)
			{
				case "enhanced":{
					dict.value = renderValue(arg.enhance, {percent: true});
					frg.ap(tsp.skill.set_orb_state_enhanced(dict));
					break;
				}
				case "locked":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_locked(dict));
					break;
				}
				case "unlocked":{
					frg.ap(tsp.skill.set_orb_state_unlocked(dict));
					break;
				}
				case "bound":{
					frg.ap(tsp.skill.set_orb_state_bound(dict));
					break;
				}
				case "combo-drop":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_combo_drop(dict));
					break;
				}
				case "nail":{
					if (arg.count.value < 42)
						dict.value = renderValue(arg.count, {unit: tsp.unit.orbs});
					frg.ap(tsp.skill.set_orb_state_nail(dict));
					break;
				}
			}
			break;
		}
		case SkillKinds.RateMultiply: {
			let rate = skill.rate, value = skill.value;
			let dict = {
				rate: tsp.skill["rate_multiply_" + rate]({icon: createIcon(skill.kind + "-" + rate)}),
				value: renderValue(value),
			};
			frg.ap(tsp.skill.rate_multiply(dict));
			break;
		}
		case SkillKinds.ReduceDamage: {
			let attrs = skill.attrs, percent = skill.percent, condition = skill.condition, prob = skill.prob;
			let dict = {
				icon: createIcon(skill.kind),
				attrs: renderAttrs(attrs, {affix: true}),
				value: renderValue(percent, {percent: true}),
				condition: condition ? renderCondition(condition) : null,
				chance: prob.value < 1 ? tsp.value.prob({value: renderValue(prob, { percent:true })}) : null,
			};
			frg.ap(tsp.skill.reduce_damage(dict));
			break;
		}
		case SkillKinds.PowerUp: {
			let { attrs, types, targets, condition, value, reduceDamage, additional, eachTime } = skill;
			let dict = {
				icon: createIcon(skill.kind),
			};
			let comma = tsp.word.comma;
			if (condition) dict.condition = renderCondition(condition);
			
			let targetDict = {}, attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				targetDict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(targetDict.attrs);
			}
			if (types?.length)
			{
				targetDict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(targetDict.types);
			}
			if (targets != undefined)
			{
				targetDict.target = document.createDocumentFragment();

				//增加队员伤害的技能的目标，删选出来，其他的目标则不显示
				const targetTypes = [...SkillTarget.type1,...SkillTarget.type2];
				let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
				if (atkUpTarget.length) {
					targetDict.target.appendChild(createTeamFlags(atkUpTarget));
				}
				
				targetDict.target.appendChild(targets.map(target=>
					tsp?.target[target.replaceAll("-","_")]?.())
					.nodeJoin(tsp.word.slight_pause()));

				attrs_types.push(targetDict.target);
			}
			if (attrs_types.length)
			{
				targetDict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
				dict.targets = tsp.skill.power_up_targets(targetDict);
			}

			if (value){
				/*if (attrs?.includes(5) && value.kind == SkillPowerUpKind.Multiplier)
				{ //如果属性有5，则是回复力
					let _value = Object.assign({}, value);
					_value.rcv = value.atk;
					_value.atk = value.rcv;
					value = _value;
				}*/
				if (value.kind == SkillPowerUpKind.Multiplier && Boolean(value.hp || value.atk || value.rcv) == false)
				{
					//不显示 value
				}else
				{
					dict.value = renderPowerUp(value);
				}
			}
			if (reduceDamage && reduceDamage.value > 0) {
				let reduceDamageNode = tsp.skill.reduce_damage({
					value: renderValue(reduceDamage, {percent: true}),
					icon: createIcon("reduce-damage"),
				});
				dict.reduceDamage = [comma(), reduceDamageNode].nodeJoin();
			}
			if (additional?.length) {
				let additionalNode = additional.filter(Boolean).map(subSkill=>renderSkill(subSkill, option));
				dict.additional = [comma(), additionalNode.nodeJoin(comma())].nodeJoin();
			}
			if (eachTime) {
				dict.each_time = tsp.word.each_time();
			}
			frg.ap(tsp.skill.power_up(dict));
			break;
		}
		case SkillKinds.SlotPowerUp: { //增加卡槽伤害倍率
			const {value, targets} = skill;
			
			let dict = {
				icon: createIcon(skill.kind, value.atk > 1 ? "atk-incr" : "atk-decr"),
				targets: document.createDocumentFragment(),
				value: renderPowerUp(value),
			};
			
			dict.targets.append(createTeamFlags(targets));
			dict.targets.append(targets.map(target=>
				tsp?.target[target.replaceAll("-","_")]?.())
				.nodeJoin(tsp.word.slight_pause()));

			frg.ap(tsp.skill.slot_power_up(dict));
			break;
		}
		case SkillKinds.Henshin: { //变身
			let ids = skill.ids, random = skill.random;
			let doms = ids.map(id=>{
				let dom = cardN(id);
				//dom.monDom.onclick = changeToIdInSkillDetail;
				return dom;	})
			let dict = {
				cards: doms.nodeJoin(),
			}
			frg.ap(random ? 
				tsp.skill.random_henshin(dict) :
				tsp.skill.henshin(dict)
				);
			break;
		}
		case SkillKinds.VoidPoison: { //毒无效
			let dict = {
				poison: renderOrbs([7,8], {affix: true})
			}
			frg.ap(tsp.skill.void_poison(dict));
			break;
		}
		case SkillKinds.SkillProviso: { //条件限制才能用技能
			let cond = skill.cond;
			let dict = {
				condition: renderCondition(cond)
			}
			frg.ap(tsp.skill.skill_proviso(dict));
			break;
		}
		case SkillKinds.ImpartAwakenings: { //赋予队员觉醒
			let {attrs, types, target, awakenings} = skill;
			let dict = {
				awakenings: renderAwakenings(awakenings, {affix: true}),
			}
			
			let attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				dict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(dict.attrs);
			}
			if (types?.length)
			{
				dict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(dict.types);
			}
			if (target)
			{
				dict.target = tsp?.target[target.replaceAll("-","_")]?.();
				attrs_types.push(dict.target);
			}
			if (attrs_types.length)
			{
				dict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
			}

			frg.ap(tsp.skill.impart_awoken(dict));
			break;
		}
		case SkillKinds.ObstructOpponent: { //条件限制才能用技能
			let type = skill.type, pos = skill.pos, enemy_skills = skill.enemy_skills;
			let slight_pause = tsp.word.slight_pause().textContent;
			let dict = {
				skills: enemy_skills.join(slight_pause)
			}
			let targetDict = { positions: pos?.map(p=>p+1).join(slight_pause)}
			switch (type)
			{
				case "after-me": {
					dict.target = tsp.skill.obstruct_opponent_after_me(targetDict);
					break;
				}
				case "designated-position": {
					dict.target = tsp.skill.obstruct_opponent_designated_position(targetDict);
					break;
				}
				case "before-me": {
					dict.target = tsp.skill.obstruct_opponent_before_me(targetDict);
					break;
				}
				default: {
					dict.target = tsp.cond.unknown();
					break;
				}
			}
			frg.ap(tsp.skill.obstruct_opponent(dict));
			break;
		}
		case SkillKinds.IncreaseDamageCapacity: { //增加伤害上限
			const {cap, targets, attrs, types} = skill;
			let dict = {
				icon: createIcon(skill.kind, cap > 0x7FFFFFFF ? "cap-incr" : "cap-decr"),
				targets: document.createDocumentFragment(),
				cap: cap.bigNumberToString(),
			};

			let targetDict = {}, attrs_types = [];
			if (attrs?.length && !isEqual(attrs, Attributes.all))
			{
				targetDict.attrs = renderAttrs(attrs || [], {affix: attrs?.filter(attr=> attr !== 5)?.length});
				attrs_types.push(targetDict.attrs);
			}
			if (types?.length)
			{
				targetDict.types = renderTypes(types || [], {affix: true});
				attrs_types.push(targetDict.types);
			}
			if (targets != undefined)
			{
				targetDict.target = document.createDocumentFragment();

				//增加队员伤害的技能的目标，删选出来，其他的目标则不显示
				// const targetTypes = SkillTarget.type1;
				// let atkUpTarget = targets.filter(n=>targetTypes.includes(n));
				// if (atkUpTarget.length) {
					targetDict.target.appendChild(createTeamFlags(targets));
				// }
				
				targetDict.target.appendChild(targets.map(target=>
					tsp?.target[target.replaceAll("-","_")]?.())
					.nodeJoin(tsp.word.slight_pause()));

				attrs_types.push(targetDict.target);
			}
			if (attrs_types.length)
			{
				targetDict.attrs_types = attrs_types.nodeJoin(tsp.word.slight_pause());
				dict.targets = tsp.skill.power_up_targets(targetDict);
			}

			frg.ap(tsp.skill.increase_damage_cap(dict));
			break;
		}
		case SkillKinds.BoardJammingStates: { //板面产生干扰状态
			const { state, posType, positions, count, time, attrs } = skill;
			const boardsBar = merge_skill ? null : new BoardSet(new Board(), new Board(null,7,6), new Board(null,5,4));
			const slight_pause = tsp.word.slight_pause().textContent;

			let dict = {
				icon: createIcon('board-' + state),
				state: tsp.board[state.replaceAll("-","_")](),
				position: posType == 'random' ? tsp.position.random() : tsp.position.shape(),
			};
			if (state == 'roulette') { //轮盘位
				const commentContent = [];
				time && commentContent.push(tsp.board.roulette_time({duration: renderValue(v.constant(time), {unit: tsp.unit.seconds})}));
				Array.isArray(attrs) && attrs.length && commentContent.push(tsp.board.roulette_attrs({orbs: renderOrbs(attrs)}));
				dict.comment = tsp.word.comment({content: commentContent.nodeJoin(tsp.word.slight_pause())});
				
				dict.count = renderValue(v.constant(count || positions.flat().length), {unit: tsp.unit.orbs});
				boardsBar?.boards?.forEach(board=>{
					if (posType == 'random')
						board.generateBlockStates('roulette', count);
					else
						board.setShape(positions, null, null, 'roulette');
				});
			}
			if (state == 'clouds') { //云
				const [width, height] = skill.size;
				dict.size = tsp.value.size({ width, height});
				boardsBar?.boards?.forEach(board=>{
					board.generateBlockStates('clouds', count, [width, height], positions);
				});
			}
			if (state == 'immobility') { //封条
				const {colums, rows} = skill.positions;

				let posFrgs = [];
				const [sequenceCols, reverseCols] = posSplit(colums, 'colum');
				if (sequenceCols.length) posFrgs.push(tsp.position.left({pos: sequenceCols.join(slight_pause)}));
				if (reverseCols.length) posFrgs.push(tsp.position.right({pos: reverseCols.join(slight_pause)}));

				const [sequenceRows, reverseRows] = posSplit(rows, 'row');
				if (sequenceRows.length) posFrgs.push(tsp.position.top({pos: sequenceRows.join(slight_pause)}));
				if (reverseRows.length) posFrgs.push(tsp.position.bottom({pos: reverseRows.join(slight_pause)}));
				
				boardsBar?.boards?.forEach(board=>{
					board.setColumns(colums, null, null, 'immobility');
					board.setRows(rows, null, null, 'immobility');
				});

				dict.position = posFrgs.nodeJoin(tsp.word.slight_pause());
			}
			if (state == 'deep-dark') { //超暗暗
				const { min, max } = skill;

				dict.count = renderValue(v.constant(min), {unit: tsp.unit.orbs});
				if (min !== max) {
					dict.count.append(tsp.word.range_hyphen(),renderValue(v.constant(max), {unit: tsp.unit.orbs}));
				}
				boardsBar?.boards?.forEach(board=>{
					if (posType == 'random')
						board.generateBlockStates('deep-dark', min == max ? min : Math.randomInteger(max, min));
					else
						board.setShape(positions, null, null, 'deep-dark');
				});
			}
			frg.ap(tsp.skill.board_jamming_state(dict));

			if (boardsBar) {
				boardsBar.boards.forEach(board=>board.refreshTable());
				frg.ap(boardsBar.node);
			}
			break;
		}
		case SkillKinds.BoardSizeChange: { //改变板面大小
			const { width, height } = skill;

			let dict = {
				icon: createIcon(skill.kind),
				size: tsp.value.size({ width, height}),
			};
			frg.ap(tsp.skill.board_size_change(dict));
			break;
		}
		case SkillKinds.RemoveAssist: { //去除武器
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.remove_assist(dict));
			break;
		}
		case SkillKinds.PredictionFalling: { //预知掉落
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.prediction_falling(dict));
			break;
		}
		case SkillKinds.BreakingShield: { //破白盾
			let dict = {
				icon: createIcon(skill.kind),
				target: tsp.target.enemy(),
				value: renderValue(skill.value, { percent:true }),
			};
			frg.ap(tsp.skill.gravity(dict));
			break;
		}
		case SkillKinds.PlayVoice: { //播放技能语音
			const { stage, id } = skill;
			const icon = document.createElement("icon");
			icon.className = "awoken-icon";
			icon.setAttribute("data-awoken-icon", 63);
			icon.dataset.voiceId = id || Cards[editBox.mid].voiceId;
			icon.onclick = playOwnVoiceId;

			let dict = {
				stage,
				id,
				icon,
			};
			frg.ap(tsp.skill.play_voice(dict));
			break;
		}
		case SkillKinds.TimesLimit: { //使用次数限制
			const { turns } = skill;
			let dict = {
				turns
			};
			frg.ap(tsp.skill.times_limit(dict));
			break;
		}
		case SkillKinds.FixedStartingPosition: { //固定起手位置
			let dict = {
				icon: createIcon(skill.kind)
			};
			frg.ap(tsp.skill.fixed_starting_position(dict));
			break;
		}
		case SkillKinds.DestroyOrb: { //固定起手位置
			const { attrs } = skill;
			let dict = {
				orbs: renderOrbs(attrs, { affix: true}),
			};
			frg.ap(tsp.skill.destroy_orb(dict));
			break;
		}
		
		default: {
			console.log("未处理的技能类型",skill.kind, skill);
			frg.ap(skill.kind);
		}
	}
	return frg;
};
function playOwnVoiceId(){
	playVoiceById(parseInt(this.dataset.voiceId,10));
}

function renderStat(stat, option) {
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tspt = localTranslating.skill_parse.stats;
	if (tspt[stat])
		frg.ap(tspt[stat](option));
	else
	{
		console.log("未知状态类型",stat);
		frg.ap(tspt.unknown({ type: stat }));
	}
	return frg;
}

function renderAttrs(attrs, option = {}) {
	if (!Array.isArray(attrs))
		attrs = [attrs ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg;
	if (isEqual(attrs, Attributes.all))
	{
		contentFrg = tsp.attrs.all();
	}
	else
	{
		contentFrg = attrs.map(attr => {
			const icon = document.createElement("icon");
			icon.className = "attr-icon";
			icon.setAttribute("data-attr-icon",attr);
			return tsp.attrs?.[attr]({icon: icon});
		})
		.nodeJoin(tsp.word.slight_pause());
	}
	if (option.affix)
		contentFrg = tsp.word.affix_attr({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderOrbs(attrs, option = {}) {
	if (!Array.isArray(attrs))
		attrs = [attrs ?? 0];
	else
		attrs = [...attrs];

	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;

	const tsp = localTranslating.skill_parse;
	let contentFrg;
	
	if (attrs.every(a=>Number.isInteger(a))) {
		let attrBin = new Bin(attrs);
		if ((attrBin.int & 0b1111111111) == 0b1111111111) { //十种珠子
			frg.ap(tsp.orbs.all());
			attrs.length = 0; //之前是引用，这里会导致数组被清空的错误
		} else if ((attrBin.int & 0b11111) == 0b11111) { //基础5色
			frg.ap(renderOrbs('_5color'));
			attrBin = new Bin(attrBin.int & 0b1111100000);
			attrs = [...attrBin];
			if (attrs.length > 0) { //如果5色以上还有剩的，就增加一个加号
				frg.ap(' + ');
			}
		}
	}
	contentFrg = attrs.map(attr => {
		const icon = document.createElement("icon");
		icon.className = "orb";
		if (option.className) icon.className += " " + option.className;
		icon.setAttribute("data-orb-icon",attr);
		let dict = {
			icon: icon,
		}
		return tsp.orbs?.[attr](dict);
	})
	.nodeJoin(tsp.word.slight_pause());
	frg.ap(contentFrg);
		
	if (option.affix)
		contentFrg = tsp.word.affix_orb({cotent: contentFrg});
	if (option.any && attrs.length >= 2)
		contentFrg = tsp.orbs.any({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderTypes(types, option = {}) {
	if (!Array.isArray(types))
		types = [types ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg = types.map(type => {
		const icon = document.createElement("icon");
		icon.className = "type-icon";
		icon.setAttribute("data-type-icon",type);
		return tsp.types?.[type]({icon: icon});
	})
	.nodeJoin(tsp.word.slight_pause());
	if (option.affix)
		contentFrg = tsp.word.affix_type({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

function renderAwakenings(awakenings, option = {}) {
	if (!Array.isArray(awakenings))
		awakenings = [awakenings ?? 0];
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	
	const tsp = localTranslating.skill_parse;
	let contentFrg = awakenings.map(awoken => {
		const icon = document.createElement("icon");
		icon.className = "awoken-icon";
		icon.setAttribute("data-awoken-icon",awoken);
		return tsp.awokens?.[awoken]({icon: icon});
	})
	.nodeJoin(tsp.word.slight_pause());
	if (option.affix)
		contentFrg = tsp.word.affix_awakening({cotent: contentFrg});
	frg.ap(contentFrg);
	return frg;
}

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

function renderPowerUp(powerUp) {
	const frg = document.createDocumentFragment();
	const tsp = localTranslating.skill_parse;
	function renderStats(hp, atk, rcv, option = {}) {
		const mul = option.mul ?? true;
		option.percent = !mul;
		const frg = document.createDocumentFragment();
		const operator = mul ? ' ' : '+';
		let list = [['maxhp', hp], ['atk', atk], ['rcv', rcv]];
		//去除不改变的值
		list = list.filter(([, value]) => value !== (mul ? 1 : 0));
		//&&!(name === 'hp' && value === 0));

		if (list.length === 0) return frg;

		if (list.every(([, value]) => value === list[0][1])) {
			let value = list[0][1];
			//三个值一样
			frg.ap(list.map(([name]) => renderStat(name,name=='maxhp'?{icon:createSkillIcon("maxhp-locked")}:null)).nodeJoin(tsp.word.slight_pause()));
			frg.ap(operator);
			frg.ap(renderValue(v.percent(value * 100), option));
		} else {
			//三个值不一样
			let subDocument = list.map(([name, value]) => {
				let _frg = document.createDocumentFragment();
				_frg.ap(renderStat(name));
				_frg.ap(operator);
				_frg.ap(renderValue(v.percent(value * 100), option));
				return _frg;
			});
			frg.ap(subDocument.nodeJoin(tsp.word.comma()));
		}
		return frg;
	}

	switch (powerUp.kind) {
		case SkillPowerUpKind.Multiplier: {
			let hp = powerUp.hp, atk = powerUp.atk, rcv = powerUp.rcv;
			frg.ap(renderStats(hp, atk, rcv));
			break;
		}
		case SkillPowerUpKind.ScaleAttributes: {
			let attrs = powerUp.attrs, min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			
			let dict = {
				orbs: renderOrbs(attrs, {affix: true}),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_attributes_bonus(_dict));
			}
			frg.ap(tsp.power.scale_attributes(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleCombos: {
			let min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			let dict = {
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_combos_bonus(_dict));
			}
			frg.ap(tsp.power.scale_combos(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleMatchAttrs: {
			let { matches, min, max, baseAtk, baseRcv, bonusAtk, bonusRcv } = powerUp;
			let dict = {
				matches: matches.map(orbs=>renderOrbs(orbs)).nodeJoin(tsp.word.slight_pause()),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_match_attrs_bonus(_dict));
			}
			frg.ap(tsp.power.scale_match_attrs(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleMatchLength: {
			let attrs = powerUp.attrs, min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv, matchAll = powerUp.matchAll;
			
			let dict = {
				orbs: renderOrbs(attrs, {affix: true}),
				min: min,
				stats: renderStats(1, baseAtk, baseRcv),
				in_once: matchAll && attrs.length>1 && tsp.word.in_once() || null,
			}
			if (max !== min)
			{
				let _dict = {
					max: max,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_match_length_bonus(_dict));
			}
			frg.ap(tsp.power.scale_match_length(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleCross: {
			let crosses = powerUp.crosses;
			
			/*if (crosses.length >= 2 && crosses.every(cross => cross.atk === crosses[0].atk)) {
				//所有值一样
				let cross = crosses[0];
				let dict = {
					orbs: renderOrbs(crosses.map(cross => cross.attr), {affix: true, any: true}),
					stats: renderStats(1, cross.atk, cross.rcv),
				}
				frg.ap(cross.single ? tsp.power.scale_cross_single(dict) : tsp.power.scale_cross(dict));
			} else {*/
				let subDocument = crosses.map(cross=>{
					let dict = {
						orbs: renderOrbs(cross.attr, {affix: true, any: true}),
						stats: renderStats(1, cross.atk, cross.rcv),
						each_time: cross.single ? null : tsp.word.each_time(),
					}
					return tsp.power.scale_cross(dict);
				});
				frg.ap(subDocument.nodeJoin(tsp.word.comma()));
			//}
			break;
		}
		case SkillPowerUpKind.ScaleRemainOrbs: {
			let min = powerUp.min, max = powerUp.max, baseAtk = powerUp.baseAtk, baseRcv = powerUp.baseRcv, bonusAtk = powerUp.bonusAtk, bonusRcv = powerUp.bonusRcv;
			
			let dict = {
				max: max,
				stats: renderStats(1, baseAtk, baseRcv),
			}
			if (max !== min)
			{
				let _dict = {
					min: min,
					bonus: renderStats(0, bonusAtk, bonusRcv, {mul: false}),
					stats_max: renderStats(1, baseAtk + bonusAtk * (max-min), baseRcv + bonusRcv * (max-min)),
				}
				dict.bonus = frg.ap(tsp.power.scale_remain_orbs_bonus(_dict));
			}
			frg.ap(tsp.power.scale_remain_orbs(dict));
			
			break;
		}
		case SkillPowerUpKind.ScaleStateKind: {
			let awakenings = powerUp.awakenings, attrs = powerUp.attrs, types = powerUp.types, value = powerUp.value;
			let dict = {
				stats: renderStats(value.hp, value.atk, value.rcv, {mul: false, percent: true}),
				awakenings: awakenings?.length && renderAwakenings(awakenings, {affix: true}) || null,
				attrs: attrs?.length && renderAttrs(attrs, {affix: true}) || null,
				types: types?.length && renderTypes(types, {affix: true}) || null,
			}
			frg.ap(tsp.power.scale_state_kind(dict));
			break;
		}
		default:
			frg.ap(tsp.power.unknown({type: powerUp.kind}));
	}
	return frg;
}

function renderValue(_value, option = {}) {
	const frg = document.createDocumentFragment();
	if (typeof localTranslating == "undefined") return frg;
	const tsp = localTranslating.skill_parse
	const tspv = tsp.value;
	const od = option.decimalDigits, os = option.plusSign;
	let dict;
	switch (_value.kind) {
		case SkillValueKind.Percent: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_percent(dict) :
				tspv.mul_times(dict)
			);
			break;
		}
		case SkillValueKind.Constant: {
			dict = {
				value: _value.value.keepCounts(od,os),
				unit: option.unit ? option.unit() : void 0,
			};
			frg.ap(tspv.const(dict));
			break;
		}
		case SkillValueKind.ConstantTo: {
			dict = {
				value: _value.value.keepCounts(od,os)
			};
			frg.ap(tspv.const_to(dict));
			break;
		}
		case SkillValueKind.xMaxHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('maxhp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('hp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xCHP: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('chp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xShield: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('shield'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xATK: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('atk'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xRCV: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('rcv'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamHP: {
			let value = _value.value;
			dict = {
				value: option.percent ? (value * 100).keepCounts(od,os) : value.keepCounts(od,os),
				stats: renderStat('teamhp'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamRCV: {
			dict = {
				value: option.percent ? (_value.value * 100).keepCounts(od,os) : _value.value.keepCounts(od,os),
				stats: renderStat('teamrcv'),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.xTeamATK: {
			let attrs = _value.attrs, value = _value.value;
			dict = {
				value: option.percent ? (value * 100).keepCounts(od,os) : value.keepCounts(od,os),
				stats: renderStat('teamatk', {attrs: renderAttrs(attrs, {affix: true})}),
			};
			frg.ap(
				option.percent ? 
				tspv.mul_of_percent(dict) :
				tspv.mul_of_times(dict)
			);
			break;
		}
		case SkillValueKind.HPScale: {
			let min = _value.min, max = _value.max;
			dict = {
				min: tspv.mul_of_times({value: min.keepCounts(od,os), stats:renderStat('atk')}),
				max: tspv.mul_of_times({value: max.keepCounts(od,os), stats:renderStat('atk')}),
				hp: renderStat('hp'),
			};
			
			frg.ap(tspv.hp_scale(dict));
			break;
		}
		case SkillValueKind.RandomATK: {
			let min = _value.min, max = _value.max;
			dict = {
				min: min.keepCounts(od,os),
				atk: renderStat('atk'),
			};
			if (max != min)
			{
				dict.max = tsp.word.range_hyphen().ap(max.keepCounts(od,os));
			}
			
			frg.ap(tspv.random_atk(dict));
			break;
		}
		case SkillValueKind.xAwakenings: {
			let value = _value.value, awakenings = _value.awakenings;
			let dict = {
				value: renderValue(value,{percent : true}),
				awakenings: renderAwakenings(awakenings, {affix: true}),
			}
			frg.ap(tsp.value.x_awakenings(dict));
			break;
		}
		default: {
			console.log("未知数值类型",_value.kind, _value);
			frg.ap(tspv.unknown({ type: _value.kind }));
		}
	}
	return frg;
  }

const specialSearchFunctions = (function() {
	'use strict';
	//返回卡片的队长技能
	function getCardLeaderSkill(card, skillTypes, searchRandom = true)
	{
		return getActuallySkills(Skills[card.leaderSkillId], skillTypes, searchRandom)?.[0];
	}
	//返回卡片的技能
	function getCardActiveSkill(card, skillTypes, searchRandom = true)
	{
		return getActuallySkills(Skills[card.activeSkillId], skillTypes, searchRandom)?.[0];
	}
	//获取血倍率
	function getHPScale(ls)
	{
		const sk = ls.params;
		let scale = 1;
		switch (ls.type)
		{
			case 23: case 30: case 62: case 77: case 63: case 65:
			case 29: case 114: case 45: case 111: case 46: case 48: case 67:
				scale = sk[sk.length-1]/100;
				break;
			case 73: case 76:
			case 121: case 129: case 163: case 177: case 186:
			case 155:
				scale = sk[2]/100;
				break;
			case 106: case 107: case 108:
				scale = sk[0]/100;
				break;
			case 125:
				scale = sk[5]/100;
				break;
			case 136:
			case 137:
				scale = (sk[1]/100 || 1) * (sk[5]/100 || 1);
				break;
			case 158:
				scale = sk[4]/100;
				break;
			case 175:
			case 178: case 185:
				scale = sk[3]/100;
				break;
			case 203: case 217:
				scale = sk[1]/100;
				break;
			case 245:
				scale = sk[3]/100;
				break;
			case 138: //调用其他队长技
				scale = sk.reduce((pmul,skid)=>pmul * getHPScale(Skills[skid]),1);
				break;
			default:
		}
		return scale || 1;
	}
	//获取盾减伤比例
	function getReduceScale(ls, allAttr = false, noHPneed = false)
	{
		const sk = ls.params;
		let scale = 0;
		switch (ls.type)
		{
			case 16: //无条件盾
				scale = sk[0]/100;
				break;
			case 17: //单属性盾
				scale = allAttr ? 0 : sk[1]/100;
				break;
			case 36: //2个属性盾
				scale = allAttr ? 0 : sk[2]/100;
				break;
			case 38: //血线下 + 几率
			case 43: //血线上 + 几率
				scale = (noHPneed || allAttr) ? 0 : sk[2]/100;
				break;
			case 129: //无条件盾，属性个数不固定
			case 163: //无条件盾，属性个数不固定
				scale = (allAttr && (sk[5] & 31) != 31) ? 0 : sk[6]/100;
				break;
			case 178: //无条件盾，属性个数不固定
				scale = (allAttr && (sk[6] & 31) != 31) ? 0 : sk[7]/100;
				break;
			case 130: //血线下 + 属性个数不固定
			case 131: //血线上 + 属性个数不固定
				scale = (noHPneed || allAttr && (sk[5] & 31) != 31) ? 0 : sk[6]/100;
				break;
			case 151: //十字心触发
			case 169: //C触发
			case 198: //回血触发
			case 271: //激活觉醒触发
				scale = sk[2]/100;
				break;
			case 170: //多色触发
			case 182: //长串触发
			case 193: //L触发
				scale = sk[3]/100;
				break;
			case 171: //多串触发
				scale = sk[6]/100;
				break;
			case 183: //又是个有两段血线的队长技
				scale = noHPneed ? 0 : sk[4]/100;
				break;
			case 210: //十字触发
				scale = sk[1]/100;
				break;
			case 235: { //可多次触发
				scale = (sk[4] || 0) / 100;
				break;
			}

			case 138: //调用其他队长技
				scale = sk.reduce((pmul,skid)=> 1 - (1-pmul) * (1-getReduceScale(Skills[skid], allAttr, noHPneed)),0);
				break;
			default:
		}
		return scale || 0;
	}
	//获取无条件盾减伤比例
	function getReduceScale_unconditional(ls)
	{
		const sk = ls.params;
		let scale = 0;
		switch (ls.type)
		{
			case 16: //无条件盾
			{
				scale = sk[0]/100;
				break;
			}
			case 129: //无条件盾，属性个数不固定
			case 163: //无条件盾，属性个数不固定
			{
				scale = (sk[5] & 31) != 31 ? 0 : sk[6]/100;
				break;
			}
			case 178: //无条件盾，属性个数不固定
			{
				scale = (sk[6] & 31) != 31 ? 0 : sk[7]/100;
				break;
			}
			case 138: //调用其他队长技
				scale = sk.reduce((pmul,skid)=> 1 - (1-pmul) * (1-getReduceScale_unconditional(Skills[skid])),0);
				break;
			default:
		}
		return scale || 0;
	}
	
	function getCannonAttr(skill)
	{
		const sk = skill.params;
		switch(skill.type)
		{
			case 0:
			case 1:
			case 37:
			case 58:
			case 59:
			case 84:
			case 85:
			case 86:
			case 87:
			case 115:
				return sk[0];
			case 110:
			case 143:
				return sk[1];
			case 42:
				return sk[1];
			case 144:
				return sk[3] ?? 0;
			default:
				return -1;
		}
	}
	
	function sortByParams(a,b,searchTypeArray,...pidxs)
	{
		const a_s = getCardLeaderSkill(a, searchTypeArray) || getCardActiveSkill(a, searchTypeArray),
			  b_s = getCardLeaderSkill(b, searchTypeArray) || getCardActiveSkill(b, searchTypeArray);
		if (pidxs.length==0) pidxs.push(0);
		let newPos = 0;
		//按所有顺序依次比较大小，凡是有一次比出来就使用，否则继续比较下一个大小
		for (let pidx of pidxs) {
			newPos = a_s.params[pidx] - b_s.params[pidx];
			if (newPos !== 0) break;
		}
		return newPos;
	}
	
	function sortByHPScal(a,b)
	{
		const a_s = Skills[a.leaderSkillId], b_s = Skills[b.leaderSkillId];
		return getHPScale(a_s) - getHPScale(b_s);
	}
	function HPScal_Addition(card)
	{
		const skill = Skills[card.leaderSkillId];
		return `💟${Math.round(getHPScale(skill) * 100)}%`;
	}
	function sortByReduceScale(a,b)
	{
		const a_s = Skills[a.leaderSkillId], b_s = Skills[b.leaderSkillId];
		return getReduceScale(a_s) - getReduceScale(b_s);
	}
	function ReduceScale_Addition(card)
	{
		const skill = Skills[card.leaderSkillId];
		return `🛡️${Math.round(getReduceScale(skill) * 100)}%`;
	}
	function directParseSkills(skillDataArr) {
		return skillDataArr.flatMap(skill=>skillObjectParsers?.[skill.type]?.apply({ parser: skillParser }, skill.params))
	}
	function voidsAbsorption_Turns(card) {
		const outObj = {
			"attr-absorb": 0,
			"combo-absorb": 0,
			"damage-absorb": 0,
			"damage-void": 0,
			"super-gravity": 0,
		};
		const searchTypeArray = [
			173,
			191,
			278
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		skills.reduce((pre,skill)=>{
			if (skill.type === 173) {
				if(skill.params[1]) pre["attr-absorb"] ||= skill.params[0];
				if(skill.params[2]) pre["combo-absorb"] ||= skill.params[0];
				if(skill.params[3]) pre["damage-absorb"] ||= skill.params[0];
			} else if (skill.type === 191) {
				pre["damage-void"] ||= skill.params[0];
			} else if (skill.type === 278) {
				pre["super-gravity"] ||= skill.params[0];
			}
			return pre
		}, outObj);
		return outObj;
	}
	function voidsAbsorption_Addition(card)
	{
		const turnsObj = voidsAbsorption_Turns(card);
		const namesArr = ["attr-absorb", "combo-absorb", "damage-absorb", "damage-void","super-gravity"];
		const turns = namesArr.map(name=>turnsObj[name]);
		const turnsSet = new Set(turns.filter(Boolean));
		const turnsCount = turnsSet.size;

		const fragment = document.createDocumentFragment();
		for (let i = 0; i < namesArr.length; i++) {
			if (turns[i] > 0) {
				fragment.append(createSkillIcon(namesArr[i]));
				if (turnsCount > 1)
					fragment.append(`-${turns[i]>=9999 ? '全' : `${turns[i]}T` }`);
			}
		}
		if (turnsCount === 1) {
			const turn = Array.from(turnsSet)[0];
			fragment.append(`-${turn>=9999 ? '全' : `${turn}T` }`);
		}
		return fragment;
	}
	function unbind_Turns(card)
	{
		const outObj = {
			normal: 0,
			awakenings: 0,
			matches: 0
		};
		const searchTypeArray = [
			117, 179,
			196
		];
		const skills = getCardActiveSkills(card, searchTypeArray);
		const parsedSkills = directParseSkills(skills);
		
		parsedSkills.reduce((pre,cur)=>{
			pre.normal ||= cur.normal;
			pre.awakenings ||= cur.awakenings;
			pre.matches ||= cur.matches;
			return pre
		}, outObj);
		return outObj;
	}
	function unbind_Addition(card)
	{
		const turnsObj = unbind_Turns(card);
		const namesArr = ["normal", "awakenings", "matches"];
		const turns = namesArr.map(name=>turnsObj[name]);
		const turnsSet = new Set(turns.filter(Boolean));
		const turnsCount = turnsSet.size;

		const fragment = document.createDocumentFragment();
		for (let i = 0; i < namesArr.length; i++) {
			if (turns[i] > 0) {
				fragment.append(createSkillIcon(`unbind-${namesArr[i]}`));
				if (turnsCount > 1)
					fragment.append(`-${turns[i]>=9999 ? '全' : `${turns[i]}T` }`);
			}
		}
		if (turnsCount === 1) {
			const turn = Array.from(turnsSet)[0];
			fragment.append(`-${turn>=9999 ? '全' : `${turn}T` }`);
		}
		return fragment;
	}
	function boardChange_ColorTypes(skill)
	{
		if (!skill) return [];
		const sk = skill.params;
		const colors = sk.slice(0, sk.includes(-1)?sk.indexOf(-1):undefined);
		return colors;
	}
	function boardChange_Addition(card)
	{
		const searchTypeArray = [71];
		const skill = getCardActiveSkill(card, searchTypeArray);
		const colors = boardChange_ColorTypes(skill);
		return createOrbsList(colors);
	}
	function orbsChangeParse(skill)
	{
		function changes(from, to)
		{
			return {from:from,to:to};
		}
		let outArr = [];
		if (!skill) return outArr;
		const sk = skill.params;
		switch (skill.type)
		{
			case 9:{
				outArr.push(changes([sk[0] || 0], [sk[1] || 0]));
				break;
			}
			case 20:{
				if (sk.length >= 3 && sk[1] == (sk[3] || 0))
				{
					outArr.push(changes([sk[0] || 0, sk[2] || 0], [sk[1] || 0]));
				}
				else
				{
					outArr.push(changes([sk[0] || 0], [sk[1] || 0]));
					outArr.push(changes([sk[2] || 0], [sk[3] || 0]));
				}
				break;
			}
			case 154:{
				outArr.push(changes(Bin.unflags(sk[0] || 1), Bin.unflags(sk[1] || 1)));
				break;
			}
		}
		return outArr;
	}
	function changeOrbs_Addition(card)
	{
		const searchTypeArray = [9,20,154];
		const skills = getCardActiveSkills(card, searchTypeArray);
		let parsedSkills = skills.flatMap(skill=>orbsChangeParse(skill));
		const fragment = document.createDocumentFragment();
		parsedSkills.forEach(p=>{
			fragment.appendChild(createOrbsList(p.from));
			fragment.appendChild(document.createTextNode(`→`));
			fragment.appendChild(createOrbsList(p.to));
		});
		return fragment;
	}
	function generateOrbsParse(card)
	{
		const outArr = [];
		const searchTypeArray = [141, 208];
		const skills = getCardActiveSkills(card, searchTypeArray);
		if (!skills.length) return outArr;
		for (const skill of skills)
		{
			const sk = skill.params;
			if (skill.type == 141)
			{
				outArr.push({
					count: sk[0],
					to: sk[1] || 1,
					exclude: sk[2],
				});
			}else
			{
				outArr.push({
					count: sk[0],
					to: sk[1] || 1,
					exclude: sk[2],
				});
				outArr.push({
					count: sk[3],
					to: sk[4] || 1,
					exclude: sk[5],
				});
			}
		}
		return outArr;
	}
	function generateOrbs_Addition(card)
	{
		const gens = generateOrbsParse(card);
		if (!gens.length) return;
		const fragment = document.createDocumentFragment();
		for (const gen of gens)
		{
			fragment.appendChild(createOrbsList(Bin.unflags(gen.to)));
			fragment.appendChild(document.createTextNode(`×${gen.count}`));
		}
		return fragment;
	}
	function lock_Addition(card)
	{
		const searchTypeArray = [152, 190, 262];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		if (!skills.length) return;
		return skills.map(skill=>{
			const sk = skill.params;
			const fragment = document.createDocumentFragment();
			switch (skill.type) {
				case 152:{
					fragment.append(
						createSkillIcon('orb-locked')
					);
					if (sk[1] < 42) fragment.append(`×${sk[1]}`);
					fragment.append(
						createOrbsList(Bin.unflags(sk[0] || 1))
					);
					break;
				}
				case 190:{
					fragment.append(
						createSkillIcon('orb-combo-drop')
					);
					if (sk[1] < 42) fragment.append(`×${sk[1]}`);
					fragment.append(
						createOrbsList(Bin.unflags(sk[0] || 1))
					);
					break;
				}
				case 262:{
					fragment.append(
						createSkillIcon('orb-nail')
					);
					if (sk[0] < 42) fragment.append(`×${sk[0]}`);
					fragment.append(
						createOrbsList(Attributes.orbs)
					);
					break;
				}
			}
			return fragment;
		}).nodeJoin('');
	}
	function dropLock_Addition(card)
	{
		const searchTypeArray = [205];
		const skill = getCardActiveSkill(card, searchTypeArray, 1);
		if (!skill) return;
		const sk = skill.params;
		const fragment = document.createDocumentFragment();
		fragment.appendChild(createOrbsList(Bin.unflags(sk[0] != -1 ? sk[0] : 0b1111111111), 'locked'));
		fragment.appendChild(document.createTextNode(`×${sk[1]}T`));
		return fragment;
	}
	function dropOrb_Addition(card)
	{
		const searchTypeArray = [126];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = Bin.unflags(sk[0]);
		
		const fragment = document.createDocumentFragment();
		fragment.appendChild(createOrbsList(colors, 'drop'));
		fragment.appendChild(document.createTextNode(`${sk[3]}%×${sk[1]}${sk[1] != sk[2]?`~${sk[2]}`:""}T`));
		return fragment;
	}
	function generateColumnOrbs_Addition(card)
	{
		const searchTypeArray = [127];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = [];
		for (let ai=0;ai<sk.length;ai+=2)
		{
			colors.push(Bin.unflags(sk[ai+1]));
		}
		const fragment = document.createDocumentFragment();
		fragment.appendChild(document.createTextNode(`竖`));
		fragment.appendChild(createOrbsList(colors.flat()));
		return fragment;
	}
	function generateRowOrbs_Addition(card)
	{
		const searchTypeArray = [128];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const colors = [];
		for (let ai=0;ai<sk.length;ai+=2)
		{
			colors.push(Bin.unflags(sk[ai+1]));
		}
		
		const fragment = document.createDocumentFragment();
		fragment.appendChild(document.createTextNode(`横`));
		fragment.appendChild(createOrbsList(colors.flat()));
		return fragment;
	}
	function numericalATK_Addition(card)
	{
		const searchTypeArray = [0,1,2,35,37,42,58,59,84,85,86,87,110,115,143,144];
		const typeArray_Rate = [0,2,35,37,58,59,84,85,115];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		//const sk = skill.params;

		const colors = [getCannonAttr(skill)];
		
		const fragment = document.createDocumentFragment();
		fragment.append(`射`);
		fragment.append(createOrbsList(colors));

		if (typeArray_Rate.includes(skill.type)) {
			function getNumber(skill){
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
			fragment.append(`×${(getNumber(skill)/100).bigNumberToString()}倍`);
			
		}
		return fragment;
	}
	function memberATK_Addition(card)
	{
		const searchTypeArray = [230, 269];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		return skills.map(skill=>{
			const sk = skill.params;
			const fragment = document.createDocumentFragment();
			fragment.appendChild(createTeamFlags(sk[1], skill.type == 269 ? 2 : 1));
			fragment.append(`${sk[2] / 100}倍×${sk[0]}T`);
			return fragment;
		}).nodeJoin(document.createElement("br"));
	}
	function getIncreaseDamageCap(skill)
	{
		let cap = 0;
		switch (skill.type) {
			case 241:case 258:case 263:case 266:
				cap = skill.params[1];
				break;
			case 246:
				cap = skill.params[2];
				break;
			case 247:
				cap = skill.params[3];
				break;
		}
		return cap;
	}
	function memberCap_Addition(card)
	{
		const searchTypeArray = [241, 246, 247, 258, 263, 266];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		return skills.map(skill=>{
			const sk = skill.params;
			let cap = getIncreaseDamageCap(skill);
			const fragment = document.createDocumentFragment();
			switch (skill.type) {
				case 258:
				case 266: {
					fragment.appendChild(createTeamFlags(sk[2], skill.type == 266 ? 2 : 1));
					break;
				}
				case 241:
				case 246:
				case 247: {
					fragment.appendChild(createTeamFlags(1));
					break;
				}
				case 263: {
					const attrs = Bin.unflags(sk[2]);
					if (attrs?.length)
					{
						fragment.appendChild(createOrbsList(attrs));
					}
					const types = Bin.unflags(sk[3]);
					if (types?.length)
					{
						fragment.appendChild(createTypesList(types));
					}
					break;
				}
			}
			//fragment.append(createSkillIcon(SkillKinds.IncreaseDamageCapacity, cap > 21 ? "cap-incr" : "cap-decr"));
			switch (skill.type) {
				case 258:
				case 241:
				case 263:
				case 266: {
					fragment.append(`${(cap*1e8).bigNumberToString()}×${sk[0]}T`);
					break;
				}
				case 246: {
					fragment.append(`${(cap*1e8).bigNumberToString()}←${sk[1]}C in ${sk[0]}S`);
					break;
				}
				case 247: {
					fragment.append(`${(cap*1e8).bigNumberToString()}←${sk[2]} of `, createOrbsList(Bin.unflags(sk[1])), ` in ${sk[0]}S`);
					break;
				}
			}
			return fragment;
		}).nodeJoin(document.createElement("br"));
	}
	function dixedDamage_Addition(card)
	{
		const searchTypeArray = [55, 188, 56];
		const skills = getCardActiveSkills(card, searchTypeArray, true);
		if (!skills.length) return;
		const skill = skills[0];
		const sk = skill.params;
		return `${skill.type==56?"全体":"单体"}${sk[0].bigNumberToString()}点${skills.length>1?`×${skills.length}`:''}`;
	}
	function gravity_Addition(card)
	{
		const searchTypeArray = [6, 161, 261];
		const skill = getCardActiveSkill(card, searchTypeArray);
		if (!skill) return;
		const sk = skill.params;

		const denominator = skill.type === 161 ? 
			localTranslating.skill_parse.stats.maxhp() : 
			localTranslating.skill_parse.stats.chp();
		const percent = `${sk[0]}%`;
		const target = skill.type === 261 ? 
			localTranslating.skill_parse.target.enemy_one() : 
			localTranslating.skill_parse.target.enemy_all();
		
		const fragment = document.createDocumentFragment();
		//fragment.append(target, denominator, percent);
		return [target, denominator, percent].nodeJoin(" ");
	}
	
	function healImmediately_Rate(card)
	{
		const searchTypeArray = [7, //自身回复力
			8, //固定点数
			35,115, //吸血
			117
		];
		const skills = getCardActiveSkills(card, searchTypeArray);

		const outObj = {
			vampire: 0,
			selfRcv: 0,
			const: 0,
			scale: 0,
		};
		if (!skills.length) return outObj;
		skills.forEach(skill=>{
			const sk = skill.params;
			if (skill.type == 7)
			{
				outObj.selfRcv += sk[0];
			}
			else if(skill.type == 8)
			{
				outObj.const += sk[0];
			}
			else if(skill.type == 35)
			{
				outObj.vampire += sk[1];
			}
			else if(skill.type == 115)
			{
				outObj.vampire += sk[2];
			}
			else if(skill.type == 117)
			{
				outObj.selfRcv += sk[1] || 0;
				outObj.const += sk[2] || 0;
				outObj.scale += sk[3] || 0;
			}
		});
		return outObj;
	}
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
				{name:"Creates Seal",otLangName:{chs:"生成封条 debuff",cht:"生成封条 debuff"},
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
	return {
		name:"All Functions",
		functions: functions
	};
})();

  function treeLabel(node) {
    return node?.name || node?.otLangName?.en || "Unnamed";
  }

  function normalizeNode(node, path = [], index = { value: 0 }, seen = new Set()) {
    const label = treeLabel(node);
    const nextPath = label === "All Functions" ? path : path.concat(label);
    if (node.group || Array.isArray(node.functions)) {
      return {
        type: "group",
        label,
        path: nextPath,
        children: (node.functions || []).map((child) => normalizeNode(child, nextPath, index, seen)),
      };
    }
    // Keys are the leaf's full path; two leaves with the same label under the
    // same parent would otherwise share a key and shadow each other in leafByKey
    // (the tree still renders both, but selecting either applies only one). Keep
    // unique keys stable and only disambiguate genuine collisions.
    let key = nextPath.join(" > ") || "leaf-" + index.value;
    if (seen.has(key)) { let n = 2; while (seen.has(key + " #" + n)) n++; key += " #" + n; }
    seen.add(key);
    index.value += 1;
    return {
      type: "leaf",
      key,
      label,
      path: nextPath,
      filter: (cards) => node.function(cards),
      raw: node,
    };
  }

  // In any group that mixes loose leaves with named subgroups, bundle the loose
  // leaves into an "Other" subgroup (appended last) so every filter chip sits
  // under a labelled subgroup. Recurses through the whole tree. The moved leaves
  // keep their original key/path, so leafByKey lookups and saved presets are
  // unaffected — only the display nesting changes. The root's "No Filter"
  // sentinel stays put (dict.js hides it there as the clear-all control).
  function groupLooseLeaves(node) {
    if (node.type !== "group") return node;
    const isRoot = node.label === "All Functions";
    const children = node.children.map(groupLooseLeaves);
    const loose = children.filter((c) => c.type === "leaf" && !(isRoot && /no filter/i.test(c.label)));
    const hasSubgroups = children.some((c) => c.type === "group");
    if (!loose.length || !hasSubgroups) return { ...node, children };
    const kept = children.filter((c) => !loose.includes(c));
    const other = { type: "group", label: "Other", path: node.path.concat("Other"), children: loose };
    return { ...node, children: [...kept, other] };
  }

  function flattenLeaves(node, out = []) {
    if (node.type === "leaf") out.push(node);
    else node.children.forEach((child) => flattenLeaves(child, out));
    return out;
  }

  function intersectById(left, right) {
    const rightIds = new Set(right.map((card) => card.id));
    return left.filter((card) => rightIds.has(card.id));
  }

  function unionById(groups) {
    const seen = new Set();
    const out = [];
    for (const group of groups) {
      for (const card of group) {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          out.push(card);
        }
      }
    }
    return out;
  }

  function createSpecialSearchEngine({ skills, cards }) {
    installHelpers();
    Skills = skills || [];
    Cards = cards || [];
    const root = groupLooseLeaves(normalizeNode(specialSearchFunctions));
    const leaves = flattenLeaves(root);
    const leafByKey = new Map(leaves.map((leaf) => [leaf.key, leaf]));
    const leafByPath = new Map(leaves.map((leaf) => [leaf.path.join(" > "), leaf]));

    function filterCardsByLeaves(baseCards, selectedKeys, mode = "and") {
      const selected = selectedKeys.map((key) => leafByKey.get(key)).filter(Boolean);
      if (!selected.length) return baseCards;
      const groups = selected.map((leaf) => leaf.filter(baseCards));
      return mode === "or" ? unionById(groups) : groups.reduce((current, group) => intersectById(current, group), baseCards);
    }

    function findLeafByPath(path) {
      return leafByPath.get(Array.isArray(path) ? path.join(" > ") : path);
    }

    return { tree: root, leaves, leafByKey, filterCardsByLeaves, findLeafByPath, globalsStubbed: engineGlobalsStubbed.slice() };
  }

  return {
    createSpecialSearchEngine,
    get specialSearchFunctions() { return specialSearchFunctions; },
    get SkillKinds() { return SkillKinds; },
    get SkillPowerUpKind() { return SkillPowerUpKind; },
    get Attributes() { return Attributes; },
    get Bin() { return Bin; },
    get globalsStubbed() { return engineGlobalsStubbed.slice(); },
  };
});
