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
