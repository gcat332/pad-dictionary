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

