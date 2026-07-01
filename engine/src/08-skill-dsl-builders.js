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

