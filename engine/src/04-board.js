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

