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

