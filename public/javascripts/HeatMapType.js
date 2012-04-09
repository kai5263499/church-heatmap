function HeatMapType(cfg) {
	this.tileSize = {width:256,height:256};
	this.usesockets = false;
	this.useworkers = false;
	this.tilepath   = 'tile/';
	this.initialload=true;	
	
	this.minZoom = 9;

	if(cfg.size) this.tileSize = cfg.size;
	if(cfg.usesockets) this.usesockets = cfg.usesockets;
	if(cfg.browser) this.browser = cfg.browser;
	if(cfg.tilepath) this.tilepath = cfg.tilepath;
	
	this.heatmaputils = new HeatMapUtils();
	
	if(this.usesockets) {
		this.socket = new io.Socket(null, {port: 80, rememberTransport: true});
		this.socket.connect();
		this.socket.on('message', this.refreshImageData, this);
	}
}

HeatMapType.prototype.refreshImageData = function(obj) {
	//console.log(obj,"refreshImageData");
	
	if(typeof obj == "string") obj = JSON.parse(obj);
	
	ele = document.getElementById(obj.x+'-'+obj.y+'-'+obj.z);
	
	if(!ele) return;
	
	if(obj.getimage) {
		ele.src = 'tile/'+obj.x+'-'+obj.y+'-'+obj.z+".png";
		return;
	} else if (obj.items) {
		var canvas = document.createElement('canvas');
		
		canvas.width = GoogleMapUtils.TILE_SIZE;
		canvas.height = GoogleMapUtils.TILE_SIZE;
		var ctx = canvas.getContext('2d');
		
		for(i in obj.items) {
			var point = new GoogleMapUtils.getOffsetPixelCoords(obj.items[i].loc.lat,obj.items[i].loc.lon,obj.z,obj.x,obj.y);
			HeatMapUtils.addHeatPointData(ctx, point);
		}
		
		obj.tiledata = canvas.toDataURL("image/png");

		canvas, ctx = null;
	}
	
	if(obj.tiledata == null) {
		ele.numpoints = obj.numpoints;
		ele.src = HeatMapUtils.EMPTYPNG;
	} else if(ele.numpoints > obj.numpoints) {
		 return;
	} else {
		ele.numpoints = obj.numpoints;
		ele.src = obj.tiledata;
	}
};

HeatMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
	var ele = ownerDocument.createElement("img");
	
	ele.setAttribute("id",coord.x+'-'+coord.y+'-'+zoom);
	
	if($.browser.mozilla) {
		ele.src = this.tilepath+coord.x+'-'+coord.y+'-'+zoom+'.png';
	} else {
		if(this.usesockets) {
			this.socket.send({"coord":coord,"zoom":zoom, "browser":this.browser});
		} 
		ele.src = HeatMapUtils.EMPTYPNG;
	}

	ele.style.width = this.tileSize.width;
	ele.style.height = this.tileSize.height;
	
	return ele;
};

HeatMapType.prototype.releaseTile = function(node) {
	//console.log(node,"releaseTile");
};
