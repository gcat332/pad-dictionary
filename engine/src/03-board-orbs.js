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
