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
